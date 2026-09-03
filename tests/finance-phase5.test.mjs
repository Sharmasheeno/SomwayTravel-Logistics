import assert from "node:assert/strict";
import test from "node:test";

import Branch from "../server/models/Branch.js";
import BranchPaymentMethod from "../server/models/BranchPaymentMethod.js";
import Cargo from "../server/models/Cargo.js";
import Expense from "../server/models/Expense.js";
import Payment from "../server/models/Payment.js";
import PaymentMethod from "../server/models/PaymentMethod.js";
import StartingBalance from "../server/models/StartingBalance.js";
import Supplier from "../server/models/Supplier.js";
import SupplierPayment from "../server/models/SupplierPayment.js";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";
import { assertBranchCurrency, assertBranchPaymentMethod, buildFinanceReport, closeMetrics, createCustomerPayment, createSupplierPayment, customerFinanceSummary, supplierFinanceSummary } from "../server/lib/finance.js";

const nbo = "68b500000000000000000001";
const mog = "68b500000000000000000002";
const hga = "68b500000000000000000003";
const owner = { id: "owner", name: "Owner", role: "owner" };
const nboOperator = { id: "op-nbo", role: "operator", assignedBranchId: nbo };
const methods = {
  cash: { _id: "pm-cash", id: "pm-cash", name: "Cash", code: "cash", isActive: true },
  mpesa: { _id: "pm-mpesa", id: "pm-mpesa", name: "M-Pesa", code: "mpesa", isActive: true },
  bank: { _id: "pm-bank", id: "pm-bank", name: "Bank", code: "bank", isActive: true },
  evc: { _id: "pm-evc", id: "pm-evc", name: "EVC Plus", code: "evc_plus", isActive: true },
};

const doc = (record) => ({ ...record, toObject() { return { ...record }; }, async save() { return this; } });

