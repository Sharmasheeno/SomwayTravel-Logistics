import assert from "node:assert/strict";
import test from "node:test";

import Branch from "../server/models/Branch.js";
import Cargo from "../server/models/Cargo.js";
import Expense from "../server/models/Expense.js";
import Payment from "../server/models/Payment.js";
import Supplier from "../server/models/Supplier.js";
import SupplierPayment from "../server/models/SupplierPayment.js";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";
import { buildFinanceReport } from "../server/lib/finance.js";

const nbo = "68b500000000000000000001";
const mog = "68b500000000000000000002";
const hga = "68b500000000000000000003";
const doc = (record) => ({ ...record, toObject() { return { ...record }; } });

const withReportMocks = async (state, fn) => {
  const originals = { branchFind: Branch.find, ticketFind: Ticket.find, visaFind: Visa.find, cargoFind: Cargo.find, expenseFind: Expense.find, supplierFind: Supplier.find, paymentFind: Payment.find, supplierPaymentFind: SupplierPayment.find };
  const inDateRange = (field, query, row) => !query[field] || ((!query[field].$gte || row[field] >= query[field].$gte) && (!query[field].$lte || row[field] <= query[field].$lte));
  Branch.find = async () => [
    doc({ _id: nbo, name: "Nairobi Office", code: "NBO", defaultCurrency: "KES", allowedCurrencies: ["KES", "USD"], isActive: true }),
    doc({ _id: mog, name: "Mogadishu Office", code: "MOG", defaultCurrency: "USD", allowedCurrencies: ["USD"], isActive: true }),
    doc({ _id: hga, name: "Hargeisa Office", code: "HGA", defaultCurrency: "USD", allowedCurrencies: ["USD"], isActive: true }),
  ];
  Ticket.find = async (query = {}) => (state.tickets || []).filter((row) => inDateRange("saleDate", query, row));
  Visa.find = async (query = {}) => (state.visas || []).filter((row) => inDateRange("appDate", query, row));
  Cargo.find = async (query = {}) => (state.cargo || []).filter((row) => inDateRange("dateIn", query, row));
  Expense.find = async (query = {}) => (state.expenses || []).filter((row) => inDateRange("date", query, row) && (query.inProfitLoss === undefined || row.inProfitLoss === query.inProfitLoss));
  Supplier.find = async (query = {}) => (state.suppliers || []).filter((row) => inDateRange("date", query, row));
  Payment.find = async (query = {}) => (state.payments || []).filter((row) => inDateRange("paymentDate", query, row) && (!query.status?.$ne || row.status !== query.status.$ne) && (!query.transactionType || row.transactionType === query.transactionType) && (!query.transactionId || row.transactionId === query.transactionId));
  SupplierPayment.find = async (query = {}) => (state.supplierPayments || []).filter((row) => inDateRange("paymentDate", query, row) && (!query.status?.$ne || row.status !== query.status.$ne) && (!query.supplierBillId || row.supplierBillId === query.supplierBillId));
  try { await fn(); } finally {
    Branch.find = originals.branchFind;
    Ticket.find = originals.ticketFind;
    Visa.find = originals.visaFind;
    Cargo.find = originals.cargoFind;
    Expense.find = originals.expenseFind;
    Supplier.find = originals.supplierFind;
    Payment.find = originals.paymentFind;
    SupplierPayment.find = originals.supplierPaymentFind;
  }
};

