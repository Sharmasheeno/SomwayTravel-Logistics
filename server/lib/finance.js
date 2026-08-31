import Branch from "../models/Branch.js";
import BranchPaymentMethod from "../models/BranchPaymentMethod.js";
import Cargo from "../models/Cargo.js";
import DailyClose from "../models/DailyClose.js";
import Expense from "../models/Expense.js";
import Payment from "../models/Payment.js";
import PaymentMethod from "../models/PaymentMethod.js";
import StartingBalance from "../models/StartingBalance.js";
import Supplier from "../models/Supplier.js";
import SupplierPayment from "../models/SupplierPayment.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { assertBranchAccess } from "./branches.js";
import { randomToken } from "../utils/tokens.js";

export const SUPPORTED_CURRENCIES = ["KES", "USD"];
export const LEGACY_PAYMENT_METHODS = [
  { name: "Cash", code: "cash", type: "cash" },
  { name: "M-Pesa", code: "mpesa", type: "mobile_money" },
  { name: "Bank", code: "bank", type: "bank" },
  { name: "EVC Plus", code: "evc_plus", type: "mobile_money" },
];

const same = (a, b) => String(a || "") === String(b || "");
const cleanCurrency = (currency) => String(currency || "").trim().toUpperCase();
const moneyRound = (value) => Math.round((Number(value) || 0) * 100) / 100;
const totalFor = (type, record) => type === "cargo" ? moneyRound((record.weight || 0) * (record.rate || 0)) : moneyRound(record.amount || 0);
const directionFor = (type, record) => type !== "cargo" && record.type === "Refund" ? -1 : 1;
const serviceBranchId = (type, record) => type === "cargo" ? record.paidByBranchId || record.originBranchId : record.branchId;
const modelFor = (type) => ({ ticket: Ticket, visa: Visa, cargo: Cargo }[type]);

export const canonicalPaymentCode = (value) => {
  const text = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (text === "m_pesa" || text === "mpesa") return "mpesa";
  if (text === "evc_plus" || text === "evc") return "evc_plus";
  return text || "other";
};

export const assertBranchCurrency = async (branchId, currency) => {
  const branch = await Branch.findById(branchId);
  const code = cleanCurrency(currency);
  const allowed = branch?.allowedCurrencies?.length ? branch.allowedCurrencies : branch?.defaultCurrency ? [branch.defaultCurrency] : SUPPORTED_CURRENCIES;
  if (!branch || branch.isActive === false || !SUPPORTED_CURRENCIES.includes(code) || !allowed.includes(code)) {
    const error = new Error("This currency is not enabled for the selected branch.");
    error.status = 400;
    throw error;
  }
  return branch;
};

export const resolvePaymentMethod = async (method) => {
  if (!method) return null;
  if (method._id) return method;
  const code = canonicalPaymentCode(method);
  return PaymentMethod.findOne({ $or: [{ code }, { name: String(method) }] });
};

export const assertBranchPaymentMethod = async ({ branchId, currency, paymentMethod, paymentMethodId }) => {
  await assertBranchCurrency(branchId, currency);
  const method = paymentMethodId ? await PaymentMethod.findById(paymentMethodId) : await resolvePaymentMethod(paymentMethod);
  if (!method || method.isActive === false) {
    const error = new Error("Choose a valid payment method.");
    error.status = 400;
    throw error;
  }
  const config = await BranchPaymentMethod.findOne({ branchId, paymentMethodId: method._id, isActive: true });
  if (!config || !(config.allowedCurrencies || []).includes(cleanCurrency(currency))) {
    const error = new Error("This payment method is not enabled for the selected branch and currency.");
    error.status = 400;
    throw error;
  }
  return { method, config };
};

export const customerPaymentsFor = async (type, transactionId) =>
  Payment.find({ transactionType: type, transactionId }).sort({ paymentDate: 1, createdAt: 1 });

export const activeCustomerPaymentsFor = async (type, transactionId) =>
  Payment.find({ transactionType: type, transactionId, status: { $ne: "void" } });