const withFinanceMocks = async (state, fn) => {
  const originals = {
    branchFindById: Branch.findById,
    branchFindOne: Branch.findOne,
    branchFind: Branch.find,
    bpmFindOne: BranchPaymentMethod.findOne,
    methodFindOne: PaymentMethod.findOne,
    methodFindById: PaymentMethod.findById,
    ticketFindOne: Ticket.findOne,
    ticketFind: Ticket.find,
    visaFindOne: Visa.findOne,
    visaFind: Visa.find,
    cargoFind: Cargo.find,
    expenseFind: Expense.find,
    paymentFind: Payment.find,
    paymentCreate: Payment.create,
    supplierFindOne: Supplier.findOne,
    supplierFind: Supplier.find,
    supplierPaymentFind: SupplierPayment.find,
    supplierPaymentCreate: SupplierPayment.create,
    startingBalanceFindOne: StartingBalance.findOne,
  };
  const branches = state.branches || [
    doc({ _id: nbo, name: "Nairobi Office", code: "NBO", defaultCurrency: "KES", allowedCurrencies: ["KES", "USD"], isActive: true }),
    doc({ _id: mog, name: "Mogadishu Office", code: "MOG", defaultCurrency: "USD", allowedCurrencies: ["USD"], isActive: true }),
    doc({ _id: hga, name: "Hargeisa Office", code: "HGA", defaultCurrency: "USD", allowedCurrencies: ["USD"], isActive: true }),
  ];
  const payments = state.payments || [];
  const supplierPayments = state.supplierPayments || [];
  Branch.findById = async (id) => branches.find((branch) => String(branch._id) === String(id)) || null;
  Branch.findOne = async (query) => branches.find((branch) => (!query._id || String(branch._id) === String(query._id)) && (query.isActive === undefined || branch.isActive === query.isActive)) || null;
  Branch.find = async () => branches;
  PaymentMethod.findOne = async (query) => Object.values(methods).find((method) => method.code === query?.code || query?.$or?.some((item) => item.code === method.code || item.name === method.name)) || null;
  PaymentMethod.findById = async (id) => Object.values(methods).find((method) => String(method._id) === String(id)) || null;
  BranchPaymentMethod.findOne = async (query) => (state.branchPaymentMethods || []).find((config) => String(config.branchId) === String(query.branchId) && String(config.paymentMethodId) === String(query.paymentMethodId) && config.isActive !== false) || null;
  Ticket.findOne = async (query) => (state.tickets || []).find((row) => row.id === query.id) || null;
  Ticket.find = async () => state.tickets || [];
  Visa.findOne = async (query) => (state.visas || []).find((row) => row.id === query.id) || null;
  Visa.find = async () => state.visas || [];
  Cargo.find = async () => state.cargo || [];
  Expense.find = async (query = {}) => (state.expenses || []).filter((row) => (!query.branchId || String(row.branchId) === String(query.branchId)) && (!query.currency || row.currency === query.currency) && (!query.paymentMethodId || String(row.paymentMethodId) === String(query.paymentMethodId)) && (!query.date || row.date === query.date) && (query.paid === undefined || row.paid === query.paid));
  Payment.find = async (query = {}) => payments.filter((row) => {
    const paymentDateMatches = !query.paymentDate
      || (typeof query.paymentDate === "string" && row.paymentDate === query.paymentDate)
      || (typeof query.paymentDate === "object"
        && (!query.paymentDate.$gte || row.paymentDate >= query.paymentDate.$gte)
        && (!query.paymentDate.$lte || row.paymentDate <= query.paymentDate.$lte));
    return (!query.transactionType || row.transactionType === query.transactionType)
      && (!query.transactionId || row.transactionId === query.transactionId)
      && (!query.branchId || String(row.branchId) === String(query.branchId))
      && (!query.currency || row.currency === query.currency)
      && (!query.paymentMethodId || String(row.paymentMethodId) === String(query.paymentMethodId))
      && paymentDateMatches
      && (!query.status?.$ne || row.status !== query.status.$ne);
  });
  Payment.create = async (record) => { payments.push(doc({ ...record, status: record.status || "active" })); return payments.at(-1); };
  Supplier.findOne = async (query) => (state.suppliers || []).find((row) => row.id === query.id) || null;
  Supplier.find = async () => state.suppliers || [];
  SupplierPayment.find = async (query = {}) => supplierPayments.filter((row) => (!query.supplierBillId || row.supplierBillId === query.supplierBillId) && (!query.status?.$ne || row.status !== query.status.$ne));
  SupplierPayment.create = async (record) => { supplierPayments.push(doc({ ...record, status: record.status || "active" })); return supplierPayments.at(-1); };
  StartingBalance.findOne = async (query) => (state.startingBalances || []).find((row) => String(row.branchId) === String(query.branchId) && row.currency === query.currency && String(row.paymentMethodId) === String(query.paymentMethodId)) || null;
  try {
    await fn({ payments, supplierPayments });
  } finally {
    Branch.findById = originals.branchFindById;
    Branch.findOne = originals.branchFindOne;
    Branch.find = originals.branchFind;
    BranchPaymentMethod.findOne = originals.bpmFindOne;
    PaymentMethod.findOne = originals.methodFindOne;
    PaymentMethod.findById = originals.methodFindById;
    Ticket.findOne = originals.ticketFindOne;
    Ticket.find = originals.ticketFind;
    Visa.findOne = originals.visaFindOne;
    Visa.find = originals.visaFind;
    Cargo.find = originals.cargoFind;
    Expense.find = originals.expenseFind;
    Payment.find = originals.paymentFind;
    Payment.create = originals.paymentCreate;
    Supplier.findOne = originals.supplierFindOne;
    Supplier.find = originals.supplierFind;
    SupplierPayment.find = originals.supplierPaymentFind;
    SupplierPayment.create = originals.supplierPaymentCreate;
    StartingBalance.findOne = originals.startingBalanceFindOne;
  }
};

const config = [
  { branchId: nbo, paymentMethodId: methods.cash._id, allowedCurrencies: ["KES", "USD"], isActive: true },
  { branchId: nbo, paymentMethodId: methods.mpesa._id, allowedCurrencies: ["KES"], isActive: true },
  { branchId: nbo, paymentMethodId: methods.bank._id, allowedCurrencies: ["KES", "USD"], isActive: true },
  { branchId: mog, paymentMethodId: methods.cash._id, allowedCurrencies: ["USD"], isActive: true },
  { branchId: mog, paymentMethodId: methods.evc._id, allowedCurrencies: ["USD"], isActive: true },
];

