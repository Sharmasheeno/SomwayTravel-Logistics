import assert from "node:assert/strict";
import test from "node:test";

import Activity from "../server/models/Activity.js";
import Branch from "../server/models/Branch.js";
import BranchPaymentMethod from "../server/models/BranchPaymentMethod.js";
import Client from "../server/models/Client.js";
import PaymentMethod from "../server/models/PaymentMethod.js";
import { attachClientRelationships, clientHistory, findOrCreateClient } from "../server/lib/clientIdentity.js";
import { ENTITY_MODELS, writeEntity } from "../server/lib/entityPersistence.js";
import { runPhase3Migration } from "../server/lib/phase3Migration.js";

const branchA = "68b400000000000000000001";
const branchB = "68b400000000000000000002";
const branchC = "68b400000000000000000003";
const owner = { id: "owner", name: "Owner", role: "owner" };

const doc = (record) => ({ ...record, async save() { return this; } });

const makeEntityModel = (initial = []) => {
  const docs = new Map(initial.map((item) => [item.id, doc(item)]));
  return {
    docs,
    async findOne(query) {
      return docs.get(query.id) || null;
    },
    async findOneAndUpdate(query, update) {
      const current = docs.get(query.id) || doc({ id: query.id, _id: `mongo-${query.id}` });
      Object.assign(current, update.$set);
      docs.set(query.id, current);
      return current;
    },
    async deleteOne(query) {
      docs.delete(query.id);
    },
  };
};

const makeClientStore = () => {
  const docs = [];
  const findByNormalized = (phone) => docs.find((item) => item.normalizedPhone === phone) || null;
  return {
    docs,
    async findOne(query) {
      if (query.normalizedPhone) {
        const found = findByNormalized(query.normalizedPhone);
        if (found && query.id?.$ne && found.id === query.id.$ne) return null;
        return found;
      }
      if (query.id) return docs.find((item) => item.id === query.id) || null;
      return null;
    },
    async create(record) {
      const created = doc({ ...record, _id: `client-${docs.length + 1}` });
      docs.push(created);
      return created;
    },
  };
};

const patchRelationships = async (fn) => {
  const clients = makeClientStore();
  const originals = {
    clientFindOne: Client.findOne,
    clientCreate: Client.create,
    branchFindOne: Branch.findOne,
    branchPaymentMethodFindOne: BranchPaymentMethod.findOne,
    paymentMethodFindOne: PaymentMethod.findOne,
    activityCreate: Activity.create,
  };
  Client.findOne = clients.findOne;
  Client.create = clients.create;
  Branch.findOne = async (query) => ({ _id: query._id, isActive: true });
  PaymentMethod.findOne = async () => ({ _id: "pm-cash", name: "Cash", code: "cash", isActive: true });
  BranchPaymentMethod.findOne = async () => ({ branchId: branchB, paymentMethodId: "pm-cash", allowedCurrencies: ["KES", "USD"], isActive: true });
  Activity.create = async (record) => record;
  try {
    await fn(clients);
  } finally {
    Client.findOne = originals.clientFindOne;
    Client.create = originals.clientCreate;
    Branch.findOne = originals.branchFindOne;
    BranchPaymentMethod.findOne = originals.branchPaymentMethodFindOne;
    PaymentMethod.findOne = originals.paymentMethodFindOne;
    Activity.create = originals.activityCreate;
  }
};

test("ticket, visa, and cargo sender reuse one client for equivalent phone forms", async () => {
  await patchRelationships(async (clients) => {
    const ticket = await attachClientRelationships("tickets", { passenger: "Test Client A", phone: "0612345678", office: "Mogadishu Office", branchId: branchB });
    const visa = await attachClientRelationships("visas", { applicant: "Test Client A", phone: "00252612345678", office: "Hargeisa Office", branchId: branchC });
    const cargo = await attachClientRelationships("cargo", { sender: "Test Client A", senderPhone: "+252612345678", receiver: "Receiver", receiverPhone: "+254712345678", origin: "Nairobi Office", destination: "Mogadishu Office", originBranchId: branchA, destinationBranchId: branchB });
    assert.equal(clients.docs.length, 2);
    assert.equal(String(ticket.clientId), "client-1");
    assert.equal(String(visa.clientId), "client-1");
    assert.equal(String(cargo.senderClientId), "client-1");
  });
});

