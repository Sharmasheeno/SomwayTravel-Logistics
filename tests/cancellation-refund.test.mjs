import test from "node:test";
import assert from "node:assert/strict";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";
import Cargo from "../server/models/Cargo.js";
import Payment from "../server/models/Payment.js";
import Branch from "../server/models/Branch.js";
import PaymentMethod from "../server/models/PaymentMethod.js";
import BranchPaymentMethod from "../server/models/BranchPaymentMethod.js";
import { createCancellationRefund, refundableBalance } from "../server/lib/finance.js";

for (const [type, Model] of Object.entries({ ticket: Ticket, visa: Visa, cargo: Cargo })) {
  test(`${type}: refund only paid cancelled services, with branch and duplicate protection`, async (t) => {
    const record = { id: "service", status: "cancelled", branchId: "68b500000000000000000001", originBranchId: "68b500000000000000000001", currency: "USD" };
    const payments = [{ id: "receipt", amount: 80, flow: "inbound", paymentDate: "2026-09-08" }];
    t.mock.method(Model, "findOne", async () => record);
    t.mock.method(Payment, "find", async () => payments);
    t.mock.method(Payment, "create", async (row) => { payments.push(row); return row; });
    const branch = { _id: "68b500000000000000000001", isActive: true, allowedCurrencies: ["USD"] };
    t.mock.method(Branch, "findById", async () => branch);
    t.mock.method(Branch, "findOne", async () => branch);
    t.mock.method(PaymentMethod, "findOne", async () => ({ _id: "evc", name: "EVC Plus", isActive: true }));
    t.mock.method(BranchPaymentMethod, "findOne", async () => ({ allowedCurrencies: ["USD"] }));
    const input = { transactionType: type, transactionId: record.id, amount: 80, paymentDate: "2026-09-09", paymentMethod: "EVC Plus", user: { id: "owner", role: "owner" } };
    await assert.rejects(createCancellationRefund({ ...input, amount: 100 }), /remaining refundable/);
    await assert.rejects(createCancellationRefund({ ...input, user: { role: "operator", assignedBranchId: "68b500000000000000000003" } }), /outside/);
    record.status = "booked";
    await assert.rejects(createCancellationRefund(input), /Cancel the service/);
    record.status = "cancelled";
    const results = await Promise.allSettled([createCancellationRefund(input), createCancellationRefund(input)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(payments.length, 2);
    assert.equal(payments[1].flow, "outbound");
    assert.equal(payments[1].amount, 80);
    assert.equal(refundableBalance(payments), 0);
    await assert.rejects(createCancellationRefund(input), /remaining refundable/);
  });
}

test("unpaid, partially refunded and voided receipts produce correct refundable amounts", () => {
  assert.equal(refundableBalance([]), 0);
  assert.equal(refundableBalance([{ amount: 100 }, { amount: 30, flow: "outbound" }, { amount: 500, status: "void" }]), 70);
});
