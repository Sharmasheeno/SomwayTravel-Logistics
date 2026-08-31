import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import Branch from "../server/models/Branch.js";
import { getUserBranchScope } from "../server/lib/branches.js";
import { ENTITY_MODELS, writeEntity } from "../server/lib/entityPersistence.js";
import Activity from "../server/models/Activity.js";
import Client from "../server/models/Client.js";

const objectId = () => new mongoose.Types.ObjectId().toString();

const makeModel = () => {
  const docs = new Map();
  return {
    docs,
    async findOne(query) {
      return docs.get(query.id) || null;
    },
    async findOneAndUpdate(query, update) {
      const current = docs.get(query.id) || { id: query.id };
      const next = { ...current, ...update.$set };
      docs.set(query.id, next);
      return next;
    },
  };
};

const withMocks = async (models, branches, fn) => {
  const originals = {};
  for (const [key, model] of Object.entries(models)) {
    originals[key] = ENTITY_MODELS[key];
    ENTITY_MODELS[key] = model;
  }
  const originalBranchFindOne = Branch.findOne;
  const originalActivityCreate = Activity.create;
  const originalClientFindOne = Client.findOne;
  const originalClientCreate = Client.create;
  const originalClientFindOneAndUpdate = Client.findOneAndUpdate;
  Branch.findOne = async (query) => {
    const id = String(query._id || "");
    const branch = branches.find((item) => item.id === id || item._id === id);
    return branch && (query.isActive === undefined || branch.isActive === query.isActive) ? branch : null;
  };
  Activity.create = async (record) => record;
  const clientDocs = [];
  Client.findOne = async (query) => clientDocs.find((item) => item.normalizedPhone === query.normalizedPhone || item.id === query.id) || null;
  Client.create = async (record) => {
    const created = { ...record, _id: `client-${clientDocs.length + 1}`, async save() { return this; } };
    clientDocs.push(created);
    return created;
  };
  Client.findOneAndUpdate = async (_query, update) => update.$set;
  try {
    await fn();
  } finally {
    for (const [key, model] of Object.entries(originals)) ENTITY_MODELS[key] = model;
    Branch.findOne = originalBranchFindOne;
    Activity.create = originalActivityCreate;
    Client.findOne = originalClientFindOne;
    Client.create = originalClientCreate;
    Client.findOneAndUpdate = originalClientFindOneAndUpdate;
  }
};

test("owner and operator roles remain distinct from branch identity", () => {
  const branchId = objectId();
  assert.deepEqual(getUserBranchScope({ role: "owner" }), { kind: "all", branchId: null });
  assert.deepEqual(getUserBranchScope({ role: "operator", assignedBranchId: branchId }), { kind: "branch", branchId });
  assert.equal(getUserBranchScope({ role: "consultant" }).kind, "readOnly");
});

test("operator payload branchId is forced to the assigned branch for tickets", async () => {
  const nairobi = objectId();
  const mogadishu = objectId();
  const tickets = makeModel();
  await withMocks({ tickets }, [{ id: nairobi, isActive: true }, { id: mogadishu, isActive: true }], async () => {
    await writeEntity({
      collection: "tickets",
      record: { id: "ticket-branch", ref: "TKT-HACK", branchId: mogadishu, office: "Mogadishu Office", phone: "+254700000010" },
      user: { id: "u1", name: "Nairobi Operator", role: "operator", assignedBranchId: nairobi },
    });
  });
  assert.equal(String(tickets.docs.get("ticket-branch").branchId), nairobi);
});

test("operator cannot create cargo with the same origin and destination branch", async () => {
  const hargeisa = objectId();
  const cargo = makeModel();
  await withMocks({ cargo }, [{ id: hargeisa, isActive: true }], async () => {
    await assert.rejects(
      writeEntity({
        collection: "cargo",
        record: { id: "cargo-same", tracking: "HGA-1", originBranchId: hargeisa, destinationBranchId: hargeisa, origin: "Hargeisa Office", destination: "Hargeisa Office", senderPhone: "+252610000001" },
        user: { id: "u2", name: "Hargeisa Operator", role: "operator", assignedBranchId: hargeisa },
      }),
      /different/
    );
  });
});

test("owner can create a route rate between arbitrary active branches", async () => {
  const hargeisa = objectId();
  const nairobi = objectId();
  const rates = makeModel();
  await withMocks({ rates }, [{ id: hargeisa, isActive: true }, { id: nairobi, isActive: true }], async () => {
    await writeEntity({
      collection: "rates",
      record: { id: "hga-nbo-usd", origin: "Hargeisa Office", destination: "Nairobi Office", originBranchId: hargeisa, destinationBranchId: nairobi, currency: "USD", rate: 4 },
      user: { id: "owner", name: "Owner", role: "owner" },
    });
  });
  assert.equal(rates.docs.get("hga-nbo-usd").rate, 4);
});
