import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Cargo from "../models/Cargo.js";
import DailyClose from "../models/DailyClose.js";
import Expense from "../models/Expense.js";
import Rate from "../models/Rate.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import StartingBalance from "../models/StartingBalance.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Visa from "../models/Visa.js";
import Client from "../models/Client.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import PaymentMethod from "../models/PaymentMethod.js";
import { attachClientRelationships } from "./clientIdentity.js";
import { assertCargoRouteEditable, normalizeCargoStatus, prepareNewCargoLifecycle } from "./cargoWorkflow.js";
import { readAgencyData, visibleData } from "./agencyData.js";
import { assertActiveBranch, assertBranchAccess, findBranchByOffice } from "./branches.js";
import { assertBranchCurrency, assertBranchPaymentMethod, assertUniqueDailyClose, createCustomerPayment, customerFinanceSummary } from "./finance.js";
import { randomToken } from "../utils/tokens.js";

const syncServicePayable = async (collection, service) => {
  if (mongoose.connection.readyState === 0) return;
  const kind = collection === "tickets" ? "ticket" : "visa";
  const payableId = `payable_${kind}_${service.id}`;
  const billed = service.type === "Sale" ? Math.max(0, Number(service.cost) || 0) : 0;
  if (!billed) {
    const hasPayments = await SupplierPayment.exists({ supplierBillId: payableId, status: { $ne: "void" } });
    if (!hasPayments) await Supplier.deleteOne({ id: payableId });
    return;
  }
  await Supplier.findOneAndUpdate(
    { id: payableId },
    {
      $set: {
        date: collection === "tickets" ? service.saleDate || "" : service.appDate || "",
        branchId: service.branchId || null,
        reference: service.ref || "",
        supplier: collection === "tickets" ? "Ticket provider" : "Visa provider",
        description: collection === "tickets"
          ? `Ticket cost for ${service.passenger || service.ref}: ${service.route || ""}${service.airlinePnr ? ` to ${service.airlinePnr}` : ""}`
          : `Visa processing cost for ${service.applicant || service.ref}: ${service.destination || ""}`,
        currency: service.currency,
        billed,
        dueDate: collection === "tickets" ? service.travelDate || "" : "",
        notes: `Automatically created from ${kind} ${service.ref}. Update the provider name when known.`,
      },
      $setOnInsert: { paid: 0 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
};

const syncPaidServicePayment = async (collection, service, user) => {
  if (mongoose.connection.readyState === 0 || !service.paid) return;
  const transactionType = collection === "tickets" ? "ticket" : collection === "visas" ? "visa" : collection === "cargo" ? "cargo" : "";
  if (!transactionType) return;
  const summary = await customerFinanceSummary(transactionType, service);
  if (summary.balance <= 0) return;
  const paymentDate = service.paymentDate
    || (transactionType === "ticket" ? service.saleDate : transactionType === "visa" ? service.appDate : service.dateIn)
    || new Date().toISOString().slice(0, 10);
  await createCustomerPayment({
    transactionType,
    transactionId: service.id,
    amount: summary.balance,
    paymentDate,
    paymentMethod: service.paymentMethod,
    paymentMethodId: service.paymentMethodId,
    notes: service.type === "Refund" ? "Refund paid to client from service form." : "Payment recorded from service form.",
    user,
  });
};

export const ENTITY_MODELS = {
  tickets: Ticket,
  cargo: Cargo,
  visas: Visa,
  expenses: Expense,
  clients: Client,
  suppliers: Supplier,
  closes: DailyClose,
  rates: Rate,
  startingBalances: StartingBalance,
  paymentMethods: PaymentMethod,
  branchPaymentMethods: BranchPaymentMethod,
};

const ENTITY_NAMES = new Set(Object.keys(ENTITY_MODELS));

const assertEntityName = (collection) => {
  if (!ENTITY_NAMES.has(collection)) {
    const error = new Error("Unknown agency entity.");
    error.status = 404;
    throw error;
  }
};

const assertCanWriteEntity = async (collection, record, user) => {
  if (user.role === "consultant") {
    const error = new Error("Consultants have read-only access.");
    error.status = 403;
    throw error;
  }

  if (["suppliers", "rates", "startingBalances", "paymentMethods", "branchPaymentMethods"].includes(collection) && user.role !== "owner") {
    const error = new Error("Owner access is required for this record.");
    error.status = 403;
    throw error;
  }

  if (user.role === "owner") {
    if (["tickets", "visas", "expenses", "closes", "startingBalances", "branchPaymentMethods"].includes(collection) && record.branchId) await assertActiveBranch(record.branchId);
    if (collection === "rates") {
      await assertActiveBranch(record.originBranchId);
      await assertActiveBranch(record.destinationBranchId);
    }
    if (collection === "cargo") {
      if (record.originBranchId) await assertActiveBranch(record.originBranchId);
      if (record.destinationBranchId) await assertActiveBranch(record.destinationBranchId);
      if (record.originBranchId && record.destinationBranchId && String(record.originBranchId) === String(record.destinationBranchId)) {
        const error = new Error("Cargo origin and destination branches must be different.");
        error.status = 400;
        throw error;
      }
    }
    return;
  }

  if (user.role !== "operator" || !user.assignedBranchId) {
    const error = new Error("This account cannot update agency data.");
    error.status = 403;
    throw error;
  }

  if (["tickets", "visas", "expenses", "closes", "clients"].includes(collection)) await assertBranchAccess(user, record.branchId);
  if (collection === "cargo") {
    await assertBranchAccess(user, record.originBranchId);
    await assertActiveBranch(record.destinationBranchId);
    if (String(record.originBranchId) === String(record.destinationBranchId)) {
      const error = new Error("Cargo origin and destination branches must be different.");
      error.status = 400;
      throw error;
    }
  }
};

const withServerFields = async (collection, record, user, existing) => {
  const next = { ...record };
  if (!next.id) next.id = `${collection}_${Date.now().toString(36)}_${randomToken(4)}`;
  if (["tickets", "visas", "expenses", "closes", "startingBalances"].includes(collection) && !next.branchId) {
    const branch = await findBranchByOffice(next.office);
    if (branch) next.branchId = branch._id.toString();
  }
  if (collection === "clients" && !next.homeBranchId) {
    const branch = await findBranchByOffice(next.homeOffice);
    if (branch) next.homeBranchId = branch._id.toString();
  }
  if (["cargo", "rates"].includes(collection)) {
    if (!next.originBranchId) {
      const branch = await findBranchByOffice(next.origin);
      if (branch) next.originBranchId = branch._id.toString();
    }
    if (!next.destinationBranchId) {
      const branch = await findBranchByOffice(next.destination);
      if (branch) next.destinationBranchId = branch._id.toString();
    }
  }
  if (collection === "cargo" && !next.paidByBranchId) {
    const branch = await findBranchByOffice(next.paidByOffice || next.origin);
    if (branch) next.paidByBranchId = branch._id.toString();
  }
  if (user.role === "operator" && user.assignedBranchId) {
    const branchId = user.assignedBranchId.toString();
    if (["tickets", "visas", "expenses", "closes", "clients"].includes(collection)) next.branchId = branchId;
    if (collection === "cargo") {
      next.originBranchId = branchId;
      if (!next.paidByBranchId) next.paidByBranchId = branchId;
    }
  }
  if (existing && user.role !== "owner" && ["tickets", "cargo", "visas"].includes(collection)) {
    next.cost = existing.cost || 0;
  }
  if (["tickets", "visas"].includes(collection) && next.type === "Refund") next.cost = 0;
  if (collection === "cargo") {
    if (!existing) next.status = "received";
    else {
      next.status = normalizeCargoStatus(existing.status);
      if (String(next.originBranchId || "") !== String(existing.originBranchId || "") || String(next.destinationBranchId || "") !== String(existing.destinationBranchId || "")) {
        assertCargoRouteEditable(existing, user);
      }
    }
  }
  if (["tickets", "visas", "expenses", "closes", "startingBalances"].includes(collection)) next.office = next.office || next.homeOffice;
  return next;
};

const validateFinanceConfig = async (collection, record, existing) => {
  if (["tickets", "visas", "expenses", "closes", "startingBalances"].includes(collection)) {
    const branchId = record.branchId;
    const currency = record.currency;
    if (branchId && currency) await assertBranchCurrency(branchId, currency);
    const paymentMethod = record.paymentMethod || record.method;
    const paymentMethodId = record.paymentMethodId;
    if (branchId && currency && (paymentMethod || paymentMethodId)) {
      const { method } = await assertBranchPaymentMethod({ branchId, currency, paymentMethod, paymentMethodId });
      if (collection === "startingBalances") record.paymentMethodId = method._id;
      else record.paymentMethodId = method._id;
    }
    if (collection === "closes") await assertUniqueDailyClose(record, existing?.id);
  }
  if (collection === "cargo") {
    if (record.originBranchId && record.currency) await assertBranchCurrency(record.originBranchId, record.currency);
    if (record.paidByBranchId && record.currency && (record.paymentMethod || record.paymentMethodId)) {
      const { method } = await assertBranchPaymentMethod({ branchId: record.paidByBranchId, currency: record.currency, paymentMethod: record.paymentMethod, paymentMethodId: record.paymentMethodId });
      record.paymentMethodId = method._id;
    }
  }
};

const createActivity = async (action, user) => {
  if (!action?.entity || !action?.detail) return null;
  return Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: user.id?.toString?.() || user._id?.toString?.() || "",
    userName: user.name || "",
    action: String(action.entity),
    entity: String(action.entity),
    detail: String(action.detail),
  });
};

export const writeEntity = async ({ collection, id, record, user, action }) => {
  assertEntityName(collection);
  if (!record || typeof record !== "object") {
    const error = new Error("Entity payload is required.");
    error.status = 400;
    throw error;
  }

  const Model = ENTITY_MODELS[collection];
  const lookupId = id || record.id;
  const existing = lookupId ? await Model.findOne({ id: lookupId }) : null;
  let candidate = await withServerFields(collection, { ...record, ...(lookupId ? { id: lookupId } : {}) }, user, existing);
  await assertCanWriteEntity(collection, candidate, user);
  await validateFinanceConfig(collection, candidate, existing);
  candidate = await attachClientRelationships(collection, candidate);
  if (collection === "cargo" && !existing) candidate = prepareNewCargoLifecycle(candidate, user);
  if (collection === "clients" && !candidate.normalizedPhone) {
    const error = new Error("A valid Somalia or Kenya phone number is required.");
    error.status = 400;
    throw error;
  }
  if (collection === "clients" && candidate.normalizedPhone) {
    const duplicate = await Client.findOne({ normalizedPhone: candidate.normalizedPhone, id: { $ne: candidate.id } });
    if (duplicate) {
      const error = new Error("A client with this phone number already exists.");
      error.status = 409;
      throw error;
    }
  }

  const saved = await Model.findOneAndUpdate(
    { id: candidate.id },
    { $set: candidate },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  if (["tickets", "visas"].includes(collection)) await syncServicePayable(collection, saved);
  if (["tickets", "visas", "cargo"].includes(collection)) await syncPaidServicePayment(collection, saved, user);

  await createActivity(action, user);
  return saved;
};

export const deleteEntity = async ({ collection, id, user, action }) => {
  assertEntityName(collection);
  const Model = ENTITY_MODELS[collection];
  const existing = await Model.findOne({ id });
  if (!existing) {
    const error = new Error("Record not found.");
    error.status = 404;
    throw error;
  }
  await assertCanWriteEntity(collection, existing, user);
  await Model.deleteOne({ id });
  await createActivity(action, user);
};

export const readVisibleAgencyData = async (user) => {
  const [source, team] = await Promise.all([readAgencyData(), User.find({})]);
  return visibleData(source, user, team.map((row) => row.toSafeObject()));
};