export const customerFinanceSummary = async (type, record) => {
  const payments = await activeCustomerPaymentsFor(type, record.id);
  const total = totalFor(type, record);
  const amountPaid = moneyRound(payments.reduce((sum, payment) => sum + (payment.amount || 0), 0));
  const balance = moneyRound(Math.max(0, total - amountPaid));
  return { total, amountPaid, balance, paymentStatus: amountPaid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial" };
};

export const decorateCustomerRecord = async (type, record) => {
  const summary = await customerFinanceSummary(type, record);
  const payments = await customerPaymentsFor(type, record.id);
  return { ...record, ...summary, payments: payments.map((payment) => payment.toObject ? payment.toObject() : payment) };
};

export const createCustomerPayment = async ({ transactionType, transactionId, amount, paymentDate, paymentMethod, paymentMethodId, reference = "", notes = "", user }) => {
  const Model = modelFor(transactionType);
  if (!Model) {
    const error = new Error("Unknown payment transaction type.");
    error.status = 400;
    throw error;
  }
  const transaction = await Model.findOne({ id: transactionId });
  if (!transaction) {
    const error = new Error("Transaction not found.");
    error.status = 404;
    throw error;
  }
  const branchId = serviceBranchId(transactionType, transaction);
  if (user.role !== "owner") await assertBranchAccess(user, branchId);
  const { method } = await assertBranchPaymentMethod({ branchId, currency: transaction.currency, paymentMethod, paymentMethodId });
  const value = moneyRound(amount);
  if (value <= 0) {
    const error = new Error("Payment amount must be greater than zero.");
    error.status = 400;
    throw error;
  }
  const summary = await customerFinanceSummary(transactionType, transaction);
  if (value > summary.balance) {
    const error = new Error("Payment exceeds the remaining transaction balance.");
    error.status = 400;
    throw error;
  }
  return Payment.create({
    id: `pay_${randomToken(10)}`,
    branchId,
    transactionType,
    transactionId,
    clientId: transaction.clientId || transaction.senderClientId || null,
    amount: value,
    flow: transactionType !== "cargo" && transaction.type === "Refund" ? "outbound" : "inbound",
    currency: transaction.currency,
    paymentMethodId: method._id,
    paymentMethod: method.name,
    paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    reference,
    notes,
    receivedByUserId: user.id || user._id?.toString?.() || "",
  });
};

export const voidCustomerPayment = async ({ id, reason, user }) => {
  if (user.role !== "owner") {
    const error = new Error("Owner access is required to void payments.");
    error.status = 403;
    throw error;
  }
  const payment = await Payment.findOne({ id });
  if (!payment) {
    const error = new Error("Payment not found.");
    error.status = 404;
    throw error;
  }
  payment.status = "void";
  payment.voidedAt = new Date().toISOString();
  payment.voidedByUserId = user.id || user._id?.toString?.() || "";
  payment.voidReason = String(reason || "").trim();
  await payment.save();
  return payment;
};

export const supplierPaymentsFor = async (supplierBillId) =>
  SupplierPayment.find({ supplierBillId }).sort({ paymentDate: 1, createdAt: 1 });

export const supplierFinanceSummary = async (bill) => {
  const payments = await SupplierPayment.find({ supplierBillId: bill.id, status: { $ne: "void" } });
  const paid = moneyRound(payments.reduce((sum, payment) => sum + (payment.amount || 0), 0));
  return { amountPaid: paid, outstanding: moneyRound(Math.max(0, (bill.billed || 0) - paid)), paymentStatus: paid <= 0 ? "unpaid" : paid >= (bill.billed || 0) ? "paid" : "partial" };
};

export const createSupplierPayment = async ({ supplierBillId, amount, paymentDate, paymentMethod, paymentMethodId, reference = "", notes = "", user }) => {
  if (user.role !== "owner") {
    const error = new Error("Owner access is required for supplier payments.");
    error.status = 403;
    throw error;
  }
  const bill = await Supplier.findOne({ id: supplierBillId });
  if (!bill) {
    const error = new Error("Supplier bill not found.");
    error.status = 404;
    throw error;
  }
  const branchId = bill.branchId || null;
  if (branchId) await assertBranchPaymentMethod({ branchId, currency: bill.currency, paymentMethod, paymentMethodId });
  const method = paymentMethodId ? await PaymentMethod.findById(paymentMethodId) : await resolvePaymentMethod(paymentMethod);
  const value = moneyRound(amount);
  const summary = await supplierFinanceSummary(bill);
  if (value <= 0 || value > summary.outstanding) {
    const error = new Error("Supplier payment must be greater than zero and within the outstanding balance.");
    error.status = 400;
    throw error;
  }
  return SupplierPayment.create({
    id: `spay_${randomToken(10)}`,
    supplierBillId,
    supplierId: bill.supplierId || bill.supplier || "",
    branchId,
    amount: value,
    currency: bill.currency,
    paymentMethodId: method._id,
    paymentMethod: method.name,
    paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
    reference,
    notes,
    paidByUserId: user.id || user._id?.toString?.() || "",
  });
};

export const closeMetrics = async ({ branchId, currency, paymentMethodId, date }) => {
  const opening = await StartingBalance.findOne({ branchId, currency, paymentMethodId });
  const payments = await Payment.find({ branchId, currency, paymentMethodId, paymentDate: date, status: { $ne: "void" } });
  const expenses = await Expense.find({ branchId, currency, paymentMethodId, date, paid: true });
  const collections = moneyRound(payments.reduce(
    (sum, payment) => sum + (payment.flow === "outbound" ? -(payment.amount || 0) : payment.amount || 0),
    0
  ));
  const paidOut = moneyRound(expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0));
  return { opening: opening?.amount || 0, collections, expenses: paidOut, should: moneyRound((opening?.amount || 0) + collections - paidOut) };
};

