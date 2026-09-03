import assert from "node:assert/strict";
import test from "node:test";
import { persistCargoWithInitialPayment } from "../server/lib/cargoInitialPayment.js";
import { deriveCustomerPaymentSummary } from "../server/lib/finance.js";

const run = async ({ amount } = {}) => {
  const state = { cargo: [], payments: [], deleted: [] };
  const record = {
    id: "cargo-test",
    weight: 12,
    rate: 2,
    currency: "USD",
    paymentMethod: "EVC Plus",
  };
  const initialPayment =
    amount === undefined
      ? undefined
      : {
          amount,
          branchId: "mogadishu-id",
          paymentMethod: "EVC Plus",
          idempotencyKey: `cargo-test-${amount}`,
        };

  await persistCargoWithInitialPayment({
    record,
    initialPayment,
    user: { id: "owner", role: "owner" },
    action: { entity: "Cargo", detail: "Created cargo-test" },
    findCargo: async () => null,
    findPayment: async () => null,
    saveCargo: async ({ record: saved }) => {
      state.cargo.push(saved);
      return saved;
    },
    createPayment: async (payment) => {
      state.payments.push({ ...payment, flow: "inbound" });
    },
    deleteCargo: async (id) => {
      state.deleted.push(id);
      state.cargo = state.cargo.filter((item) => item.id !== id);
    },
  });
  return state;
};

test("Pay Now creates Cargo and its USD 24 ledger payment", async () => {
  const state = await run({ amount: 24 });
  assert.equal(state.cargo.length, 1);
  assert.equal(state.payments.length, 1);
  assert.equal(state.payments[0].transactionId, "cargo-test");
  assert.deepEqual(
    deriveCustomerPaymentSummary({ total: 24, payments: state.payments }),
    { total: 24, amountPaid: 24, balance: 0, paymentStatus: "paid" },
  );
});

test("Pay Partially creates USD 10 payment and USD 14 receivable", async () => {
  const state = await run({ amount: 10 });
  assert.deepEqual(
    deriveCustomerPaymentSummary({ total: 24, payments: state.payments }),
    { total: 24, amountPaid: 10, balance: 14, paymentStatus: "partial" },
  );
});

test("Pay Later creates Cargo without calling the Payment ledger", async () => {
  const state = await run();
  assert.equal(state.cargo.length, 1);
  assert.equal(state.payments.length, 0);
  assert.deepEqual(
    deriveCustomerPaymentSummary({ total: 24, payments: [] }),
    { total: 24, amountPaid: 0, balance: 24, paymentStatus: "unpaid" },
  );
});

test("payment validation failure compensates the new Cargo", async () => {
  const state = { cargo: [], deleted: [] };
  await assert.rejects(
    () =>
      persistCargoWithInitialPayment({
        record: {
          id: "cargo-invalid",
          weight: 12,
          rate: 2,
          currency: "USD",
        },
        initialPayment: {
          amount: 24,
          paymentMethod: "Invalid",
          idempotencyKey: "invalid-method",
        },
        user: { id: "owner", role: "owner" },
        findCargo: async () => null,
        findPayment: async () => null,
        saveCargo: async ({ record }) => {
          state.cargo.push(record);
          return record;
        },
        createPayment: async () => {
          throw new Error("Invalid payment method.");
        },
        deleteCargo: async (id) => {
          state.deleted.push(id);
          state.cargo = state.cargo.filter((item) => item.id !== id);
        },
      }),
    /Invalid payment method/,
  );
  assert.deepEqual(state.deleted, ["cargo-invalid"]);
  assert.equal(state.cargo.length, 0);
});
