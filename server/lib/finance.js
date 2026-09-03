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
const cleanCurrency = (currency) =>
  String(currency || "")
    .trim()
    .toUpperCase();
const moneyRound = (value) => Math.round((Number(value) || 0) * 100) / 100;
const dateOnly = (value) => String(value || "").slice(0, 10);
export const cargoCustomerCharge = (record) =>
  moneyRound((Number(record?.weight) || 0) * (Number(record?.rate) || 0));
const totalFor = (type, record) =>
  type === "cargo" ? cargoCustomerCharge(record) : moneyRound(record.amount || 0);
const directionFor = (type, record) =>
  type !== "cargo" && record.type === "Refund" ? -1 : 1;
const paymentBranchId = (type, record) =>
  type === "cargo"
    ? record.paidByBranchId || record.originBranchId
    : record.branchId;
const revenueBranchId = (type, record) =>
  type === "cargo" ? record.originBranchId : record.branchId;
const modelFor = (type) => ({ ticket: Ticket, visa: Visa, cargo: Cargo })[type];
const customerPaymentLocks = new Map();

const withCustomerPaymentLock = async (key, work) => {
  const previous = customerPaymentLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  customerPaymentLocks.set(key, queued);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (customerPaymentLocks.get(key) === queued) customerPaymentLocks.delete(key);
  }
};

export const canonicalPaymentCode = (value) => {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (text === "m_pesa" || text === "mpesa") return "mpesa";
  if (text === "evc_plus" || text === "evc") return "evc_plus";
  return text || "other";
};

export const assertBranchCurrency = async (branchId, currency) => {
  const branch = await Branch.findById(branchId);
  const code = cleanCurrency(currency);
  const allowed = branch?.allowedCurrencies?.length
    ? branch.allowedCurrencies
    : branch?.defaultCurrency
      ? [branch.defaultCurrency]
      : SUPPORTED_CURRENCIES;
  if (
    !branch ||
    branch.isActive === false ||
    !SUPPORTED_CURRENCIES.includes(code) ||
    !allowed.includes(code)
  ) {
    const error = new Error(
      "This currency is not enabled for the selected branch.",
    );
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

export const assertBranchPaymentMethod = async ({
  branchId,
  currency,
  paymentMethod,
  paymentMethodId,
}) => {
  await assertBranchCurrency(branchId, currency);
  const method = paymentMethodId
    ? await PaymentMethod.findById(paymentMethodId)
    : await resolvePaymentMethod(paymentMethod);
  if (!method || method.isActive === false) {
    const error = new Error("Choose a valid payment method.");
    error.status = 400;
    throw error;
  }
  const config = await BranchPaymentMethod.findOne({
    branchId,
    paymentMethodId: method._id,
    isActive: true,
  });
  if (
    !config ||
    !(config.allowedCurrencies || []).includes(cleanCurrency(currency))
  ) {
    const error = new Error(
      "This payment method is not enabled for the selected branch and currency.",
    );
    error.status = 400;
    throw error;
  }
  return { method, config };
};

export const customerPaymentsFor = async (type, transactionId) =>
  Payment.find({ transactionType: type, transactionId }).sort({
    paymentDate: 1,
    createdAt: 1,
  });

export const activeCustomerPaymentsFor = async (type, transactionId) =>
  Payment.find({
    transactionType: type,
    transactionId,
    status: { $ne: "void" },
  });

export const isValidCustomerPayment = (payment, { asOf = "" } = {}) =>
  !["void", "cancelled"].includes(
    String(payment?.status || "active").toLowerCase(),
  ) && (!asOf || dateOnly(payment?.paymentDate) <= dateOnly(asOf));

export const deriveCustomerFinanceSummary = ({
  totalCharge,
  payments = [],
  asOf = "",
}) => {
  const charge = moneyRound(Math.max(0, totalCharge));
  const seenPaymentKeys = new Set();
  const validPayments = payments.filter((payment) => {
    if (!isValidCustomerPayment(payment, { asOf })) return false;
    const key = String(payment.idempotencyKey || payment.migrationKey || "");
    if (!key) return true;
    if (seenPaymentKeys.has(key)) return false;
    seenPaymentKeys.add(key);
    return true;
  });
  const netPaid = moneyRound(
    validPayments.reduce(
      (sum, payment) =>
        sum +
        (payment.flow === "outbound" ? -1 : 1) *
          (Number(payment.amount) || 0),
      0,
    ),
  );
  const totalPaid = moneyRound(Math.max(0, Math.min(charge, netPaid)));
  const balanceDue = moneyRound(Math.max(0, charge - totalPaid));
  return {
    totalCharge: charge,
    totalPaid,
    balanceDue,
    accountsReceivable: balanceDue,
    paymentStatus:
      totalPaid <= 0 ? "unpaid" : balanceDue <= 0 ? "paid" : "partial",
  };
};

export const deriveCustomerPaymentSummary = ({ total, payments = [], asOf }) => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: total,
    payments,
    asOf,
  });
  return {
    total: summary.totalCharge,
    amountPaid: summary.totalPaid,
    balance: summary.balanceDue,
    paymentStatus: summary.paymentStatus,
  };
};

