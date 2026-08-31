import assert from "node:assert/strict";
import test from "node:test";

import Activity from "../server/models/Activity.js";
import Client from "../server/models/Client.js";
import { ENTITY_MODELS, writeEntity } from "../server/lib/entityPersistence.js";

const owner = { id: "owner-1", name: "Owner", role: "owner" };

const makeModel = (initial = []) => {
  const docs = new Map(initial.map((item) => [item.id, { ...item }]));
  const calls = { findOne: 0, findOneAndUpdate: 0, deleteOne: 0 };
  return {
    docs,
    calls,
    async findOne(query) {
      calls.findOne += 1;
      return docs.get(query.id) || null;
    },
    async findOneAndUpdate(query, update) {
      calls.findOneAndUpdate += 1;
      const current = docs.get(query.id) || { id: query.id, _id: `mongo-${query.id}`, createdAt: "2026-01-01T00:00:00.000Z" };
      const next = { ...current, ...update.$set };
      docs.set(query.id, next);
      return next;
    },
    async deleteOne(query) {
      calls.deleteOne += 1;
      docs.delete(query.id);
    },
  };
};

const withMockedPersistence = async (models, fn) => {
  const originals = {};
  for (const [key, model] of Object.entries(models)) {
    originals[key] = ENTITY_MODELS[key];
    ENTITY_MODELS[key] = model;
  }
  const originalActivityCreate = Activity.create;
  const originalClientFindOne = Client.findOne;
  const originalClientCreate = Client.create;
  const originalClientFindOneAndUpdate = Client.findOneAndUpdate;
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
    Activity.create = originalActivityCreate;
    Client.findOne = originalClientFindOne;
    Client.create = originalClientCreate;
    Client.findOneAndUpdate = originalClientFindOneAndUpdate;
  }
};

test("create ticket does not affect cargo", async () => {
  const tickets = makeModel();
  const cargo = makeModel([{ id: "cargo-a", tracking: "NBO-11111" }]);
  await withMockedPersistence({ tickets, cargo }, async () => {
    await writeEntity({
      collection: "tickets",
      record: { id: "ticket-a", ref: "TKT-N-11111", office: "Nairobi", phone: "+254700000001" },
      user: owner,
    });
  });
  assert.equal(tickets.calls.findOneAndUpdate, 1);
  assert.equal(cargo.calls.findOneAndUpdate, 0);
  assert.ok(cargo.docs.has("cargo-a"));
});

test("update ticket does not affect cargo", async () => {
  const tickets = makeModel([{ id: "ticket-a", _id: "mongo-ticket-a", createdAt: "2026-01-01T00:00:00.000Z", ref: "TKT-N-11111", office: "Nairobi" }]);
  const cargo = makeModel([{ id: "cargo-b", tracking: "MOG-22222" }]);
  await withMockedPersistence({ tickets, cargo }, async () => {
    await writeEntity({
      collection: "tickets",
      id: "ticket-a",
      record: { id: "ticket-a", ref: "TKT-N-11111", office: "Nairobi", passenger: "Updated", phone: "+254700000001" },
      user: owner,
    });
  });
  assert.equal(cargo.calls.findOneAndUpdate, 0);
  assert.equal(cargo.docs.get("cargo-b").tracking, "MOG-22222");
});

test("create cargo does not affect visa", async () => {
  const cargo = makeModel();
  const visas = makeModel([{ id: "visa-a", ref: "VIS-N-11111" }]);
  await withMockedPersistence({ cargo, visas }, async () => {
    await writeEntity({
      collection: "cargo",
      record: { id: "cargo-a", tracking: "NBO-33333", origin: "Nairobi", senderPhone: "+254700000002" },
      user: owner,
    });
  });
  assert.equal(visas.calls.findOneAndUpdate, 0);
  assert.ok(visas.docs.has("visa-a"));
});

