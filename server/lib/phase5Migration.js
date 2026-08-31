import Branch from "../models/Branch.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import Cargo from "../models/Cargo.js";
import Payment from "../models/Payment.js";
import PaymentMethod from "../models/PaymentMethod.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { LEGACY_PAYMENT_METHODS, assertBranchPaymentMethod, canonicalPaymentCode } from "./finance.js";

const branchRules = {
  NBO: { defaultCurrency: "KES", allowedCurrencies: ["KES", "USD"] },
  MOG: { defaultCurrency: "USD", allowedCurrencies: ["USD"] },
};

const stats = () => ({ scanned: 0, created: 0, linked: 0, skipped: 0, unresolved: [] });
const totalFor = (type, row) => type === "cargo" ? (row.weight || 0) * (row.rate || 0) : row.amount || 0;
const branchIdFor = (type, row) => type === "cargo" ? row.paidByBranchId || row.originBranchId : row.branchId;

const seedPaymentMethods = async () => {
  const result = stats();
  for (const method of LEGACY_PAYMENT_METHODS) {
    result.scanned += 1;
    const existing = await PaymentMethod.findOne({ code: method.code });
    if (existing) {
      Object.assign(existing, method, { id: existing.id || `pm_${method.code}`, isActive: existing.isActive !== false });
      await existing.save();
      result.skipped += 1;
      continue;
    }
    await PaymentMethod.create({ ...method, id: `pm_${method.code}`, isActive: true });
    result.created += 1;
  }
  return result;
};

const seedBranchCurrencyRules = async () => {
  const result = stats();
  for (const branch of await Branch.find({})) {
    result.scanned += 1;
    const rule = branchRules[branch.code] || { defaultCurrency: branch.defaultCurrency, allowedCurrencies: branch.allowedCurrencies?.length ? branch.allowedCurrencies : [branch.defaultCurrency].filter(Boolean) };
    branch.defaultCurrency = rule.defaultCurrency;
    branch.allowedCurrencies = rule.allowedCurrencies;
    if (branchRules[branch.code]) branch.isActive = true;
    await branch.save();
    result.linked += 1;
  }
  return result;
};

