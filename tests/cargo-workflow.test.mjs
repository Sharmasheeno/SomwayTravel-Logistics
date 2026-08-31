import assert from "node:assert/strict";
import test from "node:test";

import Branch from "../server/models/Branch.js";
import Cargo from "../server/models/Cargo.js";
import { assertCargoTransitionAllowed, canViewCargo, normalizeCargoStatus, transitionCargoStatus } from "../server/lib/cargoWorkflow.js";
import { runPhase4Migration } from "../server/lib/phase4Migration.js";

const nbo = "68b500000000000000000001";
const mog = "68b500000000000000000002";
const hga = "68b500000000000000000003";
const owner = { id: "owner", name: "Owner", role: "owner" };
const nairobi = { id: "op-nbo", name: "Nairobi Operator", role: "operator", assignedBranchId: nbo };
const mogadishu = { id: "op-mog", name: "Mogadishu Operator", role: "operator", assignedBranchId: mog };
const hargeisa = { id: "op-hga", name: "Hargeisa Operator", role: "operator", assignedBranchId: hga };

const doc = (record) => ({ ...record, statusHistory: record.statusHistory || [], async save() { return this; } });

const withCargoMocks = async (cargo, fn) => {
  const originalCargoFindOne = Cargo.findOne;
  const originalCargoFind = Cargo.find;
  const originalBranchFindOne = Branch.findOne;
  Cargo.findOne = async (query) => cargo.find((item) => item.id === query.id) || null;
  Cargo.find = async () => cargo;
  Branch.findOne = async () => ({ _id: nbo, isActive: true });
  try {
    await fn();
  } finally {
    Cargo.findOne = originalCargoFindOne;
    Cargo.find = originalCargoFind;
    Branch.findOne = originalBranchFindOne;
  }
};

test("valid cargo lifecycle transitions are accepted", () => {
  const cargo = { status: "received", originBranchId: nbo, destinationBranchId: mog };
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "in_transit", nairobi));
  cargo.status = "in_transit";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "arrived", mogadishu));
  cargo.status = "arrived";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "ready_for_collection", mogadishu));
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "delivered", mogadishu));
  cargo.status = "ready_for_collection";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "delivered", mogadishu));
});

test("invalid cargo lifecycle transitions are rejected", () => {
  const cargo = { status: "received", originBranchId: nbo, destinationBranchId: mog };
  assert.throws(() => assertCargoTransitionAllowed(cargo, "arrived", nairobi), /cannot move/);
  assert.throws(() => assertCargoTransitionAllowed(cargo, "delivered", nairobi), /cannot move/);
  cargo.status = "in_transit";
  assert.throws(() => assertCargoTransitionAllowed(cargo, "delivered", mogadishu), /cannot move/);
  cargo.status = "delivered";
  assert.throws(() => assertCargoTransitionAllowed(cargo, "arrived", mogadishu), /cannot move/);
  assert.throws(() => assertCargoTransitionAllowed(cargo, "in_transit", nairobi), /cannot move/);
  cargo.status = "cancelled";
  assert.throws(() => assertCargoTransitionAllowed(cargo, "delivered", mogadishu), /cannot move/);
});

test("origin and destination operators have separate cargo action authority", () => {
  const cargo = { status: "received", originBranchId: nbo, destinationBranchId: mog };
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "in_transit", nairobi));
  assert.throws(() => assertCargoTransitionAllowed(cargo, "in_transit", mogadishu), /origin branch/);
  cargo.status = "in_transit";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "arrived", mogadishu));
  assert.throws(() => assertCargoTransitionAllowed(cargo, "arrived", nairobi), /destination branch/);
  cargo.status = "arrived";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(cargo, "delivered", mogadishu));
  assert.throws(() => assertCargoTransitionAllowed(cargo, "delivered", hargeisa), /destination branch/);
  assert.doesNotThrow(() => assertCargoTransitionAllowed({ ...cargo, status: "received" }, "in_transit", owner));
});

test("third-branch workflows are authorized without source-code branch coupling", () => {
  const hgaToNbo = { status: "received", originBranchId: hga, destinationBranchId: nbo };
  assert.doesNotThrow(() => assertCargoTransitionAllowed(hgaToNbo, "in_transit", hargeisa));
  hgaToNbo.status = "in_transit";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(hgaToNbo, "arrived", nairobi));
  hgaToNbo.status = "arrived";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(hgaToNbo, "delivered", nairobi));

  const nboToHga = { status: "received", originBranchId: nbo, destinationBranchId: hga };
  assert.doesNotThrow(() => assertCargoTransitionAllowed(nboToHga, "in_transit", nairobi));
  nboToHga.status = "in_transit";
  assert.doesNotThrow(() => assertCargoTransitionAllowed(nboToHga, "arrived", hargeisa));
});

test("incoming cargo is visible through one shared cargo record", () => {
  const rows = [
    { id: "nbo-mog", originBranchId: nbo, destinationBranchId: mog, status: "in_transit" },
    { id: "hga-mog", originBranchId: hga, destinationBranchId: mog, status: "in_transit" },
  ];
  assert.deepEqual(rows.filter((item) => canViewCargo(item, mogadishu)).map((item) => item.id), ["nbo-mog", "hga-mog"]);
});

test("transition service records ordered status history with actor, time, and branch", async () => {
  const cargo = doc({ id: "flow", status: "received", originBranchId: nbo, destinationBranchId: mog, tracking: "CGO-NBO-1" });
  await withCargoMocks([cargo], async () => {
    await transitionCargoStatus({ id: "flow", toStatus: "in_transit", user: nairobi });
    await transitionCargoStatus({ id: "flow", toStatus: "arrived", user: mogadishu });
    await transitionCargoStatus({ id: "flow", toStatus: "ready_for_collection", user: mogadishu });
    await transitionCargoStatus({ id: "flow", toStatus: "delivered", user: mogadishu });
  });
  assert.deepEqual(cargo.statusHistory.map((entry) => entry.toStatus), ["in_transit", "arrived", "ready_for_collection", "delivered"]);
  assert.equal(cargo.statusHistory[0].userId, "op-nbo");
  assert.equal(String(cargo.statusHistory[0].branchId), nbo);
  assert.equal(cargo.statusHistory[3].userId, "op-mog");
  assert.equal(String(cargo.statusHistory[3].branchId), mog);
  assert.ok(cargo.statusHistory.every((entry) => entry.at));
});

test("legacy Claim cargo is normalized deterministically and retained", async () => {
  const claim = doc({ id: "claim", tracking: "CLAIM-1", status: "Claim", originBranchId: nbo, destinationBranchId: mog });
  await withCargoMocks([claim], async () => {
    const result = await runPhase4Migration();
    assert.equal(result.cargoScanned, 1);
    assert.equal(result.statusNormalized, 1);
    assert.equal(result.historyInitialized, 1);
    assert.equal(result.claimRecords, 1);
  });
  assert.equal(normalizeCargoStatus(claim.status), "claim");
  assert.equal(claim.statusHistory[0].toStatus, "claim");
});
