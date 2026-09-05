import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDailySummaryRows,
  businessDayState,
  zonedClock,
} from "../server/lib/dailySummary.js";

const branchId = "68b500000000000000000001";
const methodId = "68b500000000000000000002";
const settings = {
  timezone: "Africa/Mogadishu",
  businessDayStart: "07:00",
  businessDayEnd: "18:00",
};

const source = {
  settings,
  branches: [
    {
      _id: branchId,
      name: "Mogadishu Office",
      defaultCurrency: "USD",
      allowedCurrencies: ["USD"],
    },
  ],
  paymentMethods: [{ _id: methodId, name: "EVC Plus" }],
  branchPaymentMethods: [
    {
      branchId,
      paymentMethodId: methodId,
      allowedCurrencies: ["USD"],
      isActive: true,
      countsAsPhysicalCash: true,
    },
  ],
  tickets: [],
  visas: [],
  cargo: [],
  payments: [],
  expenses: [],
  suppliers: [],
  supplierPayments: [],
  startingBalances: [
    { branchId, paymentMethodId: methodId, currency: "USD", amount: 100 },
  ],
  previousSummaries: [],
};

test("Africa/Mogadishu business day observes configured 07:00-18:00 hours", () => {
  assert.deepEqual(
    zonedClock(new Date("2026-09-01T04:00:00.000Z"), settings.timezone),
    { date: "2026-09-01", minutes: 420 },
  );
  assert.equal(
    businessDayState({
      businessDate: "2026-09-01",
      now: new Date("2026-09-01T03:59:00.000Z"),
      ...settings,
    }),
    "scheduled",
  );
  assert.equal(
    businessDayState({
      businessDate: "2026-09-01",
      now: new Date("2026-09-01T04:00:00.000Z"),
      ...settings,
    }),
    "live",
  );
  assert.equal(
    businessDayState({
      businessDate: "2026-09-01",
      now: new Date("2026-09-01T15:00:00.000Z"),
      ...settings,
    }),
    "closed",
  );
});

test("daily summary separates revenue, cash, debt, payable, expense and profit", () => {
  const [row] = buildDailySummaryRows({
    ...source,
    businessDate: "2026-09-01",
    now: new Date("2026-09-01T10:00:00.000Z"),
    cargo: [
      {
        id: "cargo_1",
        tracking: "CGO-MOG-20260901-0001",
        originBranchId: branchId,
        dateIn: "2026-09-01",
        currency: "USD",
        weight: 10,
        rate: 20,
        cost: 80,
        status: "received",
      },
    ],
    payments: [
      {
        transactionType: "cargo",
        transactionId: "cargo_1",
        branchId,
        paymentMethodId: methodId,
        paymentDate: "2026-09-01",
        currency: "USD",
        amount: 120,
        flow: "inbound",
        status: "active",
      },
    ],
    expenses: [
      {
        id: "expense_1",
        branchId,
        paymentMethodId: methodId,
        date: "2026-09-01",
        currency: "USD",
        amount: 20,
        category: "Transport",
        recordStatus: "active",
      },
    ],
    suppliers: [
      {
        id: "payable_1",
        branchId,
        date: "2026-09-01",
        currency: "USD",
        billed: 40,
        recordStatus: "active",
      },
    ],
  });

  assert.equal(row.openingBalance, 100);
  assert.equal(row.revenue, 200);
  assert.equal(row.moneyReceived, 120);
  assert.equal(row.accountsReceivable, 80);
  assert.equal(row.directCost, 80);
  assert.equal(row.profit, 120);
  assert.equal(row.expenses, 20);
  assert.equal(row.accountsPayable, 40);
  // Cash actually in the drawer at close: opening 100, plus the 120
  // collected, less the 20 spent. The 80 still owed to us is not here yet
  // and the 40 we owe has not left yet.
  assert.equal(row.closedAmount, 200);
  // What the branch is projected to hold once both sides settle: that 80
  // comes in and that 40 goes out.
  assert.equal(row.expectedClosing, 240);
});

test("previous physical closing becomes next business day opening", () => {
  const [row] = buildDailySummaryRows({
    ...source,
    businessDate: "2026-09-01",
    now: new Date("2026-09-01T10:00:00.000Z"),
    previousSummaries: [
      {
        branchId,
        currency: "USD",
        businessDate: "2026-08-31",
        paymentsByMethod: [{ paymentMethodId: methodId, closing: 500 }],
      },
    ],
  });

  assert.equal(row.openingBalance, 500);
  assert.equal(row.expectedClosing, 500);
  assert.equal(row.paymentsByMethod[0].opening, 500);
});

test("non-cash methods do not carry a next-day opening balance", () => {
  const [row] = buildDailySummaryRows({
    ...source,
    branchPaymentMethods: [
      { ...source.branchPaymentMethods[0], countsAsPhysicalCash: false },
    ],
    businessDate: "2026-09-01",
    now: new Date("2026-09-01T10:00:00.000Z"),
    previousSummaries: [
      {
        branchId,
        currency: "USD",
        businessDate: "2026-08-31",
        paymentsByMethod: [{ paymentMethodId: methodId, closing: 500 }],
      },
    ],
  });

  assert.equal(row.openingBalance, 0);
  assert.equal(row.paymentsByMethod[0].opening, 0);
});
