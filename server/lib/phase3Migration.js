import Client from "../models/Client.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import Cargo from "../models/Cargo.js";
import { auditDuplicateClients, findOrCreateClient } from "./clientIdentity.js";
import { normalizePhoneDetails } from "./phone.js";

const stats = () => ({ scanned: 0, normalized: 0, linked: 0, clientsCreated: 0, skipped: 0, unresolved: [] });

const countClients = () => Client.countDocuments({});

const linkOne = async ({ row, name, phone, email = "", office, branchId, field, normalizedField }) => {
  const details = normalizePhoneDetails(phone, { office });
  if (!details.normalizedPhone) return { status: "unresolved" };
  const before = await countClients();
  const client = await findOrCreateClient({ name, phone, email, homeOffice: office, homeBranchId: branchId });
  const after = await countClients();
  row[field] = client._id;
  row[normalizedField] = client.normalizedPhone;
  await row.save();
  return { status: "linked", created: after > before };
};

export const runPhase3Migration = async () => {
  const duplicateAudit = await auditDuplicateClients();
  const clients = { scanned: 0, phonesNormalized: 0, skipped: 0, unresolved: [] };

  for (const client of await Client.find({})) {
    clients.scanned += 1;
    const details = normalizePhoneDetails(client.phone, { office: client.homeOffice });
    if (details.normalizedPhone && client.normalizedPhone !== details.normalizedPhone) {
      client.normalizedPhone = details.normalizedPhone;
      client.phoneIsValid = true;
      if (!client.preferredLanguage) client.preferredLanguage = "so";
      await client.save();
      clients.phonesNormalized += 1;
    } else if (!details.normalizedPhone) clients.unresolved.push(client.id || client._id.toString());
    else clients.skipped += 1;
  }

  const tickets = stats();
  for (const row of await Ticket.find({})) {
    tickets.scanned += 1;
    if (row.clientId) {
      tickets.skipped += 1;
      continue;
    }
    const result = await linkOne({ row, name: row.passenger, phone: row.phone, office: row.office, branchId: row.branchId, field: "clientId", normalizedField: "normalizedPhone" });
    if (result.status === "linked") {
      tickets.linked += 1;
      tickets.normalized += 1;
      if (result.created) tickets.clientsCreated += 1;
    } else tickets.unresolved.push(row.ref || row.id);
  }

  const visas = stats();
  for (const row of await Visa.find({})) {
    visas.scanned += 1;
    if (row.clientId) {
      visas.skipped += 1;
      continue;
    }
    const result = await linkOne({ row, name: row.applicant, phone: row.phone, email: row.email, office: row.office, branchId: row.branchId, field: "clientId", normalizedField: "normalizedPhone" });
    if (result.status === "linked") {
      visas.linked += 1;
      visas.normalized += 1;
      if (result.created) visas.clientsCreated += 1;
    } else visas.unresolved.push(row.ref || row.id);
  }

  const cargo = { ...stats(), sendersLinked: 0, receiversLinked: 0 };
  for (const row of await Cargo.find({})) {
    cargo.scanned += 1;
    let changed = false;
    if (!row.senderClientId) {
      const result = await linkOne({ row, name: row.sender, phone: row.senderPhone, email: row.senderEmail, office: row.origin, branchId: row.originBranchId, field: "senderClientId", normalizedField: "senderNormalizedPhone" });
      if (result.status === "linked") {
        cargo.linked += 1;
        cargo.sendersLinked += 1;
        cargo.normalized += 1;
        if (result.created) cargo.clientsCreated += 1;
        changed = true;
      } else cargo.unresolved.push(`${row.tracking || row.id}:sender`);
    }
    if (row.receiverPhone && !row.receiverClientId) {
      const result = await linkOne({ row, name: row.receiver, phone: row.receiverPhone, email: row.receiverEmail, office: row.destination, branchId: row.destinationBranchId, field: "receiverClientId", normalizedField: "receiverNormalizedPhone" });
      if (result.status === "linked") {
        cargo.linked += 1;
        cargo.receiversLinked += 1;
        cargo.normalized += 1;
        if (result.created) cargo.clientsCreated += 1;
        changed = true;
      } else cargo.unresolved.push(`${row.tracking || row.id}:receiver`);
    }
    if (!changed) cargo.skipped += 1;
  }

  return { clients, duplicateAudit, tickets, visas, cargo };
};
