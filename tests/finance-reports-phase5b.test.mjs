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
import {
  buildFinanceReport,
  deriveCustomerFinanceSummary,
} from "../server/lib/finance.js";

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
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "KES").customerCharges, 10000);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "KES").paymentsReceived, 3000);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "USD").customerCharges, 100);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "USD").paymentsReceived, 50);
    assert.equal(all.find((row) => row.branchId === mog && row.currency === "USD").customerCharges, 200);
    assert.equal(all.find((row) => row.branchId === mog && row.currency === "USD").paymentsReceived, 100);
    assert.equal(all.find((row) => row.branchId === hga && row.currency === "USD").customerCharges, 75);
    assert.equal(all.find((row) => row.branchId === hga && row.currency === "USD").paymentsReceived, 0);
    assert.equal(all.find((row) => row.branchId === nbo && row.currency === "KES").paymentMethods["M-Pesa"], 2000);
    assert.equal(all.find((row) => row.branchId === mog && row.currency === "USD").paymentMethods["EVC Plus"], 100);
  });
});

test("phase 5b report excludes branch currency rows with zero activity", async () => {
  await withReportMocks({}, async () => {
    const all = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    assert.deepEqual(all, []);

    const nairobi = await buildFinanceReport({ branchId: nbo, from: "2026-08-01", to: "2026-08-31" });
    assert.deepEqual(nairobi, []);

    const mogadishu = await buildFinanceReport({ branchId: mog, from: "2026-08-01", to: "2026-08-31" });
    assert.deepEqual(mogadishu, []);
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
    assert.equal(rows.length, 1);
    assert.equal(kes.branchId, nbo);
    assert.equal(kes.customerCharges, 10000);
    assert.equal(kes.paymentsReceived, 1000);
    assert.equal(kes.collections, 1000);
    assert.equal(usd, undefined);
  });
});

test("cargo revenue stays with the origin branch while collection stays with the receiving branch", async () => {
  await withReportMocks({
    cargo: [
      doc({
        id: "cargo-collect",
        originBranchId: nbo,
        paidByBranchId: mog,
        dateIn: "2026-08-15",
        currency: "USD",
        weight: 10,
        rate: 20,
        cost: 120,
        status: "delivered",
      }),
    ],
    payments: [
      doc({
        transactionType: "cargo",
        transactionId: "cargo-collect",
        branchId: mog,
        paymentDate: "2026-08-20",
        currency: "USD",
        paymentMethod: "EVC Plus",
        amount: 200,
        status: "active",
      }),
    ],
  }, async () => {
    const rows = await buildFinanceReport({ from: "2026-08-01", to: "2026-08-31" });
    const nairobi = rows.find((row) => row.branchId === nbo && row.currency === "USD");
    const mogadishu = rows.find((row) => row.branchId === mog && row.currency === "USD");
    assert.equal(nairobi.revenue, 200);
    assert.equal(nairobi.directCost, 120);
    assert.equal(nairobi.grossProfit, 80);
    assert.equal(nairobi.outstanding, 0);
    assert.deepEqual(nairobi.serviceDetails.cargo, {
      transactions: 1,
      customerCharges: 200,
      paymentsReceived: 200,
      directCost: 120,
      profit: 80,
    });
    assert.equal(mogadishu.revenue, 0);
    assert.equal(mogadishu.collections, 200);
    assert.deepEqual(mogadishu.paymentMethodDetails["EVC Plus"], {
      transactions: 1,
      received: 200,
      refunds: 0,
      netReceived: 200,
    });
  });
});

