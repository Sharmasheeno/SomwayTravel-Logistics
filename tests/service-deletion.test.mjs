import AgencySettings from "../server/models/AgencySettings.js";
import PaymentMethod from "../server/models/PaymentMethod.js";
import BranchPaymentMethod from "../server/models/BranchPaymentMethod.js";
import assert from "node:assert/strict";
import test from "node:test";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";
import Cargo from "../server/models/Cargo.js";
import Payment from "../server/models/Payment.js";
import Supplier from "../server/models/Supplier.js";
import SupplierPayment from "../server/models/SupplierPayment.js";
import DailyClose from "../server/models/DailyClose.js";
import DailySummary from "../server/models/DailySummary.js";
import StartingBalance from "../server/models/StartingBalance.js";
import Expense from "../server/models/Expense.js";
import Branch from "../server/models/Branch.js";
import Activity from "../server/models/Activity.js";
import ServiceDeletion from "../server/models/ServiceDeletion.js";
import { deleteEntity, writeEntity } from "../server/lib/entityPersistence.js";
import { cleanupDeletedServiceFinance, deleteServiceRecords, resumeServiceDeletions } from "../server/lib/serviceDeletion.js";
import { buildFinanceReport } from "../server/lib/finance.js";
import { deriveReceivables } from "../server/lib/receivables.js";

const owner = { id: "owner", role: "owner" };
const models = { settings: AgencySettings, methods: PaymentMethod, branchMethods: BranchPaymentMethod, tickets: Ticket, visas: Visa, cargo: Cargo, payments: Payment, suppliers: Supplier, supplierPayments: SupplierPayment, closes: DailyClose, summaries: DailySummary, opening: StartingBalance, expenses: Expense, branches: Branch, jobs: ServiceDeletion, activities: Activity };
const matches = (row, query) => Object.entries(query).every(([key, value]) => {
  if (key === "$or") return value.some((part) => matches(row, part));
  if (value && typeof value === "object") return Object.entries(value).every(([op, val]) => {
    if (op === "$in") return val.includes(row[key]);
    if (op === "$nin") return !val.includes(row[key]);
    if (op === "$ne") return row[key] !== val;
    if (op === "$lte") return row[key] <= val;
    if (op === "$gte") return row[key] >= val;
    throw new Error(`Unsupported test operator ${op}`);
  });
  return row[key] === value;
});
async function withStore(initial, work) {
  const state = structuredClone(initial);
  const restore = [];
  for (const [name, Model] of Object.entries(models)) {
    state[name] ||= [];
    const queryResult = (value) => { const result = Promise.resolve(value); result.lean = () => result; result.sort = () => result; return result; };
    const methods = {
      find: (query = {}) => queryResult(state[name].filter((row) => matches(row, query))),
      findOne: (query) => queryResult(state[name].find((row) => matches(row, query)) || null),
      exists: async (query) => state[name].some((row) => matches(row, query)),
      deleteMany: async (query) => { state[name] = state[name].filter((row) => !matches(row, query)); },
      deleteOne: async (query) => { const index = state[name].findIndex((row) => matches(row, query)); if (index >= 0) state[name].splice(index, 1); },
      updateOne: async (query, update, options = {}) => {
        let row = state[name].find((row) => matches(row, query));
        if (!row && options.upsert) { row = { ...query, ...update.$setOnInsert }; state[name].push(row); }
        if (row) Object.assign(row, update.$set);
      },
      create: async (row) => { state[name].push(row); return row; },
    };
    for (const [method, replacement] of Object.entries(methods)) {
      const original = Model[method]; restore.push(() => Model[method] = original); Model[method] = replacement;
    }
  }
  try { await work(state); } finally { restore.reverse().forEach((fn) => fn()); }
}

for (const [collection, type] of [["tickets", "ticket"], ["visas", "visa"], ["cargo", "cargo"]]) {
  test(`${type} deletion removes both ledgers and all linked payables, keeping unrelated records`, async () => {
    await withStore({
      [collection]: [{ id: "target" }, { id: "keep" }],
      payments: [{ id: "receipt", transactionType: type, transactionId: "target" }, { id: "refund", transactionType: type, transactionId: "target", flow: "outbound" }, { id: "void", transactionType: type, transactionId: "target", status: "void" }, { id: "keep", transactionType: type, transactionId: "keep" }],
      suppliers: [{ id: `payable_${type}_target` }, { id: "explicit", transactionType: type, transactionId: "target" }, { id: "manual" }],
      supplierPayments: [{ id: "first", supplierBillId: `payable_${type}_target` }, { id: "second", supplierBillId: "explicit", status: "void" }, { id: "keep", supplierBillId: "manual" }],
    }, async (state) => {
      await deleteEntity({ collection, id: "target", user: owner });
      assert.deepEqual(state[collection].map((row) => row.id), ["keep"]);
      assert.deepEqual(state.payments.map((row) => row.id), ["keep"]);
      assert.deepEqual(state.suppliers.map((row) => row.id), ["manual"]);
      assert.deepEqual(state.supplierPayments.map((row) => row.id), ["keep"]);
      assert.equal(state.jobs.length, 0);
    });
  });
}

