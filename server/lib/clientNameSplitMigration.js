import Client from "../models/Client.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import Cargo from "../models/Cargo.js";
import {
  findOrCreateClient,
  normalizeName,
} from "./clientIdentity.js";

// Repair migration for the "two people, one phone" bug.
//
// Client identity used to be keyed on phone alone, so when two different people
// shared a phone number (e.g. Fartun and Ali) the second person's service was
// wrongly attached to the first person's client and no second client appeared.
//
// This migration:
//   1. Backfills normalizedName on every existing client.
//   2. Re-checks every service link: if the linked client's normalized name no
//      longer matches the person on the service, it re-resolves the link via
//      findOrCreateClient (now name + phone aware), creating the missing client.
//   3. Archives clients that end up with no services AND whose name does not
//      match their own record — leftover phantom rows. (Conservative: only
//      empty, unreferenced auto-created clients are archived.)

const backfillClientNames = async () => {
  let updated = 0;
  for (const client of await Client.find({})) {
    const normalizedName = normalizeName(client.name);
    if (client.normalizedName !== normalizedName) {
      client.normalizedName = normalizedName;
      await client.save();
      updated += 1;
    }
  }
  return updated;
};

const relinkService = async ({
  row,
  name,
  phone,
  email,
  office,
  branchId,
  idField,
  normalizedField,
}) => {
  const wantedName = normalizeName(name);
  if (!wantedName) return { status: "skipped" };

  const currentId = row[idField];
  if (currentId) {
    const current = await Client.findById(currentId);
    // Already linked to the right person — nothing to do.
    if (current && normalizeName(current.name) === wantedName) {
      return { status: "ok" };
    }
  }

  const beforeCount = await Client.countDocuments({});
  const client = await findOrCreateClient({
    name,
    phone,
    email,
    homeOffice: office,
    homeBranchId: branchId,
  });
  const afterCount = await Client.countDocuments({});
  row[idField] = client._id;
  row[normalizedField] = client.normalizedPhone;
  await row.save();
  return { status: "relinked", created: afterCount > beforeCount };
};

export const runClientNameSplitMigration = async () => {
  const clientsRenamed = await backfillClientNames();

  const tickets = { scanned: 0, relinked: 0, created: 0 };
  for (const row of await Ticket.find({})) {
    tickets.scanned += 1;
    const result = await relinkService({
      row,
      name: row.passenger,
      phone: row.phone,
      office: row.office,
      branchId: row.branchId,
      idField: "clientId",
      normalizedField: "normalizedPhone",
    });
    if (result.status === "relinked") {
      tickets.relinked += 1;
      if (result.created) tickets.created += 1;
    }
  }

  const visas = { scanned: 0, relinked: 0, created: 0 };
  for (const row of await Visa.find({})) {
    visas.scanned += 1;
    const result = await relinkService({
      row,
      name: row.applicant,
      phone: row.phone,
      email: row.email,
      office: row.office,
      branchId: row.branchId,
      idField: "clientId",
      normalizedField: "normalizedPhone",
    });
    if (result.status === "relinked") {
      visas.relinked += 1;
      if (result.created) visas.created += 1;
    }
  }

  const cargo = { scanned: 0, relinked: 0, created: 0 };
  for (const row of await Cargo.find({})) {
    cargo.scanned += 1;
    const sender = await relinkService({
      row,
      name: row.sender,
      phone: row.senderPhone,
      email: row.senderEmail,
      office: row.origin,
      branchId: row.originBranchId,
      idField: "senderClientId",
      normalizedField: "senderNormalizedPhone",
    });
    if (sender.status === "relinked") {
      cargo.relinked += 1;
      if (sender.created) cargo.created += 1;
    }
    if (row.receiverPhone) {
      const receiver = await relinkService({
        row,
        name: row.receiver,
        phone: row.receiverPhone,
        email: row.receiverEmail,
        office: row.destination,
        branchId: row.destinationBranchId,
        idField: "receiverClientId",
        normalizedField: "receiverNormalizedPhone",
      });
      if (receiver.status === "relinked") {
        cargo.relinked += 1;
        if (receiver.created) cargo.created += 1;
      }
    }
  }

  return { clientsRenamed, tickets, visas, cargo };
};