test("branch currencies enforce Nairobi KES/USD and reject Mogadishu KES", async () => {
  await withFinanceMocks({ branchPaymentMethods: config }, async () => {
    await assertBranchCurrency(nbo, "KES");
    await assertBranchCurrency(nbo, "USD");
    await assertBranchCurrency(mog, "USD");
    await assert.rejects(() => assertBranchCurrency(mog, "KES"), /currency is not enabled/);
  });
});

test("payment methods vary by branch and currency", async () => {
  await withFinanceMocks({ branchPaymentMethods: config }, async () => {
    await assertBranchPaymentMethod({ branchId: nbo, currency: "KES", paymentMethod: "M-Pesa" });
    await assert.rejects(() => assertBranchPaymentMethod({ branchId: nbo, currency: "USD", paymentMethod: "M-Pesa" }), /payment method is not enabled/);
    await assertBranchPaymentMethod({ branchId: mog, currency: "USD", paymentMethod: "EVC Plus" });
  });
});

test("customer payment ledger derives partial and paid states and blocks overpayment", async () => {
  await withFinanceMocks({ branchPaymentMethods: config, tickets: [doc({ id: "t1", branchId: nbo, currency: "KES", amount: 20000, clientId: null })] }, async ({ payments }) => {
    await createCustomerPayment({ transactionType: "ticket", transactionId: "t1", amount: 5000, paymentMethod: "Cash", paymentDate: "2026-08-31", user: nboOperator });
    assert.equal((await customerFinanceSummary("ticket", { id: "t1", amount: 20000 })).paymentStatus, "partial");
    assert.equal((await customerFinanceSummary("ticket", { id: "t1", amount: 20000 })).balance, 15000);
    await assert.rejects(() => createCustomerPayment({ transactionType: "ticket", transactionId: "t1", amount: 21000, paymentMethod: "Cash", paymentDate: "2026-08-31", user: nboOperator }), /exceeds/);
    await createCustomerPayment({ transactionType: "ticket", transactionId: "t1", amount: 15000, paymentMethod: "Cash", paymentDate: "2026-08-31", user: nboOperator });
    const summary = await customerFinanceSummary("ticket", { id: "t1", amount: 20000 });
    assert.equal(summary.amountPaid, 20000);
    assert.equal(summary.balance, 0);
    assert.equal(summary.paymentStatus, "paid");
    assert.equal(payments.length, 2);
  });
});

test("refund payments are stored as outbound cash movements", async () => {
  await withFinanceMocks({
    branchPaymentMethods: config,
    visas: [doc({ id: "refund-payment", type: "Refund", branchId: mog, currency: "USD", amount: 150, clientId: null })],
  }, async ({ payments }) => {
    await createCustomerPayment({ transactionType: "visa", transactionId: "refund-payment", amount: 150, paymentMethod: "EVC Plus", paymentDate: "2026-08-31", user: owner });
    assert.equal(payments.length, 1);
    assert.equal(payments[0].flow, "outbound");
  });
});

test("daily close separates branch currency and payment method", async () => {
  await withFinanceMocks({
    branchPaymentMethods: config,
    startingBalances: [{ branchId: nbo, currency: "KES", paymentMethodId: methods.cash._id, amount: 1000 }],
    payments: [
      doc({ branchId: nbo, currency: "KES", paymentMethodId: methods.cash._id, amount: 5000, paymentDate: "2026-08-31", status: "active" }),
      doc({ branchId: nbo, currency: "KES", paymentMethodId: methods.mpesa._id, amount: 3000, paymentDate: "2026-08-31", status: "active" }),
      doc({ branchId: mog, currency: "USD", paymentMethodId: methods.cash._id, amount: 200, paymentDate: "2026-08-31", status: "active" }),
    ],
    expenses: [doc({ branchId: nbo, currency: "KES", paymentMethodId: methods.cash._id, amount: 500, date: "2026-08-31", paid: true })],
  }, async () => {
    assert.deepEqual(await closeMetrics({ branchId: nbo, currency: "KES", paymentMethodId: methods.cash._id, date: "2026-08-31" }), { opening: 1000, collections: 5000, expenses: 500, should: 5500 });
    assert.equal((await closeMetrics({ branchId: nbo, currency: "KES", paymentMethodId: methods.mpesa._id, date: "2026-08-31" })).collections, 3000);
    assert.equal((await closeMetrics({ branchId: nbo, currency: "USD", paymentMethodId: methods.cash._id, date: "2026-08-31" })).collections, 0);
  });
});