test("same name with different phones creates separate clients", async () => {
  await patchRelationships(async (clients) => {
    await findOrCreateClient({ name: "Ahmed Ali", phone: "+252612345671", homeOffice: "Mogadishu Office" });
    await findOrCreateClient({ name: "Ahmed Ali", phone: "+252612345672", homeOffice: "Mogadishu Office" });
    assert.equal(clients.docs.length, 2);
  });
});

test("same phone with different display name reuses client without overwriting trusted name", async () => {
  await patchRelationships(async (clients) => {
    const first = await findOrCreateClient({ name: "Ahmed Mohamed Hassan", phone: "+252612345673", homeOffice: "Mogadishu Office" });
    const second = await findOrCreateClient({ name: "Ahmed M.", phone: "0612345673", homeOffice: "Mogadishu Office" });
    assert.equal(first._id, second._id);
    assert.equal(clients.docs.length, 1);
    assert.equal(clients.docs[0].name, "Ahmed Mohamed Hassan");
  });
});

test("cargo sender and receiver are independent clients and sender is reused", async () => {
  await patchRelationships(async (clients) => {
    const first = await attachClientRelationships("cargo", { sender: "Sender A", senderPhone: "+252612345674", receiver: "Receiver B", receiverPhone: "+254712345674", origin: "Mogadishu Office", destination: "Nairobi Office" });
    const second = await attachClientRelationships("cargo", { sender: "Sender A", senderPhone: "0612345674", receiver: "Receiver C", receiverPhone: "+254712345675", origin: "Mogadishu Office", destination: "Nairobi Office" });
    assert.equal(clients.docs.length, 3);
    assert.equal(String(first.senderClientId), String(second.senderClientId));
    assert.notEqual(String(first.senderClientId), String(first.receiverClientId));
  });
});

test("manual client duplicate phone is rejected through entity persistence", async () => {
  await patchRelationships(async (clients) => {
    const clientsModel = makeEntityModel();
    const originals = { clients: ENTITY_MODELS.clients };
    ENTITY_MODELS.clients = clientsModel;
    try {
      await writeEntity({ collection: "clients", record: { id: "manual-1", name: "Manual A", phone: "+252612345676", homeOffice: "Mogadishu Office" }, user: owner });
      clients.docs.push(doc({ id: "manual-1", _id: "client-manual-1", normalizedPhone: "+252612345676" }));
      await assert.rejects(
        writeEntity({ collection: "clients", record: { id: "manual-2", name: "Manual B", phone: "0612345676", homeOffice: "Mogadishu Office" }, user: owner }),
        /phone number already exists/
      );
    } finally {
      ENTITY_MODELS.clients = originals.clients;
    }
  });
});

test("client profile edits do not rewrite historical transaction snapshots", async () => {
  await patchRelationships(async () => {
    const tickets = makeEntityModel();
    const clientsModel = makeEntityModel();
    const originals = { tickets: ENTITY_MODELS.tickets, clients: ENTITY_MODELS.clients };
    ENTITY_MODELS.tickets = tickets;
    ENTITY_MODELS.clients = clientsModel;
    try {
      const saved = await writeEntity({ collection: "tickets", record: { id: "ticket-snapshot", ref: "TKT-SNAP", office: "Mogadishu Office", branchId: branchB, passenger: "Ahmed Original", phone: "+252612345677", type: "Sale", currency: "USD", paymentMethod: "Cash" }, user: owner });
      await writeEntity({ collection: "clients", record: { id: "client_+252612345677", name: "Ahmed Edited", phone: "+252612345677", homeOffice: "Mogadishu Office" }, user: owner });
      assert.equal(tickets.docs.get("ticket-snapshot").clientId, saved.clientId);
      assert.equal(tickets.docs.get("ticket-snapshot").passenger, "Ahmed Original");
      assert.equal(tickets.docs.get("ticket-snapshot").phone, "+252612345677");
    } finally {
      ENTITY_MODELS.tickets = originals.tickets;
      ENTITY_MODELS.clients = originals.clients;
    }
  });
});