test("update cargo does not affect expenses", async () => {
  const cargo = makeModel([{ id: "cargo-a", tracking: "NBO-33333", origin: "Nairobi" }]);
  const expenses = makeModel([{ id: "expense-a", description: "Rent" }]);
  await withMockedPersistence({ cargo, expenses }, async () => {
    await writeEntity({
      collection: "cargo",
      id: "cargo-a",
      record: { id: "cargo-a", tracking: "NBO-33333", origin: "Nairobi", destination: "Mogadishu", status: "arrived", senderPhone: "+254700000002" },
      user: owner,
    });
  });
  assert.equal(expenses.calls.findOneAndUpdate, 0);
  assert.equal(expenses.docs.get("expense-a").description, "Rent");
});

test("stale ticket edit cannot erase newly created cargo", async () => {
  const tickets = makeModel([{ id: "ticket-a", ref: "TKT-N-11111", office: "Nairobi" }]);
  const cargo = makeModel();
  await withMockedPersistence({ tickets, cargo }, async () => {
    await writeEntity({ collection: "cargo", record: { id: "cargo-b", tracking: "NBO-44444", origin: "Nairobi", senderPhone: "+254700000003" }, user: owner });
    await writeEntity({ collection: "tickets", id: "ticket-a", record: { id: "ticket-a", ref: "TKT-N-11111", office: "Nairobi", phone: "+254700000001", notes: "stale edit" }, user: owner });
  });
  assert.ok(cargo.docs.has("cargo-b"));
});

test("stale cargo edit cannot erase newly created ticket", async () => {
  const tickets = makeModel();
  const cargo = makeModel([{ id: "cargo-a", tracking: "NBO-55555", origin: "Nairobi" }]);
  await withMockedPersistence({ tickets, cargo }, async () => {
    await writeEntity({ collection: "tickets", record: { id: "ticket-b", ref: "TKT-N-22222", office: "Nairobi", phone: "+254700000004" }, user: owner });
    await writeEntity({ collection: "cargo", id: "cargo-a", record: { id: "cargo-a", tracking: "NBO-55555", origin: "Nairobi", destination: "Mogadishu", senderPhone: "+254700000003", status: "delivered" }, user: owner });
  });
  assert.ok(tickets.docs.has("ticket-b"));
});

test("updating a ticket preserves document identity and business reference", async () => {
  const tickets = makeModel([{ id: "ticket-a", _id: "mongo-ticket-a", createdAt: "2026-01-01T00:00:00.000Z", ref: "TKT-N-11111", office: "Nairobi", passenger: "Old" }]);
  await withMockedPersistence({ tickets }, async () => {
    await writeEntity({ collection: "tickets", id: "ticket-a", record: { id: "ticket-a", ref: "TKT-N-11111", office: "Nairobi", phone: "+254700000001", passenger: "New", updatedAt: "2026-02-01T00:00:00.000Z" }, user: owner });
  });
  const updated = tickets.docs.get("ticket-a");
  assert.equal(updated._id, "mongo-ticket-a");
  assert.equal(updated.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(updated.ref, "TKT-N-11111");
  assert.equal(updated.passenger, "New");
});

test("updating cargo preserves document identity and business reference", async () => {
  const cargo = makeModel([{ id: "cargo-a", _id: "mongo-cargo-a", createdAt: "2026-01-01T00:00:00.000Z", tracking: "NBO-55555", origin: "Nairobi", status: "in_transit" }]);
  await withMockedPersistence({ cargo }, async () => {
    await writeEntity({ collection: "cargo", id: "cargo-a", record: { id: "cargo-a", tracking: "NBO-55555", origin: "Nairobi", destination: "Mogadishu", senderPhone: "+254700000003", status: "arrived", updatedAt: "2026-02-01T00:00:00.000Z" }, user: owner });
  });
  const updated = cargo.docs.get("cargo-a");
  assert.equal(updated._id, "mongo-cargo-a");
  assert.equal(updated.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(updated.tracking, "NBO-55555");
  assert.equal(updated.status, "in_transit");
});
