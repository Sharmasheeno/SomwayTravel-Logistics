import assert from "node:assert/strict";
import test from "node:test";

import { servicePayableRecord } from "../server/lib/entityPersistence.js";

test("cargo direct cost automatically becomes a branch payable", () => {
  const payable = servicePayableRecord("cargo", {
    id: "cargo_1",
    tracking: "CGO-MOG-20260901-0001",
    originBranchId: "68b500000000000000000001",
    origin: "Mogadishu Office",
    destination: "Nairobi Office",
    dateIn: "2026-09-01",
    currency: "USD",
    cost: 30,
  });

  assert.equal(payable.id, "payable_cargo_cargo_1");
  assert.equal(payable.billed, 30);
  assert.equal(payable.currency, "USD");
  assert.equal(payable.reference, "CGO-MOG-20260901-0001");
  assert.equal(payable.supplier, "Cargo carrier");
});

test("zero direct cost does not create an automatic payable", () => {
  assert.equal(
    servicePayableRecord("cargo", {
      id: "cargo_2",
      tracking: "CGO-MOG-20260901-0002",
      currency: "USD",
      cost: 0,
    }),
    null,
  );
});

test("refund service records do not create supplier payables", () => {
  assert.equal(
    servicePayableRecord("visa", {
      id: "visa_refund",
      ref: "VIS-MOG-20260901-0002",
      type: "Refund",
      currency: "USD",
      cost: 100,
    }),
    null,
  );
});