const seedBranchMethods = async () => {
  const result = stats();
  const branches = await Branch.find({});
  const methods = await PaymentMethod.find({});
  const byCode = new Map(methods.map((method) => [method.code, method]));
  for (const branch of branches) {
    const configs = branch.code === "NBO"
      ? [{ code: "cash", currencies: ["KES", "USD"], cash: true }, { code: "mpesa", currencies: ["KES"], cash: false }, { code: "bank", currencies: ["KES", "USD"], cash: false }]
      : branch.code === "MOG"
        ? [{ code: "evc_plus", currencies: ["USD"], cash: false }, { code: "bank", currencies: ["USD"], cash: false }]
        : [{ code: "cash", currencies: branch.allowedCurrencies || [], cash: true }, { code: "bank", currencies: branch.allowedCurrencies || [], cash: false }];
    const configuredMethodIds = configs.map((config) => byCode.get(config.code)?._id).filter(Boolean);
    await BranchPaymentMethod.updateMany(
      { branchId: branch._id, paymentMethodId: { $nin: configuredMethodIds } },
      { $set: { isActive: false } }
    );
    for (const config of configs) {
      result.scanned += 1;
      const method = byCode.get(config.code);
      if (!method) {
        result.unresolved.push(`${branch.code}:${config.code}`);
        continue;
      }
      await BranchPaymentMethod.findOneAndUpdate(
        { branchId: branch._id, paymentMethodId: method._id },
        { $set: { id: `bpm_${branch.code.toLowerCase()}_${config.code}`, allowedCurrencies: config.currencies, isActive: true, countsAsPhysicalCash: config.cash } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      result.linked += 1;
    }
  }
  return result;
};

const migrateCustomerPayments = async (Model, type) => {
  const result = stats();
  for (const row of await Model.find({})) {
    result.scanned += 1;
    if (!row.paid) {
      result.skipped += 1;
      continue;
    }
    const branchId = branchIdFor(type, row);
    const amount = totalFor(type, row);
    const migrationKey = `phase5:${type}:${row.id}:paid`;
    if (!branchId || !amount || !row.currency || !row.paymentMethod) {
      result.unresolved.push(`${type}:${row.id}`);
      continue;
    }
    if (await Payment.findOne({ migrationKey })) {
      result.skipped += 1;
      continue;
    }
    let method;
    try {
      ({ method } = await assertBranchPaymentMethod({ branchId, currency: row.currency, paymentMethod: row.paymentMethod }));
    } catch {
      result.unresolved.push(`${type}:${row.id}:${row.paymentMethod}:${row.currency}`);
      continue;
    }
    await Payment.create({
      id: `pay_legacy_${type}_${row.id}`,
      branchId,
      transactionType: type,
      transactionId: row.id,
      clientId: row.clientId || row.senderClientId || null,
      amount,
      flow: type !== "cargo" && row.type === "Refund" ? "outbound" : "inbound",
      currency: row.currency,
      paymentMethodId: method._id,
      paymentMethod: method.name,
      paymentDate: row.paymentDate || row.saleDate || row.appDate || row.dateIn || new Date().toISOString().slice(0, 10),
      receivedByUserId: row.createdBy || "",
      migrationKey,
      notes: "Phase 5 migration from legacy paid=true record.",
    });
    result.created += 1;
  }
  return result;
};

const migrateSupplierPayments = async () => {
  const result = stats();
  const cash = await PaymentMethod.findOne({ code: "cash" });
  for (const bill of await Supplier.find({})) {
    result.scanned += 1;
    if (!bill.paid) {
      result.skipped += 1;
      continue;
    }
    const migrationKey = `phase5:supplier:${bill.id}:paid`;
    if (await SupplierPayment.findOne({ migrationKey })) {
      result.skipped += 1;
      continue;
    }
    if (!cash) {
      result.unresolved.push(`supplier:${bill.id}:cash-method`);
      continue;
    }
    await SupplierPayment.create({
      id: `spay_legacy_${bill.id}`,
      supplierBillId: bill.id,
      supplierId: bill.supplierId || bill.supplier || "",
      branchId: bill.branchId || null,
      amount: bill.paid,
      currency: bill.currency,
      paymentMethodId: cash._id,
      paymentMethod: cash.name,
      paymentDate: bill.date || new Date().toISOString().slice(0, 10),
      migrationKey,
      notes: "Phase 5 migration from legacy supplier paid amount.",
    });
    result.created += 1;
  }
  return result;
};

const normalizeRefundAccounting = async (Model, type) => {
  const result = stats();
  for (const row of await Model.find({ type: "Refund" })) {
    result.scanned += 1;
    let changed = false;
    if (row.cost !== 0) {
      row.cost = 0;
      await row.save();
      changed = true;
    }
    const paymentResult = await Payment.updateMany(
      { transactionType: type, transactionId: row.id, flow: { $ne: "outbound" } },
      { $set: { flow: "outbound" } }
    );
    if (paymentResult.modifiedCount) changed = true;
    const payableId = `payable_${type}_${row.id}`;
    const hasPayablePayments = await SupplierPayment.exists({ supplierBillId: payableId, status: { $ne: "void" } });
    if (!hasPayablePayments) {
      const deleted = await Supplier.deleteOne({ id: payableId });
      if (deleted.deletedCount) changed = true;
    }
    if (changed) result.linked += 1;
    else result.skipped += 1;
  }
  return result;
};

const linkLegacyMethodIds = async (Model, field = "paymentMethod") => {
  const result = stats();
  for (const row of await Model.find({})) {
    result.scanned += 1;
    if (row.paymentMethodId) {
      result.skipped += 1;
      continue;
    }
    const method = await PaymentMethod.findOne({ code: canonicalPaymentCode(row[field]) });
    if (!method) {
      result.unresolved.push(`${Model.modelName}:${row.id || row._id}:${row[field]}`);
      continue;
    }
    row.paymentMethodId = method._id;
    await row.save();
    result.linked += 1;
  }
  return result;
};

export const runPhase5Migration = async () => {
  return {
    branchCurrencies: await seedBranchCurrencyRules(),
    paymentMethods: await seedPaymentMethods(),
    branchPaymentMethods: await seedBranchMethods(),
    ticketPayments: await migrateCustomerPayments(Ticket, "ticket"),
    visaPayments: await migrateCustomerPayments(Visa, "visa"),
    cargoPayments: await migrateCustomerPayments(Cargo, "cargo"),
    refundAccounting: {
      tickets: await normalizeRefundAccounting(Ticket, "ticket"),
      visas: await normalizeRefundAccounting(Visa, "visa"),
    },
    supplierPayments: await migrateSupplierPayments(),
    linkedMethods: {
      tickets: await linkLegacyMethodIds(Ticket),
      visas: await linkLegacyMethodIds(Visa),
      cargo: await linkLegacyMethodIds(Cargo),
      expenses: await linkLegacyMethodIds((await import("../models/Expense.js")).default),
      closes: await linkLegacyMethodIds((await import("../models/DailyClose.js")).default),
    },
  };
};
