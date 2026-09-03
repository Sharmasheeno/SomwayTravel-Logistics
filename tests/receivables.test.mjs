import assert from "node:assert/strict";
import test from "node:test";

import {
  agingBucket,
  deriveReceivables,
  filterReceivables,
  getAccountsReceivableSummary,
  listReceivables,
  summarizeReceivables,
} from "../server/lib/receivables.js";
import { deriveCustomerFinanceSummary } from "../server/lib/finance.js";
import Branch from "../server/models/Branch.js";
import Cargo from "../server/models/Cargo.js";
import Client from "../server/models/Client.js";
import Payment from "../server/models/Payment.js";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";

const branchId = "68b500000000000000000001";
const clientId = "68b500000000000000000002";
const base = {
  tickets: [],
  cargo: [],
  visas: [],
  payments: [],
  clients: [{ _id: clientId, name: "Amina Ali" }],
  branches: [{ _id: branchId, name: "Mogadishu Office" }],
  asOf: "2026-09-01",
};

const payment = (amount, overrides = {}) => ({
  amount,
  flow: "inbound",
  status: "active",
  paymentDate: "2026-09-01",
  ...overrides,
});

test("unpaid summary keeps the full charge in accounts receivable", () => {
  assert.deepEqual(
    deriveCustomerFinanceSummary({ totalCharge: 24, payments: [] }),
    {
      totalCharge: 24,
      totalPaid: 0,
      balanceDue: 24,
      accountsReceivable: 24,
      paymentStatus: "unpaid",
    },
  );
});

test("partial summary derives USD 14 due after a USD 10 payment", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(10)],
  });
  assert.equal(summary.totalPaid, 10);
  assert.equal(summary.balanceDue, 14);
  assert.equal(summary.accountsReceivable, 14);
  assert.equal(summary.paymentStatus, "partial");
});

test("multiple partial payments are summed instead of replaced", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(10), payment(5)],
  });
  assert.equal(summary.totalPaid, 15);
  assert.equal(summary.balanceDue, 9);
  assert.equal(summary.paymentStatus, "partial");
});

test("full payment produces zero receivable and paid status", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(24)],
  });
  assert.equal(summary.totalPaid, 24);
  assert.equal(summary.accountsReceivable, 0);
  assert.equal(summary.paymentStatus, "paid");
});

test("final payment combines with prior payments", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(10), payment(5), payment(9)],
  });
  assert.equal(summary.totalPaid, 24);
  assert.equal(summary.balanceDue, 0);
  assert.equal(summary.paymentStatus, "paid");
});

test("summary is bounded against corrupt historical overpayments", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(25)],
  });
  assert.equal(summary.totalPaid, 24);
  assert.equal(summary.balanceDue, 0);
  assert.equal(summary.accountsReceivable, 0);
});

test("voided and cancelled payments are excluded", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [payment(14), payment(10, { status: "void" })],
  });
  assert.equal(summary.totalPaid, 14);
  assert.equal(summary.balanceDue, 10);
  assert.equal(summary.paymentStatus, "partial");
});

test("duplicate historical idempotency events count once", () => {
  const summary = deriveCustomerFinanceSummary({
    totalCharge: 24,
    payments: [
      payment(10, { idempotencyKey: "same-event" }),
      payment(10, { idempotencyKey: "same-event" }),
    ],
  });
  assert.equal(summary.totalPaid, 10);
  assert.equal(summary.balanceDue, 14);
});

const filterRows = [
  { paymentStatus: "unpaid", balanceDue: 24 },
  { paymentStatus: "partial", balanceDue: 9 },
  { paymentStatus: "paid", balanceDue: 0 },
];

test("outstanding filter includes unpaid and partial only", () => {
  assert.deepEqual(
    filterReceivables(filterRows, { status: "outstanding" }).map(
      (row) => row.paymentStatus,
    ),
    ["unpaid", "partial"],
  );
});

test("unpaid filter includes only zero-payment balances", () => {
  assert.deepEqual(filterReceivables(filterRows, { status: "unpaid" }), [
    filterRows[0],
  ]);
});

test("partial filter includes only partially paid balances", () => {
  assert.deepEqual(filterReceivables(filterRows, { status: "partial" }), [
    filterRows[1],
  ]);
});

test("paid filter includes only zero balances", () => {
  assert.deepEqual(filterReceivables(filterRows, { status: "paid" }), [
    filterRows[2],
  ]);
});

