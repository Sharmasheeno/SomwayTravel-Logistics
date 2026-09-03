import assert from "node:assert/strict";
import test from "node:test";

import {
  cargoCustomerCharge,
  deriveCustomerPaymentSummary,
} from "../server/lib/finance.js";
import { deriveReceivables } from "../server/lib/receivables.js";

const branchId = "68b500000000000000000001";

const summary = (payments) =>
  deriveCustomerPaymentSummary({ total: cargoCustomerCharge({ weight: 12, rate: 2 }), payments });

test("cargo charge is weight multiplied by the stored shipment rate", () => {
  assert.equal(cargoCustomerCharge({ weight: 12, rate: 2 }), 24);
  assert.equal(cargoCustomerCharge({ weight: 12, rate: 2, customerCharge: 999 }), 24);
});

test("cargo payment choices derive full, partial, later and final balances", () => {
  assert.deepEqual(summary([]), { total: 24, amountPaid: 0, balance: 24, paymentStatus: "unpaid" });
  assert.deepEqual(summary([{ amount: 24, flow: "inbound" }]), { total: 24, amountPaid: 24, balance: 0, paymentStatus: "paid" });
  assert.deepEqual(summary([{ amount: 10, flow: "inbound" }]), { total: 24, amountPaid: 10, balance: 14, paymentStatus: "partial" });
  assert.deepEqual(summary([{ amount: 10, flow: "inbound" }, { amount: 5, flow: "inbound" }]), { total: 24, amountPaid: 15, balance: 9, paymentStatus: "partial" });
  assert.deepEqual(summary([{ amount: 10, flow: "inbound" }, { amount: 5, flow: "inbound" }, { amount: 9, flow: "inbound" }]), { total: 24, amountPaid: 24, balance: 0, paymentStatus: "paid" });
});

test("cargo AR remains after delivery and never depends on shipment status", () => {
  const [row] = deriveReceivables({
    tickets: [],
    visas: [],
    payments: [],
    clients: [],
    branches: [{ _id: branchId, name: "Mogadishu Office" }],
    asOf: "2026-09-01",
    cargo: [{
      id: "cargo-delivered",
      tracking: "CGO-1",
      originBranchId: branchId,
      sender: "Sender",
      receiver: "Receiver",
      paymentResponsibility: "sender",
      dateIn: "2026-08-31",
      weight: 12,
      rate: 2,
      currency: "USD",
      status: "delivered",
    }],
  });
  assert.equal(row.totalCharge, 24);
  assert.equal(row.balanceDue, 24);
  assert.equal(row.paymentStatus, "unpaid");
});

test("cargo payment summaries never permit an overpayment balance", () => {
  const result = summary([{ amount: 24, flow: "inbound" }, { amount: 1, flow: "inbound" }]);
  assert.equal(result.amountPaid, 24);
  assert.equal(result.balance, 0);
});