test("service performance follows partial cargo payments without duplicating accounts receivable", async () => {
  const payments = [
    doc({
      transactionType: "cargo",
      transactionId: "cargo-a",
      branchId: mog,
      paymentDate: "2026-08-31",
      currency: "USD",
      paymentMethod: "EVC Plus",
      amount: 24,
      status: "active",
    }),
  ];
  await withReportMocks({
    cargo: [
      doc({
        id: "cargo-a",
        originBranchId: mog,
        dateIn: "2026-08-31",
        currency: "USD",
        weight: 1,
        rate: 24,
        cost: 0,
        status: "received",
      }),
      doc({
        id: "cargo-b",
        originBranchId: mog,
        dateIn: "2026-08-31",
        currency: "USD",
        weight: 1,
        rate: 42,
        cost: 0,
        status: "received",
      }),
    ],
    payments,
  }, async () => {
    const servicePerformance = async () => {
      const rows = await buildFinanceReport({
        branchId: mog,
        from: "2026-08-01",
        to: "2026-08-31",
      });
      assert.equal(rows.length, 1);
      assert.deepEqual(Object.keys(rows[0].serviceDetails), ["cargo"]);
      return rows[0].serviceDetails.cargo;
    };
    const cargoBReceivable = () =>
      deriveCustomerFinanceSummary({
        totalCharge: 42,
        payments: payments.filter(
          (payment) => payment.transactionId === "cargo-b",
        ),
        asOf: "2026-08-31",
      }).accountsReceivable;

    assert.deepEqual(await servicePerformance(), {
      transactions: 2,
      customerCharges: 66,
      paymentsReceived: 24,
      directCost: 0,
      profit: 66,
    });
    assert.equal(cargoBReceivable(), 42);

    payments.push(doc({
      transactionType: "cargo",
      transactionId: "cargo-b",
      branchId: mog,
      paymentDate: "2026-08-31",
      currency: "USD",
      paymentMethod: "EVC Plus",
      amount: 20,
      status: "active",
    }));
    assert.equal((await servicePerformance()).paymentsReceived, 44);
    assert.equal((await servicePerformance()).profit, 66);
    assert.equal(cargoBReceivable(), 22);

    payments.push(doc({
      transactionType: "cargo",
      transactionId: "cargo-b",
      branchId: mog,
      paymentDate: "2026-08-31",
      currency: "USD",
      paymentMethod: "EVC Plus",
      amount: 22,
      status: "active",
    }));
    assert.equal((await servicePerformance()).paymentsReceived, 66);
    assert.equal((await servicePerformance()).profit, 66);
    assert.equal(cargoBReceivable(), 0);
  });
});

test("service charges and later ledger payments stay in their actual months", async () => {
  await withReportMocks({
    cargo: [
      doc({
        id: "cargo-cross-month",
        originBranchId: mog,
        dateIn: "2026-08-31",
        currency: "USD",
        weight: 1,
        rate: 24,
        cost: 0,
        status: "received",
      }),
    ],
    payments: [
      doc({
        transactionType: "cargo",
        transactionId: "cargo-cross-month",
        branchId: mog,
        paymentDate: "2026-09-05",
        currency: "USD",
        paymentMethod: "EVC Plus",
        amount: 24,
        status: "active",
      }),
    ],
  }, async () => {
    const august = await buildFinanceReport({
      branchId: mog,
      from: "2026-08-01",
      to: "2026-08-31",
    });
    assert.deepEqual(august[0].serviceDetails.cargo, {
      transactions: 1,
      customerCharges: 24,
      paymentsReceived: 0,
      directCost: 0,
      profit: 24,
    });

    const september = await buildFinanceReport({
      branchId: mog,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    assert.deepEqual(september[0].serviceDetails.cargo, {
      transactions: 0,
      customerCharges: 0,
      paymentsReceived: 24,
      directCost: 0,
      profit: 0,
    });
  });
});

test("payment method detail separates refunds from receipts and reports net received", async () => {
  await withReportMocks({
    visas: [
      doc({ id: "sale", type: "Sale", branchId: mog, appDate: "2026-08-12", currency: "USD", amount: 300, cost: 200 }),
      doc({ id: "refund", type: "Refund", branchId: mog, appDate: "2026-08-16", currency: "USD", amount: 100, cost: 0 }),
    ],
    payments: [
      doc({ transactionType: "visa", transactionId: "sale", branchId: mog, paymentDate: "2026-08-12", currency: "USD", paymentMethod: "EVC Plus", amount: 300, status: "active" }),
      doc({ transactionType: "visa", transactionId: "refund", branchId: mog, paymentDate: "2026-08-16", currency: "USD", paymentMethod: "EVC Plus", amount: 100, status: "active", flow: "outbound" }),
    ],
  }, async () => {
    const rows = await buildFinanceReport({ branchId: mog, from: "2026-08-01", to: "2026-08-31" });
    const usd = rows.find((row) => row.currency === "USD");
    assert.equal(usd.revenue, 200);
    assert.equal(usd.grossProfit, 0);
    assert.equal(usd.collections, 200);
    assert.deepEqual(usd.paymentMethodDetails["EVC Plus"], {
      transactions: 2,
      received: 300,
      refunds: 100,
      netReceived: 200,
    });
  });
});