test("phase 5b report separates Nairobi KES, Nairobi USD, Mogadishu USD and future Hargeisa USD", async () => {
  await withReportMocks({
    tickets: [
      doc({ id: "nbo-kes", branchId: nbo, saleDate: "2026-08-15", currency: "KES", amount: 10000, cost: 7000 }),
      doc({ id: "mog-usd", branchId: mog, saleDate: "2026-08-15", currency: "USD", amount: 200, cost: 120 }),
      doc({ id: "hga-usd", branchId: hga, saleDate: "2026-08-15", currency: "USD", amount: 75, cost: 50 }),
    ],
    visas: [doc({ id: "nbo-visa-usd", branchId: nbo, appDate: "2026-08-15", currency: "USD", amount: 100, cost: 40 })],
    payments: [
      doc({ transactionType: "ticket", transactionId: "nbo-kes", branchId: nbo, paymentDate: "2026-08-15", currency: "KES", paymentMethod: "Cash", amount: 1000, status: "active" }),
      doc({ transactionType: "ticket", transactionId: "nbo-kes", branchId: nbo, paymentDate: "2026-08-15", currency: "KES", paymentMethod: "M-Pesa", amount: 2000, status: "active" }),
      doc({ transactionType: "visa", transactionId: "nbo-visa-usd", branchId: nbo, paymentDate: "2026-08-15", currency: "USD", paymentMethod: "Cash", amount: 50, status: "active" }),
      doc({ transactionType: "ticket", transactionId: "mog-usd", branchId: mog, paymentDate: "2026-08-15", currency: "USD", paymentMethod: "EVC Plus", amount: 100, status: "active" }),
    ],
  }, async () => {
    const all = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "KES").revenue, 10000);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "USD").revenue, 100);
    assert.equal(all.find((row) => row.branchId === mog && row.currency === "USD").revenue, 200);
    assert.equal(all.find((row) => row.branchId === hga && row.currency === "USD").revenue, 75);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "KES").paymentMethods["M-Pesa"], 2000);
    assert.equal(all.find((row) => row.branchId === mog && row.currency === "USD").paymentMethods["EVC Plus"], 100);
  });
});

test("phase 5b report includes active branch currency rows with zero activity", async () => {
  await withReportMocks({}, async () => {
    const all = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    const keys = all.map((row) => `${row.branch}:${row.currency}`).sort();
    assert.deepEqual(keys, [
      "Hargeisa Office:USD",
      "Mogadishu Office:USD",
      "Nairobi Office:KES",
      "Nairobi Office:USD",
    ]);
    assert.ok(all.every((row) => row.revenue === 0 && row.collections === 0 && row.grossProfit === 0));

    const nairobi = await buildFinanceReport({ branchId: nbo, from: "2026-08-01", to: "2026-08-31" });
    assert.deepEqual(nairobi.map((row) => row.currency).sort(), ["KES", "USD"]);

    const mogadishu = await buildFinanceReport({ branchId: mog, from: "2026-08-01", to: "2026-08-31" });
    assert.deepEqual(mogadishu.map((row) => row.currency), ["USD"]);
  });
});

test("legacy supplier payments do not create an unassigned report row", async () => {
  await withReportMocks({
    supplierPayments: [
      doc({ id: "legacy-payment", supplierBillId: "missing-bill", branchId: null, paymentDate: "2026-08-15", currency: "USD", amount: 50, status: "active" }),
    ],
  }, async () => {
    const rows = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    assert.equal(rows.some((row) => row.branch === "Unassigned" || !row.branchId), false);
  });
});

test("phase 5b branch and date filters are applied by the backend report helper", async () => {
  await withReportMocks({
    tickets: [
      doc({ id: "inside", branchId: nbo, saleDate: "2026-08-15", currency: "KES", amount: 10000, cost: 5000 }),
      doc({ id: "outside-date", branchId: nbo, saleDate: "2026-07-15", currency: "KES", amount: 999, cost: 0 }),
      doc({ id: "outside-branch", branchId: mog, saleDate: "2026-08-15", currency: "USD", amount: 200, cost: 0 }),
    ],
    payments: [doc({ transactionType: "ticket", transactionId: "inside", branchId: nbo, paymentDate: "2026-08-15", currency: "KES", paymentMethod: "Cash", amount: 1000, status: "active" })],
  }, async () => {
    const rows = await buildFinanceReport({ branchId: nbo, from: "2026-08-01", to: "2026-08-31" });
    const kes = rows.find((row) => row.currency === "KES");
    const usd = rows.find((row) => row.currency === "USD");
    assert.equal(rows.length, 2);
    assert.equal(kes.branchId, nbo);
    assert.equal(kes.revenue, 10000);
    assert.equal(kes.collections, 1000);
    assert.equal(usd.revenue, 0);
  });
});