test("summary totals report charge, paid, outstanding and outstanding count", () => {
  const summary = summarizeReceivables([
    { currency: "USD", totalCharge: 100, totalPaid: 0, accountsReceivable: 100 },
    { currency: "USD", totalCharge: 24, totalPaid: 10, accountsReceivable: 14 },
  ]);
  assert.deepEqual(summary.USD, {
    currency: "USD",
    totalCharges: 124,
    totalPaid: 10,
    totalOutstanding: 114,
    outstandingRecords: 2,
    records: 2,
  });
});

test("summary never combines USD and KES", () => {
  const summary = summarizeReceivables([
    { currency: "USD", totalCharge: 100, totalPaid: 0, accountsReceivable: 100 },
    { currency: "KES", totalCharge: 25000, totalPaid: 0, accountsReceivable: 25000 },
  ]);
  assert.equal(summary.USD.totalOutstanding, 100);
  assert.equal(summary.KES.totalOutstanding, 25000);
  assert.equal(Object.keys(summary).length, 2);
});

test("receivables derive partial ticket balance from the payment ledger", () => {
  const rows = deriveReceivables({
    ...base,
    tickets: [
      {
        id: "ticket_1",
        ref: "TKT-MOG-20260801-0001",
        type: "Sale",
        branchId,
        clientId,
        passenger: "Amina Ali",
        saleDate: "2026-08-01",
        amount: 100,
        currency: "USD",
      },
    ],
    payments: [
      {
        transactionType: "ticket",
        transactionId: "ticket_1",
        amount: 40,
        flow: "inbound",
        status: "active",
        paymentDate: "2026-08-02",
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].totalCharge, 100);
  assert.equal(rows[0].amountPaid, 40);
  assert.equal(rows[0].balanceDue, 60);
  assert.equal(rows[0].paymentStatus, "partial");
  assert.equal(rows[0].currency, "USD");
});

test("previous-month debt remains current accounts receivable after the month changes", () => {
  const ticket = {
    id: "august-ticket",
    ref: "TKT-MOG-AUGUST",
    type: "Sale",
    branchId,
    clientId,
    passenger: "Amina Ali",
    saleDate: "2026-08-31",
    amount: 100,
    currency: "USD",
  };
  const baseArgs = {
    ...base,
    tickets: [ticket],
    asOf: "2026-09-01",
  };

  assert.equal(deriveReceivables(baseArgs)[0].balanceDue, 100);
  assert.equal(
    deriveReceivables({
      ...baseArgs,
      payments: [
        payment(40, {
          transactionType: "ticket",
          transactionId: "august-ticket",
        }),
      ],
    })[0].balanceDue,
    60,
  );
  const fullyPaid = deriveReceivables({
    ...baseArgs,
    payments: [
      payment(100, {
        transactionType: "ticket",
        transactionId: "august-ticket",
      }),
    ],
  });
  assert.equal(fullyPaid[0].balanceDue, 0);
  assert.equal(fullyPaid[0].paymentStatus, "paid");
  assert.deepEqual(filterReceivables(fullyPaid, { status: "outstanding" }), []);
});

test("receivables include ticket, visa and cargo without combining currencies", () => {
  const rows = deriveReceivables({
    ...base,
    tickets: [
      {
        id: "ticket_kes",
        ref: "TKT-NBO-20260901-0001",
        type: "Sale",
        branchId,
        clientId,
        passenger: "Amina Ali",
        saleDate: "2026-09-01",
        amount: 1500,
        currency: "KES",
      },
    ],
    visas: [
      {
        id: "visa_usd",
        ref: "VIS-MOG-20260901-0001",
        type: "Sale",
        branchId,
        clientId,
        applicant: "Amina Ali",
        appDate: "2026-09-01",
        amount: 75,
        currency: "USD",
      },
    ],
    cargo: [
      {
        id: "cargo_usd",
        tracking: "CGO-MOG-20260901-0001",
        originBranchId: branchId,
        payerClientId: clientId,
        paymentResponsibility: "sender",
        sender: "Amina Ali",
        receiver: "Hassan Ali",
        dateIn: "2026-09-01",
        weight: 4,
        rate: 10,
        currency: "USD",
      },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.service, row.currency, row.totalCharge]),
    [
      ["Ticket", "KES", 1500],
      ["Visa", "USD", 75],
      ["Cargo", "USD", 40],
    ],
  );
});

test("receivables exclude future and cancelled cargo from the current balance", () => {
  const rows = deriveReceivables({
    ...base,
    tickets: [
      {
        id: "future-ticket",
        ref: "FUTURE-1",
        type: "Sale",
        branchId,
        clientId,
        passenger: "Amina Ali",
        saleDate: "2026-09-02",
        amount: 100,
        currency: "USD",
      },
    ],
    cargo: [
      {
        id: "cancelled-cargo",
        tracking: "CANCELLED-1",
        originBranchId: branchId,
        payerClientId: clientId,
        paymentResponsibility: "sender",
        sender: "Amina Ali",
        receiver: "Hassan Ali",
        dateIn: "2026-08-01",
        weight: 5,
        rate: 3,
        currency: "USD",
        status: "cancelled",
      },
    ],
  });

  assert.deepEqual(rows, []);
});

test("legacy cargo without explicit payer remains unresolved", () => {
  const [row] = deriveReceivables({
    ...base,
    cargo: [
      {
        id: "legacy_cargo",
        tracking: "OLD-100",
        originBranchId: branchId,
        senderClientId: clientId,
        sender: "Amina Ali",
        receiver: "Hassan Ali",
        dateIn: "2026-07-01",
        weight: 5,
        rate: 3,
        currency: "USD",
      },
    ],
  });

  assert.equal(row.customer, "Unresolved payer");
  assert.equal(row.payerResolved, false);
  assert.equal(row.balanceDue, 15);
});

test("shared accounts receivable summary aggregates the ledger-derived balance", async () => {
  const originals = new Map(
    [Ticket, Cargo, Visa, Payment, Client, Branch].map((Model) => [
      Model,
      Model.find,
    ]),
  );
  const query = (rows) => ({ lean: async () => rows });
  try {
    Ticket.find = () =>
      query([
        {
          id: "shared-ticket",
          ref: "TKT-MOG-SHARED",
          type: "Sale",
          branchId,
          clientId,
          passenger: "Amina Ali",
          saleDate: "2026-09-01",
          amount: 100,
          currency: "USD",
        },
      ]);
    Cargo.find = () => query([]);
    Visa.find = () => query([]);
    Payment.find = () =>
      query([
        {
          transactionType: "ticket",
          transactionId: "shared-ticket",
          amount: 30,
          flow: "inbound",
          status: "active",
          paymentDate: "2026-09-01",
        },
      ]);
    Client.find = () => query([{ _id: clientId, name: "Amina Ali" }]);
    Branch.find = () => query([{ _id: branchId, name: "Mogadishu Office" }]);

    const result = await getAccountsReceivableSummary({
      user: { role: "owner" },
      filters: { asOf: "2026-09-01", status: "outstanding" },
    });
    assert.equal(result.rows.length, 1);
    assert.equal(result.totals[0].totalOutstanding, 70);
    assert.equal(result.totals[0].outstandingRecords, 1);
  } finally {
    for (const [Model, find] of originals) Model.find = find;
  }
});

test("aging buckets are deterministic at their boundaries", () => {
  assert.equal(agingBucket(0), "current");
  assert.equal(agingBucket(30), "1-30");
  assert.equal(agingBucket(31), "31-60");
  assert.equal(agingBucket(61), "61-90");
  assert.equal(agingBucket(91), "90+");
});

test("operator receivables query is forced to the assigned branch", async () => {
  const mog = "68b500000000000000000001";
  const nbo = "68b500000000000000000009";
  const originals = new Map(
    [Ticket, Cargo, Visa, Payment, Client, Branch].map((Model) => [
      Model,
      Model.find,
    ]),
  );
  const query = (rows) => ({ lean: async () => rows });
  try {
    Ticket.find = () =>
      query([
        {
          id: "mog-ticket",
          ref: "TKT-MOG-1",
          type: "Sale",
          branchId: mog,
          clientId,
          passenger: "Amina Ali",
          saleDate: "2026-09-01",
          amount: 24,
          currency: "USD",
        },
        {
          id: "nbo-ticket",
          ref: "TKT-NBO-1",
          type: "Sale",
          branchId: nbo,
          clientId,
          passenger: "Private Nairobi Customer",
          saleDate: "2026-09-01",
          amount: 25000,
          currency: "KES",
        },
      ]);
    Cargo.find = () => query([]);
    Visa.find = () => query([]);
    Payment.find = () => query([]);
    Client.find = () => query([{ _id: clientId, name: "Amina Ali" }]);
    Branch.find = () =>
      query([
        { _id: mog, name: "Mogadishu Office" },
        { _id: nbo, name: "Nairobi Office" },
      ]);

    const rows = await listReceivables({
      user: { role: "operator", assignedBranchId: mog },
      filters: { branchId: nbo, status: "all" },
    });
    assert.deepEqual(rows.map((row) => row.reference), ["TKT-MOG-1"]);
  } finally {
    for (const [Model, find] of originals) Model.find = find;
  }
});