test("supplier payment ledger derives outstanding balance", async () => {
  await withFinanceMocks({ branchPaymentMethods: config, suppliers: [doc({ id: "s1", supplier: "Airline", branchId: nbo, currency: "USD", billed: 1000 })] }, async () => {
    await createSupplierPayment({ supplierBillId: "s1", amount: 400, paymentMethod: "Cash", paymentDate: "2026-08-31", user: owner });
    assert.equal((await supplierFinanceSummary({ id: "s1", billed: 1000 })).outstanding, 600);
    await createSupplierPayment({ supplierBillId: "s1", amount: 600, paymentMethod: "Cash", paymentDate: "2026-08-31", user: owner });
    assert.equal((await supplierFinanceSummary({ id: "s1", billed: 1000 })).paymentStatus, "paid");
  });
});

test("reports keep Nairobi USD separate from Mogadishu USD while allowing consolidated reading", async () => {
  await withFinanceMocks({
    branchPaymentMethods: config,
    tickets: [doc({ id: "nbo-usd", branchId: nbo, saleDate: "2026-08-31", currency: "USD", amount: 100, cost: 60 }), doc({ id: "mog-usd", branchId: mog, saleDate: "2026-08-31", currency: "USD", amount: 200, cost: 120 })],
    payments: [doc({ transactionType: "ticket", transactionId: "nbo-usd", branchId: nbo, currency: "USD", amount: 100, paymentDate: "2026-08-31", paymentMethod: "Cash", status: "active" }), doc({ transactionType: "ticket", transactionId: "mog-usd", branchId: mog, currency: "USD", amount: 200, paymentDate: "2026-08-31", paymentMethod: "Cash", status: "active" })],
  }, async () => {
    const nboRows = await buildFinanceReport({ branchId: nbo, from: "2026-08-01", to: "2026-08-31" });
    const mogRows = await buildFinanceReport({ branchId: mog, from: "2026-08-01", to: "2026-08-31" });
    const allRows = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    assert.equal(nboRows.find((row) => row.currency === "USD").revenue, 100);
    assert.equal(mogRows.find((row) => row.currency === "USD").revenue, 200);
    assert.deepEqual(allRows.map((row) => [row.branchId, row.currency, row.revenue]).sort(), [[nbo, "USD", 100], [mog, "USD", 200]]);
    assert.equal(allRows.reduce((sum, row) => row.currency === "USD" ? sum + row.revenue : sum, 0), 300);
  });
});

test("refunds reduce revenue, profit and collections without creating customer debt", async () => {
  await withFinanceMocks({
    branchPaymentMethods: config,
    visas: [doc({ id: "refund-visa", type: "Refund", branchId: mog, appDate: "2026-08-31", currency: "USD", amount: 150, cost: 200 })],
    payments: [doc({ transactionType: "visa", transactionId: "refund-visa", branchId: mog, currency: "USD", amount: 150, paymentDate: "2026-08-31", paymentMethod: "EVC Plus", status: "active" })],
  }, async () => {
    const rows = await buildFinanceReport({ branchId: mog, from: "2026-08-01", to: "2026-08-31" });
    const usd = rows.find((row) => row.currency === "USD");
    assert.equal(usd.revenue, -150);
    assert.equal(usd.directCost, 0);
    assert.equal(usd.grossProfit, -150);
    assert.equal(usd.collections, -150);
    assert.equal(usd.outstanding, 0);
  });
});
