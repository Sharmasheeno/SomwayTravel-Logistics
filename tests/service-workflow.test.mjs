import assert from "node:assert/strict";
import test from "node:test";

import Branch from "../server/models/Branch.js";
import Ticket from "../server/models/Ticket.js";
import Visa from "../server/models/Visa.js";
import {
  normalizeServiceStatus,
  prepareNewServiceWorkflow,
  transitionServiceStatus,
} from "../server/lib/serviceWorkflow.js";

const nbo = "68b500000000000000000001";
const mog = "68b500000000000000000002";
const owner = { id: "owner", name: "Owner", role: "owner" };
const nairobi = {
  id: "op-nbo",
  name: "Nairobi Operator",
  role: "operator",
  assignedBranchId: nbo,
};

const applyUpdate = (record, update) => {
  Object.assign(record, update.$set || {});
  record.workflowVersion =
    (record.workflowVersion || 0) + (update.$inc?.workflowVersion || 0);
  if (update.$push?.statusHistory) {
    record.statusHistory = [
      ...(record.statusHistory || []),
      update.$push.statusHistory,
    ];
  }
  return record;
};

const withWorkflowMocks = async ({ tickets = [], visas = [] }, fn) => {
  const originals = {
    ticketFindOne: Ticket.findOne,
    ticketFindOneAndUpdate: Ticket.findOneAndUpdate,
    visaFindOne: Visa.findOne,
    visaFindOneAndUpdate: Visa.findOneAndUpdate,
    branchFindOne: Branch.findOne,
  };
  const install = (Model, rows) => {
    Model.findOne = async (query) =>
      rows.find((record) => record.id === query.id) || null;
    Model.findOneAndUpdate = async (query, update) => {
      const record = rows.find(
        (item) =>
          item.id === query.id &&
          item.status === query.status &&
          (item.workflowVersion || 0) === query.workflowVersion,
      );
      return record ? applyUpdate(record, update) : null;
    };
  };
  install(Ticket, tickets);
  install(Visa, visas);
  Branch.findOne = async (query) => ({
    _id: query._id,
    isActive: true,
  });
  try {
    await fn();
  } finally {
    Ticket.findOne = originals.ticketFindOne;
    Ticket.findOneAndUpdate = originals.ticketFindOneAndUpdate;
    Visa.findOne = originals.visaFindOne;
    Visa.findOneAndUpdate = originals.visaFindOneAndUpdate;
    Branch.findOne = originals.branchFindOne;
  }
};

test("new service records start with canonical status and audit history", () => {
  const ticket = prepareNewServiceWorkflow(
    "ticket",
    { id: "t-new", branchId: nbo, status: "Created" },
    nairobi,
  );
  const visa = prepareNewServiceWorkflow(
    "visa",
    { id: "v-new", branchId: nbo, status: "Submitted" },
    nairobi,
  );
  assert.equal(ticket.status, "booked");
  assert.equal(visa.status, "submitted");
  assert.equal(ticket.workflowVersion, 0);
  assert.equal(visa.statusHistory[0].userId, "op-nbo");
});

test("ticket and visa transitions follow their canonical workflows", async () => {
  const ticket = {
    id: "t-flow",
    branchId: nbo,
    status: "booked",
    workflowVersion: 0,
    statusHistory: [],
  };
  const visa = {
    id: "v-flow",
    branchId: nbo,
    status: "submitted",
    workflowVersion: 0,
    statusHistory: [],
  };
  await withWorkflowMocks({ tickets: [ticket], visas: [visa] }, async () => {
    await transitionServiceStatus({
      kind: "ticket",
      id: ticket.id,
      toStatus: "issued",
      user: nairobi,
    });
    await transitionServiceStatus({
      kind: "visa",
      id: visa.id,
      toStatus: "approved",
      user: nairobi,
    });
    await transitionServiceStatus({
      kind: "visa",
      id: visa.id,
      toStatus: "delivered",
      user: nairobi,
    });
  });
  assert.equal(ticket.status, "issued");
  assert.deepEqual(
    visa.statusHistory.map((entry) => entry.toStatus),
    ["approved", "delivered"],
  );
  assert.equal(visa.workflowVersion, 2);
});

test("operators cannot skip workflow steps or update another branch", async () => {
  const visa = {
    id: "v-guard",
    branchId: mog,
    status: "submitted",
    workflowVersion: 0,
    statusHistory: [],
  };
  await withWorkflowMocks({ visas: [visa] }, async () => {
    await assert.rejects(
      transitionServiceStatus({
        kind: "visa",
        id: visa.id,
        toStatus: "delivered",
        user: owner,
      }),
      /correction reason/i,
    );
    await assert.rejects(
      transitionServiceStatus({
        kind: "visa",
        id: visa.id,
        toStatus: "approved",
        user: nairobi,
      }),
      /outside your assigned access/i,
    );
  });
});

test("owner correction requires a reason and records it", async () => {
  const visa = {
    id: "v-correct",
    branchId: mog,
    status: "refused",
    workflowVersion: 0,
    statusHistory: [],
  };
  await withWorkflowMocks({ visas: [visa] }, async () => {
    await transitionServiceStatus({
      kind: "visa",
      id: visa.id,
      toStatus: "approved",
      correctionReason: "Embassy decision was entered incorrectly.",
      user: owner,
    });
  });
  assert.equal(visa.status, "approved");
  assert.match(visa.statusHistory[0].note, /entered incorrectly/i);
});

test("stale service transition is rejected instead of overwriting history", async () => {
  const ticket = {
    id: "t-stale",
    branchId: nbo,
    status: "booked",
    workflowVersion: 1,
    statusHistory: [],
  };
  await withWorkflowMocks({ tickets: [ticket] }, async () => {
    const originalUpdate = Ticket.findOneAndUpdate;
    Ticket.findOneAndUpdate = async () => null;
    try {
      await assert.rejects(
        transitionServiceStatus({
          kind: "ticket",
          id: ticket.id,
          toStatus: "issued",
          user: nairobi,
        }),
        /another session/i,
      );
    } finally {
      Ticket.findOneAndUpdate = originalUpdate;
    }
  });
});

test("legacy service statuses normalize deterministically", () => {
  assert.equal(normalizeServiceStatus("ticket", "Created"), "booked");
  assert.equal(normalizeServiceStatus("ticket", "Canceled"), "cancelled");
  assert.equal(normalizeServiceStatus("visa", "Approved"), "approved");
  assert.equal(normalizeServiceStatus("visa", "unknown"), "submitted");
});