export const customerFinanceSummary = async (type, record) => {
  const payments = await activeCustomerPaymentsFor(type, record.id);
  const total = totalFor(type, record);
  const summary = deriveCustomerFinanceSummary({
    totalCharge: total,
    payments,
  });
  return {
    ...summary,
    total: summary.totalCharge,
    amountPaid: summary.totalPaid,
    balance: summary.balanceDue,
  };
};

export const decorateCustomerRecord = async (type, record) => {
  const summary = await customerFinanceSummary(type, record);
  const payments = await customerPaymentsFor(type, record.id);
  return {
    ...record,
    ...summary,
    payments: payments.map((payment) =>
      payment.toObject ? payment.toObject() : payment,
    ),
  };
};

export const createCustomerPayment = async ({
  transactionType,
  transactionId,
  branchId: requestedBranchId = "",
  amount,
  paymentDate,
  paymentMethod,
  paymentMethodId,
  reference = "",
  notes = "",
  idempotencyKey = "",
  user,
}) => {
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
  const branchId =
    transactionType === "cargo" && requestedBranchId
      ? requestedBranchId
      : paymentBranchId(transactionType, transaction);
  if (user.role !== "owner") await assertBranchAccess(user, branchId);
  const { method } = await assertBranchPaymentMethod({
    branchId,
    currency: transaction.currency,
    paymentMethod,
    paymentMethodId,
  });
  const value = moneyRound(amount);
  if (value <= 0) {
    const error = new Error("Payment amount must be greater than zero.");
    error.status = 400;
    throw error;
  }
  const normalizedIdempotencyKey = String(idempotencyKey || "")
    .trim()
    .slice(0, 120);
  return withCustomerPaymentLock(
    `${transactionType}:${transactionId}`,
    async () => {
      if (normalizedIdempotencyKey) {
        const existingPayment = await Payment.findOne({
          idempotencyKey: normalizedIdempotencyKey,
        });
        if (existingPayment) return existingPayment;
      }
      const summary = await customerFinanceSummary(
        transactionType,
        transaction,
      );
      if (value > summary.balance) {
        const error = new Error(
          "Payment exceeds the remaining transaction balance.",
        );
        error.status = 400;
        throw error;
      }
      try {
        return await Payment.create({
          id: `pay_${randomToken(10)}`,
          branchId,
          transactionType,
          transactionId,
          clientId:
            transaction.clientId ||
            transaction.payerClientId ||
            transaction.senderClientId ||
            null,
          amount: value,
          flow:
            transactionType !== "cargo" && transaction.type === "Refund"
              ? "outbound"
              : "inbound",
          currency: transaction.currency,
          paymentMethodId: method._id,
          paymentMethod: method.name,
          paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
          reference,
          notes,
          ...(normalizedIdempotencyKey
            ? { idempotencyKey: normalizedIdempotencyKey }
            : {}),
          receivedByUserId: user.id || user._id?.toString?.() || "",
        });
      } catch (error) {
        if (error?.code === 11000 && normalizedIdempotencyKey)
          return Payment.findOne({ idempotencyKey: normalizedIdempotencyKey });
        throw error;
      }
    },
  );
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
  SupplierPayment.find({ supplierBillId }).sort({
    paymentDate: 1,
    createdAt: 1,
  });

export const supplierFinanceSummary = async (bill) => {
  const payments = await SupplierPayment.find({
    supplierBillId: bill.id,
    status: { $ne: "void" },
  });
  const paid = moneyRound(
    payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
  );
  return {
    amountPaid: paid,
    outstanding: moneyRound(Math.max(0, (bill.billed || 0) - paid)),
    paymentStatus:
      paid <= 0 ? "unpaid" : paid >= (bill.billed || 0) ? "paid" : "partial",
  };
};

export const createSupplierPayment = async ({
  supplierBillId,
  amount,
  paymentDate,
  paymentMethod,
  paymentMethodId,
  reference = "",
  notes = "",
  user,
}) => {
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
  if (branchId)
    await assertBranchPaymentMethod({
      branchId,
      currency: bill.currency,
      paymentMethod,
      paymentMethodId,
    });
  const method = paymentMethodId
    ? await PaymentMethod.findById(paymentMethodId)
    : await resolvePaymentMethod(paymentMethod);
  const value = moneyRound(amount);
  const summary = await supplierFinanceSummary(bill);
  if (value <= 0 || value > summary.outstanding) {
    const error = new Error(
      "Supplier payment must be greater than zero and within the outstanding balance.",
    );
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

export const voidSupplierPayment = async ({ id, reason, user }) => {
  if (user.role !== "owner") {
    const error = new Error(
      "Owner access is required to void payable payments.",
    );
    error.status = 403;
    throw error;
  }
  if (!String(reason || "").trim()) {
    const error = new Error("A correction reason is required.");
    error.status = 400;
    throw error;
  }
  const payment = await SupplierPayment.findOne({ id });
  if (!payment) {
    const error = new Error("Payable payment not found.");
    error.status = 404;
    throw error;
  }
  if (payment.status === "void") return payment;
  payment.status = "void";
  payment.voidedAt = new Date().toISOString();
  payment.voidedByUserId = user.id || user._id?.toString?.() || "";
  payment.voidReason = String(reason).trim();
  await payment.save();
  return payment;
};

export const closeMetrics = async ({
  branchId,
  currency,
  paymentMethodId,
  date,
}) => {
  const opening = await StartingBalance.findOne({
    branchId,
    currency,
    paymentMethodId,
  });
  const payments = await Payment.find({
    branchId,
    currency,
    paymentMethodId,
    paymentDate: date,
    status: { $ne: "void" },
  });
  const expenses = await Expense.find({
    branchId,
    currency,
    paymentMethodId,
    date,
    paid: true,
  });
  const collections = moneyRound(
    payments.reduce(
      (sum, payment) =>
        sum +
        (payment.flow === "outbound"
          ? -(payment.amount || 0)
          : payment.amount || 0),
      0,
    ),
  );
  const paidOut = moneyRound(
    expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
  );
  return {
    opening: opening?.amount || 0,
    collections,
    expenses: paidOut,
    should: moneyRound((opening?.amount || 0) + collections - paidOut),
  };
};

export const dailyCloseSnapshot = async ({
  branchId,
  currency,
  paymentMethodId,
  date,
}) => {
  const opening = await StartingBalance.findOne({
    branchId,
    currency,
    paymentMethodId,
  });
  const [payments, expenses] = await Promise.all([
    Payment.find({
      branchId,
      currency,
      paymentMethodId,
      paymentDate: date,
      status: { $ne: "void" },
    }),
    Expense.find({
      branchId,
      currency,
      paymentMethodId,
      date,
      paid: true,
      recordStatus: { $ne: "void" },
    }),
  ]);
  const collections = moneyRound(
    payments
      .filter((payment) => payment.flow !== "outbound")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0),
  );
  const refunds = moneyRound(
    payments
      .filter((payment) => payment.flow === "outbound")
      .reduce((sum, payment) => sum + (payment.amount || 0), 0),
  );
  const paidExpenses = moneyRound(
    expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
  );
  const openingBalance = moneyRound(opening?.amount || 0);
  return {
    openingBalance,
    totalCollections: collections,
    totalExpenses: paidExpenses,
    totalRefunds: refunds,
    expectedBalance: moneyRound(
      openingBalance + collections - paidExpenses - refunds,
    ),
  };
};

export const reopenDailyClose = async ({ id, reason, user }) => {
  if (user.role !== "owner")
    throw Object.assign(
      new Error("Owner access is required to reopen a daily close."),
      { status: 403 },
    );
  if (!String(reason || "").trim())
    throw Object.assign(new Error("A reopen reason is required."), {
      status: 400,
    });
  const close = await DailyClose.findOne({ id });
  if (!close)
    throw Object.assign(new Error("Daily close not found."), { status: 404 });
  if (close.status === "reopened") return close;
  close.status = "reopened";
  close.reopenHistory = [
    ...(close.reopenHistory || []),
    {
      reopenedAt: new Date().toISOString(),
      reopenedByUserId: user.id || user._id?.toString?.() || "",
      reason: String(reason).trim(),
    },
  ];
  await close.save();
  return close;
};

export const reviewDailyClose = async ({ id, user }) => {
  if (user.role !== "owner") {
    throw Object.assign(
      new Error("Owner access is required to review a daily close."),
      { status: 403 },
    );
  }
  const close = await DailyClose.findOne({ id });
  if (!close) {
    throw Object.assign(new Error("Daily close not found."), { status: 404 });
  }
  if (close.status === "reopened") {
    throw Object.assign(
      new Error("Close the reopened reconciliation before reviewing it."),
      { status: 409 },
    );
  }
  close.reviewed = true;
  close.reviewedBy = user.name || user.email || "Owner";
  close.checkedBy = user.name || user.email || "Owner";
  await close.save();
  return close;
};

export const assertUniqueDailyClose = async (record, existingId = "") => {
  const duplicate = await DailyClose.findOne({
    branchId: record.branchId,
    date: record.date,
    currency: record.currency,
    paymentMethodId: record.paymentMethodId || null,
    id: { $ne: existingId || record.id || "" },
  });
  if (duplicate) {
    const error = new Error(
      "A daily close already exists for this branch, date, currency and payment method.",
    );
    error.status = 409;
    throw error;
  }
};

export const buildFinanceReport = async ({
  branchId = "",
  from = "0000-00-00",
  to = "9999-99-99",
} = {}) => {
  const [
    branches,
    tickets,
    visas,
    cargo,
    expenses,
    suppliers,
    payments,
    supplierPayments,
  ] = await Promise.all([
    Branch.find({}),
    Ticket.find({ saleDate: { $lte: to }, recordStatus: { $ne: "archived" } }),
    Visa.find({ appDate: { $lte: to }, recordStatus: { $ne: "archived" } }),
    Cargo.find({
      dateIn: { $lte: to },
      status: { $nin: ["cancelled", "Cancelled"] },
    }),
    Expense.find({
      date: { $gte: from, $lte: to },
      inProfitLoss: true,
      recordStatus: { $ne: "void" },
    }),
    Supplier.find({ date: { $lte: to }, recordStatus: { $ne: "cancelled" } }),
    Payment.find({ paymentDate: { $lte: to }, status: { $ne: "void" } }),
    SupplierPayment.find({
      paymentDate: { $lte: to },
      status: { $ne: "void" },
    }),
  ]);
  const branchNameById = new Map(
    branches.map((branch) => [branch._id.toString(), branch.name]),
  );
  const rows = new Map();
  const rowFor = (bid, currency) => {
    const key = `${bid}:${currency}`;
    if (!rows.has(key))
      rows.set(key, {
        branchId: String(bid || ""),
        branch: branchNameById.get(String(bid || "")) || "Unassigned",
        currency,
        customerCharges: 0,
        paymentsReceived: 0,
        profit: 0,
        revenue: 0,
        directCost: 0,
        grossProfit: 0,
        collections: 0,
        expenses: 0,
        outstanding: 0,
        supplierExposure: 0,
        services: { ticket: 0, visa: 0, cargo: 0 },
        serviceGrossProfit: { ticket: 0, visa: 0, cargo: 0 },
        serviceDetails: {},
        paymentMethods: {},
        paymentMethodDetails: {},
      });
    return rows.get(key);
  };
  const include = (bid) => !branchId || same(branchId, bid);
  const serviceDetailFor = (row, type) => {
    if (!row.serviceDetails[type])
      row.serviceDetails[type] = {
        transactions: 0,
        customerCharges: 0,
        paymentsReceived: 0,
        directCost: 0,
        profit: 0,
      };
    return row.serviceDetails[type];
  };
  const transactionsByKey = new Map();
  const paymentsByTransaction = new Map();
  for (const payment of payments) {
    const key = `${payment.transactionType}:${payment.transactionId}`;
    if (!paymentsByTransaction.has(key)) paymentsByTransaction.set(key, []);
    paymentsByTransaction.get(key).push(payment);
  }
  for (const [type, list] of [
    ["ticket", tickets],
    ["visa", visas],
    ["cargo", cargo],
  ]) {
    for (const item of list) {
      const bid = revenueBranchId(type, item);
      transactionsByKey.set(`${type}:${item.id}`, { type, item, branchId: bid });
      if (!include(bid)) continue;
      const total = totalFor(type, item);
      const direction = directionFor(type, item);
      const customerCharge = total * direction;
      const directCost = direction < 0 ? 0 : item.cost || 0;
      const transactionDate =
        type === "ticket"
          ? item.saleDate
          : type === "visa"
            ? item.appDate
            : item.dateIn;
      if (transactionDate >= from) {
        const row = rowFor(bid, item.currency);
        const detail = serviceDetailFor(row, type);
        row.customerCharges += customerCharge;
        row.directCost += directCost;
        row.services[type] += customerCharge;
        row.serviceGrossProfit[type] += customerCharge - directCost;
        // Unpaid portion of the charges raised in this period, so the figure
        // is scoped the same way as every other column in the row.
        row.outstanding += deriveCustomerFinanceSummary({
          totalCharge: customerCharge,
          payments: paymentsByTransaction.get(`${type}:${item.id}`) || [],
          asOf: to,
        }).accountsReceivable;
        detail.transactions += 1;
        detail.customerCharges += customerCharge;
        detail.directCost += directCost;
      }
    }
  }
  const transactionDirection = new Map([
    ...tickets.map((item) => [
      `ticket:${item.id}`,
      directionFor("ticket", item),
    ]),
    ...visas.map((item) => [`visa:${item.id}`, directionFor("visa", item)]),
    ...cargo.map((item) => [`cargo:${item.id}`, 1]),
  ]);
  for (const payment of payments) {
    if (payment.paymentDate < from) continue;
    const transactionKey = `${payment.transactionType}:${payment.transactionId}`;
    const transactionFlow = transactionDirection.get(transactionKey);
    const direction =
      transactionFlow === -1 ? -1 : payment.flow === "outbound" ? -1 : 1;
    const amount = (payment.amount || 0) * direction;
    const transaction = transactionsByKey.get(transactionKey);
    if (transaction && include(transaction.branchId)) {
      const serviceRow = rowFor(transaction.branchId, payment.currency);
      const serviceDetail = serviceDetailFor(
        serviceRow,
        payment.transactionType,
      );
      serviceRow.paymentsReceived += amount;
      serviceDetail.paymentsReceived += amount;
    }
    if (include(payment.branchId)) {
      const paymentRow = rowFor(payment.branchId, payment.currency);
      paymentRow.collections += amount;
      const method = payment.paymentMethod || "Unknown";
      paymentRow.paymentMethods[method] =
        (paymentRow.paymentMethods[method] || 0) + amount;
      const detail = paymentRow.paymentMethodDetails[method] || {
        transactions: 0,
        received: 0,
        refunds: 0,
        netReceived: 0,
      };
      detail.transactions += 1;
      if (direction < 0) detail.refunds += payment.amount || 0;
      else detail.received += payment.amount || 0;
      detail.netReceived += amount;
      paymentRow.paymentMethodDetails[method] = detail;
    }
  }
  for (const expense of expenses) {
    if (!include(expense.branchId)) continue;
    rowFor(expense.branchId, expense.currency).expenses += expense.amount || 0;
  }
  const paidBySupplierBill = new Map();
  for (const payment of supplierPayments) {
    paidBySupplierBill.set(
      payment.supplierBillId,
      moneyRound(
        (paidBySupplierBill.get(payment.supplierBillId) || 0) +
          (payment.amount || 0),
      ),
    );
  }
  for (const bill of suppliers) {
    if (bill.branchId && !include(bill.branchId)) continue;
    rowFor(bill.branchId, bill.currency).supplierExposure += Math.max(
      0,
      (bill.billed || 0) - (paidBySupplierBill.get(bill.id) || 0),
    );
  }
  return [...rows.values()].map((row) => ({
    ...row,
    customerCharges: moneyRound(row.customerCharges),
    paymentsReceived: moneyRound(row.paymentsReceived),
    // Profit is accrual based -- charges raised less the cost of delivering
    // them -- matching the "Charges less cost" label in the report and the
    // convention already used by the daily summary. `revenue` stays cash
    // based, so it keeps agreeing with `collections`.
    profit: moneyRound(row.customerCharges - row.directCost),
    revenue: moneyRound(row.paymentsReceived),
    directCost: moneyRound(row.directCost),
    grossProfit: moneyRound(row.customerCharges - row.directCost),
    serviceGrossProfit: Object.fromEntries(
      Object.entries(row.serviceGrossProfit).map(([service, value]) => [
        service,
        moneyRound(value),
      ]),
    ),
    collections: moneyRound(row.collections),
    expenses: moneyRound(row.expenses),
    outstanding: moneyRound(row.outstanding),
    supplierExposure: moneyRound(row.supplierExposure),
    serviceDetails: Object.fromEntries(
      Object.entries(row.serviceDetails).map(([service, detail]) => [
        service,
        {
          ...detail,
          customerCharges: moneyRound(detail.customerCharges),
          paymentsReceived: moneyRound(detail.paymentsReceived),
          directCost: moneyRound(detail.directCost),
          profit: moneyRound(detail.customerCharges - detail.directCost),
        },
      ]),
    ),
    paymentMethodDetails: Object.fromEntries(
      Object.entries(row.paymentMethodDetails).map(([method, detail]) => [
        method,
        {
          ...detail,
          received: moneyRound(detail.received),
          refunds: moneyRound(detail.refunds),
          netReceived: moneyRound(detail.netReceived),
        },
      ]),
    ),
  }));
};
