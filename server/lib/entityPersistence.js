import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Cargo from "../models/Cargo.js";
import DailyClose from "../models/DailyClose.js";
import Expense from "../models/Expense.js";
import Rate from "../models/Rate.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import Payment from "../models/Payment.js";
import StartingBalance from "../models/StartingBalance.js";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import Visa from "../models/Visa.js";
import Client from "../models/Client.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import PaymentMethod from "../models/PaymentMethod.js";
import { attachClientRelationships } from "./clientIdentity.js";
import {
  assertCargoRouteEditable,
  normalizeCargoStatus,
  prepareNewCargoLifecycle,
} from "./cargoWorkflow.js";
import { readAgencyData, visibleData } from "./agencyData.js";
import {
  assertActiveBranch,
  assertBranchAccess,
  findBranchByOffice,
} from "./branches.js";
import {
  assertBranchCurrency,
  assertBranchPaymentMethod,
  assertUniqueDailyClose,
  cargoCustomerCharge,
  createCustomerPayment,
  dailyCloseSnapshot,
} from "./finance.js";
import { randomToken } from "../utils/tokens.js";
import { nextBusinessReference } from "./references.js";
import { persistCargoWithInitialPayment } from "./cargoInitialPayment.js";
import {
  normalizeServiceStatus,
  prepareNewServiceWorkflow,
} from "./serviceWorkflow.js";

export const servicePayableRecord = (collection, service) => {
  const kind =
    collection === "tickets"
      ? "ticket"
      : collection === "visas"
        ? "visa"
        : "cargo";
  const billed =
    collection === "cargo" || service.type === "Sale"
      ? Math.max(0, Number(service.cost) || 0)
      : 0;
  if (!billed) return null;
  return {
    id: `payable_${kind}_${service.id}`,
    date:
      collection === "tickets"
        ? service.saleDate || ""
        : collection === "visas"
          ? service.appDate || ""
          : service.dateIn || "",
    branchId: service.branchId || service.originBranchId || null,
    reference: service.ref || service.tracking || "",
    supplier:
      collection === "tickets"
        ? "Ticket provider"
        : collection === "visas"
          ? "Visa provider"
          : "Cargo carrier",
    description:
      collection === "tickets"
        ? `Ticket cost for ${service.passenger || service.ref}: ${service.route || ""}${service.airlinePnr ? ` to ${service.airlinePnr}` : ""}`
        : collection === "visas"
          ? `Visa processing cost for ${service.applicant || service.ref}: ${service.destination || ""}`
          : `Cargo direct cost for ${service.tracking}: ${service.origin || ""} to ${service.destination || ""}`,
    currency: service.currency,
    billed,
    dueDate:
      collection === "tickets"
        ? service.travelDate || ""
        : collection === "cargo"
          ? service.dateDelivered || ""
          : "",
    notes: `Automatically created from ${kind} ${service.ref || service.tracking}. Update the provider name when known.`,
  };
};