export const assertUniqueDailyClose = async (record, existingId = "") => {
  const duplicate = await DailyClose.findOne({ branchId: record.branchId, date: record.date, currency: record.currency, paymentMethodId: record.paymentMethodId || null, id: { $ne: existingId || record.id || "" } });
  if (duplicate) {
    const error = new Error("A daily close already exists for this branch, date, currency and payment method.");
    error.status = 409;
    throw error;
  }
};

export const buildFinanceReport = async ({ branchId = "", from = "0000-00-00", to = "9999-99-99" } = {}) => {
  const [branches, tickets, visas, cargo, expenses, suppliers, payments] = await Promise.all([
    Branch.find({}),
    Ticket.find({ saleDate: { $gte: from, $lte: to } }),
    Visa.find({ appDate: { $gte: from, $lte: to } }),
    Cargo.find({ dateIn: { $gte: from, $lte: to } }),
    Expense.find({ date: { $gte: from, $lte: to }, inProfitLoss: true }),
    Supplier.find({ date: { $gte: from, $lte: to } }),
    Payment.find({ paymentDate: { $gte: from, $lte: to }, status: { $ne: "void" } }),
  ]);
  const branchNameById = new Map(branches.map((branch) => [branch._id.toString(), branch.name]));
  const reportBranches = branches.filter((branch) => branch.isActive !== false && (!branchId || same(branchId, branch._id)));
  const currenciesForBranch = (branch) => (
    Array.isArray(branch.allowedCurrencies) && branch.allowedCurrencies.length
      ? branch.allowedCurrencies
      : [branch.defaultCurrency].filter(Boolean)
  );
  const rows = new Map();
  const rowFor = (bid, currency) => {
    const key = `${bid}:${currency}`;
    if (!rows.has(key)) rows.set(key, { branchId: String(bid || ""), branch: branchNameById.get(String(bid || "")) || "Unassigned", currency, revenue: 0, directCost: 0, grossProfit: 0, collections: 0, expenses: 0, outstanding: 0, supplierExposure: 0, services: { ticket: 0, visa: 0, cargo: 0 }, serviceGrossProfit: { ticket: 0, visa: 0, cargo: 0 }, paymentMethods: {} });
    return rows.get(key);
  };
  const include = (bid) => !branchId || same(branchId, bid);
  for (const branch of reportBranches) {
    for (const currency of currenciesForBranch(branch)) rowFor(branch._id, currency);
  }
  for (const [type, list] of [["ticket", tickets], ["visa", visas], ["cargo", cargo]]) {
    for (const item of list) {
      const bid = serviceBranchId(type, item);
      if (!include(bid)) continue;
      const row = rowFor(bid, item.currency);
      const total = totalFor(type, item);
      const direction = directionFor(type, item);
      const revenue = total * direction;
      const directCost = direction < 0 ? 0 : item.cost || 0;
      row.revenue += revenue;
      row.directCost += directCost;
      row.services[type] += revenue;
      row.serviceGrossProfit[type] += revenue - directCost;
      const summary = await customerFinanceSummary(type, item);
      if (direction > 0) row.outstanding += summary.balance;
    }
  }
  const transactionDirection = new Map([
    ...tickets.map((item) => [`ticket:${item.id}`, directionFor("ticket", item)]),
    ...visas.map((item) => [`visa:${item.id}`, directionFor("visa", item)]),
    ...cargo.map((item) => [`cargo:${item.id}`, 1]),
  ]);
  for (const payment of payments) {
    if (!include(payment.branchId)) continue;
    const row = rowFor(payment.branchId, payment.currency);
    const transactionFlow = transactionDirection.get(`${payment.transactionType}:${payment.transactionId}`);
    const direction = transactionFlow === -1 ? -1 : payment.flow === "outbound" ? -1 : 1;
    const amount = (payment.amount || 0) * direction;
    row.collections += amount;
    row.paymentMethods[payment.paymentMethod || "Unknown"] = (row.paymentMethods[payment.paymentMethod || "Unknown"] || 0) + amount;
  }
  for (const expense of expenses) {
    if (!include(expense.branchId)) continue;
    rowFor(expense.branchId, expense.currency).expenses += expense.amount || 0;
  }
  for (const bill of suppliers) {
    if (bill.branchId && !include(bill.branchId)) continue;
    const summary = await supplierFinanceSummary(bill);
    rowFor(bill.branchId, bill.currency).supplierExposure += summary.outstanding;
  }
  return [...rows.values()].map((row) => ({ ...row, revenue: moneyRound(row.revenue), directCost: moneyRound(row.directCost), grossProfit: moneyRound(row.revenue - row.directCost), collections: moneyRound(row.collections), expenses: moneyRound(row.expenses), outstanding: moneyRound(row.outstanding), supplierExposure: moneyRound(row.supplierExposure) }));
};