test("payable deletion and direct edits are rejected, even for the owner", async () => {
  await withStore({ suppliers: [{ id: "bill", billed: 100 }] }, async (state) => {
    await assert.rejects(deleteEntity({ collection: "suppliers", id: "bill", user: owner }), { status: 409 });
    await assert.rejects(writeEntity({ collection: "suppliers", id: "bill", record: { billed: 0 }, user: owner }), { status: 409 });
    assert.equal(state.suppliers[0].billed, 100);
  });
});

test("operators cannot delete a service and stale edits cannot recreate a deleted service", async () => {
  await withStore({ tickets: [{ id: "live" }] }, async () => {
    await assert.rejects(deleteEntity({ collection: "tickets", id: "live", user: { role: "operator" } }), { status: 403 });
    await assert.rejects(writeEntity({ collection: "tickets", id: "deleted", record: { id: "deleted" }, user: owner }), { status: 404 });
  });
});

test("startup cleanup removes legacy orphans, preserves cancelled services and manual bills, and is repeatable", async () => {
  await withStore({
    tickets: [{ id: "archived", recordStatus: "archived" }, { id: "cancelled", status: "cancelled" }],
    payments: [{ id: "old", transactionType: "ticket", transactionId: "missing" }, { id: "archive", transactionType: "ticket", transactionId: "archived" }, { id: "keep", transactionType: "ticket", transactionId: "cancelled" }],
    suppliers: [{ id: "payable_ticket_missing" }, { id: "payable_ticket_cancelled" }, { id: "manual" }],
    supplierPayments: [{ id: "old", supplierBillId: "payable_ticket_missing" }, { id: "missingbill", supplierBillId: "missing" }, { id: "keep", supplierBillId: "manual" }],
  }, async (state) => {
    await cleanupDeletedServiceFinance();
    assert.deepEqual(state.tickets.map((row) => row.id), ["cancelled"]);
    assert.deepEqual(state.payments.map((row) => row.id), ["keep"]);
    assert.deepEqual(state.suppliers.map((row) => row.id), ["payable_ticket_cancelled", "manual"]);
    assert.deepEqual(state.supplierPayments.map((row) => row.id), ["keep"]);
    assert.deepEqual(await cleanupDeletedServiceFinance(), { payments: 0, payables: 0, supplierPayments: 0 });
  });
});

test("interrupted cascade retains intent and finishes on restart", async () => {
  await withStore({ tickets: [{ id: "target" }], suppliers: [{ id: "payable_ticket_target" }] }, async (state) => {
    const original = Supplier.deleteMany;
    Supplier.deleteMany = async () => { throw new Error("connection lost"); };
    await assert.rejects(deleteServiceRecords("ticket", "target"), /connection lost/);
    assert.equal(state.jobs.length, 1);
    Supplier.deleteMany = original;
    await resumeServiceDeletions();
    assert.equal(state.jobs.length, 0);
    assert.equal(state.tickets.length, 0);
    assert.equal(state.suppliers.length, 0);
  });
});

test("deletion refreshes close totals and removes service from reports and receivables", async () => {
  await withStore({
    tickets: [{ id: "target", currency: "USD", amount: 100, cost: 20, saleDate: "2026-09-08" }],
    payments: [{ id: "p", transactionType: "ticket", transactionId: "target", amount: 40, paymentDate: "2026-09-08", branchId: "b", currency: "USD", paymentMethodId: "cash", status: "active" }],
    closes: [{ id: "close", date: "2026-09-08", branchId: "b", currency: "USD", paymentMethodId: "cash", totalCollections: 40, expectedBalance: 40, actuallyCounted: 40, reviewed: true }],
  }, async (state) => {
    await deleteServiceRecords("ticket", "target");
    assert.equal(state.closes[0].totalCollections, 0);
    assert.equal(state.closes[0].expectedBalance, 0);
    assert.equal(state.closes[0].reviewed, false);
    assert.deepEqual(await buildFinanceReport(), []);
    assert.deepEqual(deriveReceivables({ ...state, clients: [], asOf: "2026-09-08" }), []);
  });
});

test("orphan payment and generated payable cannot create zero-service report rows", async () => {
  await withStore({
    payments: [{ id: "p", transactionType: "visa", transactionId: "gone", amount: 90, paymentDate: "2026-09-08", branchId: "b", currency: "USD" }],
    suppliers: [{ id: "payable_visa_gone", date: "2026-09-08", billed: 30, currency: "USD" }],
  }, async () => assert.deepEqual(await buildFinanceReport(), []));
});

test("saved historical summary no longer retains deleted-service revenue", async () => {
  await withStore({
    branches: [{ _id: "b", name: "Mogadishu", defaultCurrency: "USD", allowedCurrencies: ["USD"] }],
    tickets: [{ id: "target", currency: "USD", amount: 100, cost: 20, saleDate: "2026-09-01", branchId: "b" }],
    summaries: [{ id: "day", branchId: "b", branch: "Mogadishu", businessDate: "2026-09-01", currency: "USD", revenue: 100, profit: 80, accountsReceivable: 100, closedAt: "2026-09-02", version: 1, correctionHistory: [{ previous: { revenue: 100 } }] }],
  }, async (state) => {
    await deleteServiceRecords("ticket", "target");
    assert.equal(state.summaries[0].revenue, 0);
    assert.equal(state.summaries[0].accountsReceivable, 0);
    assert.equal(state.summaries[0].profit, 0);
    assert.deepEqual(state.summaries[0].correctionHistory, []);
  });
});