const syncServicePayable = async (collection, service) => {
  if (mongoose.connection.readyState === 0) return;
  const kind =
    collection === "tickets"
      ? "ticket"
      : collection === "visas"
        ? "visa"
        : "cargo";
  const payableId = `payable_${kind}_${service.id}`;
  const payable = servicePayableRecord(collection, service);
  if (!payable) {
    const hasPayments = await SupplierPayment.exists({
      supplierBillId: payableId,
      status: { $ne: "void" },
    });
    if (!hasPayments) {
      await Supplier.findOneAndUpdate(
        { id: payableId },
        {
          $set: {
            recordStatus: "cancelled",
            cancelledAt: new Date().toISOString(),
            cancellationReason: `Automatic payable removed because ${kind} ${service.ref || service.id} has no agency cost.`,
          },
        },
      );
    }
    return;
  }
  await Supplier.findOneAndUpdate(
    { id: payableId },
    {
      $set: {
        ...payable,
        recordStatus: "active",
        cancelledAt: "",
        cancelledByUserId: "",
        cancellationReason: "",
      },
      $setOnInsert: { paid: 0 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );
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

  if (
    [
      "suppliers",
      "rates",
      "startingBalances",
      "paymentMethods",
      "branchPaymentMethods",
    ].includes(collection) &&
    user.role !== "owner"
  ) {
    const error = new Error("Owner access is required for this record.");
    error.status = 403;
    throw error;
  }

  if (user.role === "owner") {
    if (
      [
        "tickets",
        "visas",
        "expenses",
        "closes",
        "startingBalances",
        "branchPaymentMethods",
      ].includes(collection) &&
      record.branchId
    )
      await assertActiveBranch(record.branchId);
    if (collection === "rates") {
      await assertActiveBranch(record.originBranchId);
      await assertActiveBranch(record.destinationBranchId);
    }
    if (collection === "cargo") {
      if (record.originBranchId)
        await assertActiveBranch(record.originBranchId);
      if (record.destinationBranchId)
        await assertActiveBranch(record.destinationBranchId);
      if (
        record.originBranchId &&
        record.destinationBranchId &&
        String(record.originBranchId) === String(record.destinationBranchId)
      ) {
        const error = new Error(
          "Cargo origin and destination branches must be different.",
        );
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

  if (
    ["tickets", "visas", "expenses", "closes", "clients"].includes(collection)
  )
    await assertBranchAccess(user, record.branchId);
  if (collection === "cargo") {
    await assertBranchAccess(user, record.originBranchId);
    await assertActiveBranch(record.destinationBranchId);
    if (String(record.originBranchId) === String(record.destinationBranchId)) {
      const error = new Error(
        "Cargo origin and destination branches must be different.",
      );
      error.status = 400;
      throw error;
    }
  }
};

const withServerFields = async (collection, record, user, existing) => {
  const next = { ...record };
  if (!next.id)
    next.id = `${collection}_${Date.now().toString(36)}_${randomToken(4)}`;
  if (collection === "cargo") {
    const senderEmail = String(next.senderEmail || "").trim();
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      const error = new Error("Sender email must be a valid email address.");
      error.status = 400;
      throw error;
    }
    next.senderEmail = senderEmail;

    const rateNote = String(next.rateNote || "").trim();
    if (!rateNote) {
      const error = new Error(
        "Pricing note / flight reference is required.",
      );
      error.status = 400;
      throw error;
    }
    next.rateNote = rateNote;
  }
  if (
    ["tickets", "visas", "expenses", "closes", "startingBalances"].includes(
      collection,
    ) &&
    !next.branchId
  ) {
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
  if (
    collection === "cargo" &&
    !next.paidByBranchId &&
    (next.paymentMethod || next.paidByOffice)
  ) {
    const branch = await findBranchByOffice(next.paidByOffice || next.origin);
    if (branch) next.paidByBranchId = branch._id.toString();
  }
  if (user.role === "operator" && user.assignedBranchId) {
    const branchId = user.assignedBranchId.toString();
    if (
      ["tickets", "visas", "expenses", "closes", "clients"].includes(collection)
    )
      next.branchId = branchId;
    if (collection === "cargo") {
      next.originBranchId = branchId;
      if (
        !next.paidByBranchId &&
        (next.paymentMethod || next.paidByOffice)
      )
        next.paidByBranchId = branchId;
    }
  }
  if (!existing && collection === "tickets" && !next.ref) {
    next.ref = await nextBusinessReference({
      kind: "ticket",
      branchId: next.branchId,
      date: next.saleDate,
    });
    next.referenceVersion = 2;
  }
  if (!existing && collection === "visas" && !next.ref) {
    next.ref = await nextBusinessReference({
      kind: "visa",
      branchId: next.branchId,
      date: next.appDate,
    });
    next.referenceVersion = 2;
  }
  if (!existing && collection === "cargo" && !next.tracking) {
    next.tracking = await nextBusinessReference({
      kind: "cargo",
      branchId: next.originBranchId,
      date: next.dateIn,
    });
    next.referenceVersion = 2;
  }
  if (existing && ["tickets", "cargo", "visas"].includes(collection)) {
    next.cost = existing.cost || 0;
  }
  if (["tickets", "visas"].includes(collection) && next.type === "Refund")
    next.cost = 0;
  if (existing && collection === "tickets") {
    next.status = normalizeServiceStatus("ticket", existing.status);
    next.workflowVersion = existing.workflowVersion || 0;
    next.statusHistory = existing.statusHistory || [];
  }
  if (existing && collection === "visas") {
    next.status = normalizeServiceStatus("visa", existing.status);
    next.workflowVersion = existing.workflowVersion || 0;
    next.statusHistory = existing.statusHistory || [];
  }
  if (collection === "cargo") {
    const hasWeight = Object.prototype.hasOwnProperty.call(next, "weight");
    const hasRate = Object.prototype.hasOwnProperty.call(next, "rate");
    const weight = Number(next.weight);
    const rate = Number(next.rate);
    if (hasWeight && (!Number.isFinite(weight) || weight <= 0)) {
      const error = new Error("Cargo weight must be greater than zero.");
      error.status = 400;
      throw error;
    }
    if (hasRate && (!Number.isFinite(rate) || rate < 0)) {
      const error = new Error("Cargo rate cannot be negative.");
      error.status = 400;
      throw error;
    }
    next.customerCharge = cargoCustomerCharge(next);
    if (!existing) next.status = "received";
    else {
      next.status = normalizeCargoStatus(existing.status);
      if (
        String(next.originBranchId || "") !==
          String(existing.originBranchId || "") ||
        String(next.destinationBranchId || "") !==
          String(existing.destinationBranchId || "")
      ) {
        assertCargoRouteEditable(existing, user);
      }
    }
  }
  if (
    ["tickets", "visas", "expenses", "closes", "startingBalances"].includes(
      collection,
    )
  )
    next.office = next.office || next.homeOffice;
  return next;
};

const validateFinanceConfig = async (collection, record, existing) => {
  if (
    ["tickets", "visas", "expenses", "closes", "startingBalances"].includes(
      collection,
    )
  ) {
    const branchId = record.branchId;
    const currency = record.currency;
    if (branchId && currency) await assertBranchCurrency(branchId, currency);
    const paymentMethod = record.paymentMethod || record.method;
    const paymentMethodId = record.paymentMethodId;
    if (branchId && currency && (paymentMethod || paymentMethodId)) {
      const { method } = await assertBranchPaymentMethod({
        branchId,
        currency,
        paymentMethod,
        paymentMethodId,
      });
      if (collection === "startingBalances")
        record.paymentMethodId = method._id;
      else record.paymentMethodId = method._id;
    }
    if (collection === "closes")
      await assertUniqueDailyClose(record, existing?.id);
  }
  if (collection === "cargo") {
    if (record.originBranchId && record.currency)
      await assertBranchCurrency(record.originBranchId, record.currency);
    if (
      record.paidByBranchId &&
      record.currency &&
      (record.paymentMethod || record.paymentMethodId)
    ) {
      const { method } = await assertBranchPaymentMethod({
        branchId: record.paidByBranchId,
        currency: record.currency,
        paymentMethod: record.paymentMethod,
        paymentMethodId: record.paymentMethodId,
      });
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
  let candidate = await withServerFields(
    collection,
    { ...record, ...(lookupId ? { id: lookupId } : {}) },
    user,
    existing,
  );
  await assertCanWriteEntity(collection, candidate, user);
  await validateFinanceConfig(collection, candidate, existing);
  candidate = await attachClientRelationships(collection, candidate);
  if (collection === "cargo" && !existing)
    candidate = prepareNewCargoLifecycle(candidate, user);
  if (collection === "tickets" && !existing)
    candidate = prepareNewServiceWorkflow("ticket", candidate, user);
  if (collection === "visas" && !existing)
    candidate = prepareNewServiceWorkflow("visa", candidate, user);
  if (collection === "clients" && !candidate.normalizedPhone) {
    const error = new Error(
      "A valid Somalia or Kenya phone number is required.",
    );
    error.status = 400;
    throw error;
  }
  if (collection === "clients" && candidate.normalizedPhone) {
    const duplicate = await Client.findOne({
      normalizedPhone: candidate.normalizedPhone,
      id: { $ne: candidate.id },
    });
    if (duplicate) {
      const error = new Error(
        "A client with this phone number already exists.",
      );
      error.status = 409;
      throw error;
    }
  }
  if (collection === "closes") {
    if (existing?.status === "closed") {
      const error = new Error(
        "This daily close is immutable. The Owner must reopen it with a reason before correction.",
      );
      error.status = 409;
      throw error;
    }
    const snapshot = await dailyCloseSnapshot(candidate);
    const actuallyCounted = Number(candidate.actuallyCounted) || 0;
    Object.assign(candidate, snapshot, {
      status: "closed",
      difference:
        Math.round((actuallyCounted - snapshot.expectedBalance) * 100) / 100,
      closedByUserId: user.id?.toString?.() || user._id?.toString?.() || "",
      closedAt: new Date().toISOString(),
      reopenHistory: existing?.reopenHistory || [],
    });
  }

  const saved = await Model.findOneAndUpdate(
    { id: candidate.id },
    { $set: candidate },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  if (["tickets", "visas", "cargo"].includes(collection))
    await syncServicePayable(collection, saved);
  await createActivity(action, user);
  return saved;
};

// Cargo plus its first payment is one user operation. The payment is posted
// only after the validated cargo exists; on failure a new cargo is compensated
// so it cannot be exposed as paid without a ledger entry.
export const writeCargoWithInitialPayment = async ({
  record,
  initialPayment,
  user,
  action,
}) => {
  return persistCargoWithInitialPayment({
    record,
    initialPayment,
    user,
    action,
    findCargo: (id) => Cargo.findOne({ id }),
    findPayment: (idempotencyKey) => Payment.findOne({ idempotencyKey }),
    saveCargo: ({ record: nextRecord, user: actor, action: nextAction }) =>
      writeEntity({
        collection: "cargo",
        record: nextRecord,
        user: actor,
        action: nextAction,
      }),
    createPayment: createCustomerPayment,
    deleteCargo: (id) => Cargo.deleteOne({ id }),
  });
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
  // Deleting is an ownership decision, not a day-to-day operation. Operators
  // create and correct records in their branch; removing one stays with the
  // owner so a branch cannot quietly erase its own history.
  if (user.role !== "owner") {
    const error = new Error(
      "Only the owner can delete records. Ask the owner to remove this one.",
    );
    error.status = 403;
    throw error;
  }
  await assertCanWriteEntity(collection, existing, user);
  const actorId = user.id?.toString?.() || user._id?.toString?.() || "";
  const at = new Date().toISOString();
  const reason = String(
    action?.detail || "Archived from the agency workspace",
  ).trim();
  if (collection === "cargo") {
    const error = new Error(
      "Cargo history cannot be deleted. Use the Cancel shipment action with a reason.",
    );
    error.status = 409;
    throw error;
  }
  if (["closes", "payments", "supplierPayments"].includes(collection)) {
    const error = new Error(
      "Financial history cannot be deleted. Use its correction or reopen workflow.",
    );
    error.status = 409;
    throw error;
  }
  if (collection === "rates") {
    await Model.findOneAndUpdate(
      { id },
      { $set: { isActive: false } },
      { new: true, runValidators: true },
    );
  } else if (collection === "expenses") {
    await Model.findOneAndUpdate(
      { id },
      {
        $set: {
          recordStatus: "void",
          voidedAt: at,
          voidedByUserId: actorId,
          voidReason: reason,
        },
      },
      { new: true, runValidators: true },
    );
  } else if (collection === "suppliers") {
    const hasPayments = await SupplierPayment.exists({
      supplierBillId: id,
      status: { $ne: "void" },
    });
    if (hasPayments) {
      const error = new Error(
        "A payable with payment history cannot be cancelled.",
      );
      error.status = 409;
      throw error;
    }
    await Model.findOneAndUpdate(
      { id },
      {
        $set: {
          recordStatus: "cancelled",
          cancelledAt: at,
          cancelledByUserId: actorId,
          cancellationReason: reason,
        },
      },
      { new: true, runValidators: true },
    );
  } else if (collection === "clients") {
    const linked = await Promise.all([
      Ticket.exists({ clientId: existing._id }),
      Visa.exists({ clientId: existing._id }),
      Cargo.exists({
        $or: [
          { senderClientId: existing._id },
          { receiverClientId: existing._id },
        ],
      }),
    ]);
    if (linked.some(Boolean)) {
      const error = new Error(
        "A client with transaction history cannot be archived.",
      );
      error.status = 409;
      throw error;
    }
    await Model.findOneAndUpdate(
      { id },
      {
        $set: {
          isActive: false,
          archivedAt: at,
          archivedByUserId: actorId,
          archiveReason: reason,
        },
      },
      { new: true, runValidators: true },
    );
  } else if (["tickets", "visas"].includes(collection)) {
    await Model.findOneAndUpdate(
      { id },
      {
        $set: {
          recordStatus: "archived",
          archivedAt: at,
          archivedByUserId: actorId,
          archiveReason: reason,
        },
      },
      { new: true, runValidators: true },
    );
  } else {
    const error = new Error(
      "This record cannot be deleted from normal operations.",
    );
    error.status = 409;
    throw error;
  }
  await createActivity(action, user);
};

export const readVisibleAgencyData = async (user) => {
  const [source, team] = await Promise.all([readAgencyData(), User.find({})]);
  return visibleData(
    source,
    user,
    team.map((row) => row.toSafeObject()),
  );
};