test("client history keeps operator visibility branch-scoped", async () => {
  const makeFindable = (rows) => ({ find: async () => rows });
  const originals = { ticket: ENTITY_MODELS.tickets };
  const clientId = "client-history";
  const ticketRows = [
    { id: "nbo", clientId, branchId: branchA },
    { id: "mog", clientId, branchId: branchB },
  ];
  const cargoRows = [
    { id: "hga", senderClientId: clientId, originBranchId: branchC, destinationBranchId: branchA },
    { id: "mog-cargo", senderClientId: clientId, originBranchId: branchB, destinationBranchId: branchC },
  ];
  const Ticket = (await import("../server/models/Ticket.js")).default;
  const Visa = (await import("../server/models/Visa.js")).default;
  const Cargo = (await import("../server/models/Cargo.js")).default;
  const modelOriginals = { TicketFind: Ticket.find, VisaFind: Visa.find, CargoFind: Cargo.find };
  Ticket.find = makeFindable(ticketRows).find;
  Visa.find = makeFindable([]).find;
  Cargo.find = makeFindable(cargoRows).find;
  try {
    const ownerHistory = await clientHistory(clientId, owner);
    const nairobiHistory = await clientHistory(clientId, { role: "operator", assignedBranchId: branchA });
    assert.equal(ownerHistory.tickets.length, 2);
    assert.equal(ownerHistory.cargo.length, 2);
    assert.deepEqual(nairobiHistory.tickets.map((item) => item.id), ["nbo"]);
    assert.deepEqual(nairobiHistory.cargo.map((item) => item.id), ["hga"]);
  } finally {
    Ticket.find = modelOriginals.TicketFind;
    Visa.find = modelOriginals.VisaFind;
    Cargo.find = modelOriginals.CargoFind;
    ENTITY_MODELS.tickets = originals.ticket;
  }
});

test("phase 3 migration backfills safe client relationships and reports unresolved records", async () => {
  const Ticket = (await import("../server/models/Ticket.js")).default;
  const Visa = (await import("../server/models/Visa.js")).default;
  const Cargo = (await import("../server/models/Cargo.js")).default;
  const clients = makeClientStore();
  const tickets = [doc({ id: "mig-ticket", ref: "TKT-MIG", passenger: "Mig Client", phone: "+252612345680", office: "Mogadishu Office", branchId: branchB })];
  const visas = [doc({ id: "mig-visa", ref: "VIS-MIG", applicant: "Mig Client", phone: "0612345680", office: "Mogadishu Office", branchId: branchB })];
  const cargo = [doc({ id: "mig-cargo", tracking: "MIG-CARGO", sender: "Mig Client", senderPhone: "00252612345680", receiver: "Unknown", receiverPhone: "123", origin: "Mogadishu Office", destination: "Nairobi Office", originBranchId: branchB, destinationBranchId: branchA })];
  const originals = { clientFind: Client.find, clientFindOne: Client.findOne, clientCreate: Client.create, clientCount: Client.countDocuments, ticketFind: Ticket.find, visaFind: Visa.find, cargoFind: Cargo.find };
  Client.find = async () => clients.docs;
  Client.findOne = clients.findOne;
  Client.create = clients.create;
  Client.countDocuments = async () => clients.docs.length;
  Ticket.find = async () => tickets;
  Visa.find = async () => visas;
  Cargo.find = async () => cargo;
  try {
    const result = await runPhase3Migration();
    assert.equal(result.tickets.linked, 1);
    assert.equal(result.visas.linked, 1);
    assert.equal(result.cargo.sendersLinked, 1);
    assert.equal(result.cargo.receiversLinked, 0);
    assert.deepEqual(result.cargo.unresolved, ["MIG-CARGO:receiver"]);
    assert.equal(clients.docs.length, 1);
    assert.equal(String(tickets[0].clientId), String(visas[0].clientId));
    assert.equal(String(cargo[0].senderClientId), String(tickets[0].clientId));
  } finally {
    Client.find = originals.clientFind;
    Client.findOne = originals.clientFindOne;
    Client.create = originals.clientCreate;
    Client.countDocuments = originals.clientCount;
    Ticket.find = originals.ticketFind;
    Visa.find = originals.visaFind;
    Cargo.find = originals.cargoFind;
  }
});
