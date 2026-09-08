import Client from "../models/Client.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import Cargo from "../models/Cargo.js";
import { normalizePhoneDetails } from "./phone.js";
import { randomToken } from "../utils/tokens.js";

const clean = (value) => String(value || "").trim();

// A person is identified by BOTH their name and phone number, because two
// different people (e.g. family members) legitimately share one phone. We match
// on a normalized name (lower-cased, accents stripped, whitespace collapsed) so
// harmless spelling/spacing differences still resolve to the same client.
export const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

export const languageOrDefault = (value) =>
  ["so", "en"].includes(value) ? value : "so";

export const buildClientSeed = ({
  name,
  phone,
  email = "",
  homeOffice = "",
  homeBranchId = null,
  preferredLanguage = "so",
}) => {
  const phoneDetails = normalizePhoneDetails(phone, { office: homeOffice });
  return {
    name: clean(name),
    normalizedName: normalizeName(name),
    phone: clean(phone),
    normalizedPhone: phoneDetails.normalizedPhone,
    phoneIsValid: phoneDetails.isValid,
    email: clean(email).toLowerCase(),
    homeOffice: clean(homeOffice),
    homeBranchId: homeBranchId || null,
    preferredLanguage: languageOrDefault(preferredLanguage),
    type: "Individual",
    notes: "Added automatically from a service record",
  };
};

export const findOrCreateClient = async (seed) => {
  const client = buildClientSeed(seed);
  if (!client.normalizedPhone) {
    const error = new Error(
      "A valid Somalia or Kenya phone number is required.",
    );
    error.status = 400;
    throw error;
  }

  // Identity is name + phone: the same phone can belong to several people, so we
  // only reuse a client when the normalized name also matches. A blank name
  // (should not happen for a real service) falls back to phone-only matching.
  const query = client.normalizedName
    ? {
        normalizedPhone: client.normalizedPhone,
        normalizedName: client.normalizedName,
      }
    : { normalizedPhone: client.normalizedPhone };
  const existing = await Client.findOne(query);
  if (existing) {
    const updates = {};
    if (!existing.normalizedName && client.normalizedName)
      updates.normalizedName = client.normalizedName;
    if (!existing.email && client.email) updates.email = client.email;
    if (!existing.phone && client.phone) updates.phone = client.phone;
    if (!existing.homeBranchId && client.homeBranchId)
      updates.homeBranchId = client.homeBranchId;
    if (!existing.homeOffice && client.homeOffice)
      updates.homeOffice = client.homeOffice;
    if (!existing.preferredLanguage) updates.preferredLanguage = "so";
    if (Object.keys(updates).length) {
      Object.assign(existing, updates);
      await existing.save();
    }
    return existing;
  }

  // The client id must be unique per person, so it can no longer be derived
  // from the phone alone (that collided when people share a number).
  return Client.create({
    id: `client_${client.normalizedPhone}_${randomToken(4)}`,
    ...client,
    isActive: true,
  });
};

export const attachClientRelationships = async (collection, record) => {
  if (collection === "clients") {
    const seed = buildClientSeed({
      name: record.name,
      phone: record.phone,
      email: record.email,
      homeOffice: record.homeOffice,
      homeBranchId: record.homeBranchId,
      preferredLanguage: record.preferredLanguage,
    });
    return {
      ...record,
      ...seed,
      id:
        record.id ||
        `client_${seed.normalizedPhone || "na"}_${randomToken(4)}`,
    };
  }

  if (collection === "tickets") {
    const client = await findOrCreateClient({
      name: record.passenger,
      phone: record.phone,
      homeOffice: record.office,
      homeBranchId: record.branchId,
    });
    return {
      ...record,
      clientId: client._id,
      normalizedPhone: client.normalizedPhone,
    };
  }

  if (collection === "visas") {
    const client = await findOrCreateClient({
      name: record.applicant,
      phone: record.phone,
      email: record.email,
      homeOffice: record.office,
      homeBranchId: record.branchId,
    });
    return {
      ...record,
      clientId: client._id,
      normalizedPhone: client.normalizedPhone,
    };
  }

  if (collection === "cargo") {
    const sender = await findOrCreateClient({
      name: record.sender,
      phone: record.senderPhone,
      email: record.senderEmail,
      homeOffice: record.origin,
      homeBranchId: record.originBranchId,
    });
    const receiver = record.receiverPhone
      ? await findOrCreateClient({
          name: record.receiver,
          phone: record.receiverPhone,
          email: record.receiverEmail,
          homeOffice: record.destination,
          homeBranchId: record.destinationBranchId,
        })
      : null;
    return {
      ...record,
      senderClientId: sender._id,
      senderNormalizedPhone: sender.normalizedPhone,
      receiverClientId: receiver?._id || null,
      receiverNormalizedPhone: receiver?.normalizedPhone || "",
      paymentResponsibility: ["sender", "receiver"].includes(
        record.paymentResponsibility,
      )
        ? record.paymentResponsibility
        : "unresolved",
      payerClientId:
        record.paymentResponsibility === "sender"
          ? sender._id
          : record.paymentResponsibility === "receiver"
            ? receiver?._id || null
            : null,
    };
  }

  return record;
};

export const auditDuplicateClients = async () => {
  const rows = await Client.find({});
  const groups = new Map();
  let normalized = 0;
  const unresolved = [];
  for (const row of rows) {
    const details = normalizePhoneDetails(row.phone, {
      office: row.homeOffice,
    });
    if (details.normalizedPhone) {
      normalized += 1;
      groups.set(details.normalizedPhone, [
        ...(groups.get(details.normalizedPhone) || []),
        row.id || row._id.toString(),
      ]);
    } else {
      unresolved.push(row.id || row._id.toString());
    }
  }
  return {
    scanned: rows.length,
    phonesNormalized: normalized,
    unresolved,
    duplicateGroups: [...groups.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([phone, ids]) => ({ normalizedPhone: phone, ids })),
  };
};

export const clientHistory = async (clientId, user) => {
  const [tickets, visas, cargo] = await Promise.all([
    Ticket.find({ clientId }),
    Visa.find({ clientId }),
    Cargo.find({
      $or: [{ senderClientId: clientId }, { receiverClientId: clientId }],
    }),
  ]);
  const branchId =
    user.role === "operator" ? user.assignedBranchId?.toString?.() : "";
  const allowed = (item) =>
    !branchId ||
    [
      item.branchId,
      item.originBranchId,
      item.destinationBranchId,
      item.paidByBranchId,
    ].some((id) => String(id || "") === branchId);
  return {
    tickets: tickets.filter(allowed),
    visas: visas.filter(allowed),
    cargo: cargo.filter(allowed),
  };
};
