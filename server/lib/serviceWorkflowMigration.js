import Cargo from "../models/Cargo.js";
import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";

const normalizeValues = async (Model, mappings, fallback) => {
  let scanned = 0;
  let updated = 0;
  for (const [legacy, canonical] of Object.entries(mappings)) {
    const result = await Model.updateMany(
      { status: legacy },
      { $set: { status: canonical } },
    );
    scanned += result.matchedCount || 0;
    updated += result.modifiedCount || 0;
  }
  const canonical = [...new Set(Object.values(mappings))];
  const fallbackResult = await Model.updateMany(
    { status: { $nin: canonical } },
    { $set: { status: fallback } },
  );
  scanned += fallbackResult.matchedCount || 0;
  updated += fallbackResult.modifiedCount || 0;
  const versionResult = await Model.updateMany(
    {
      $or: [{ workflowVersion: { $exists: false } }, { workflowVersion: null }],
    },
    { $set: { workflowVersion: 0 } },
  );
  updated += versionResult.modifiedCount || 0;
  return { scanned, updated };
};

export const runServiceWorkflowMigration = async () => ({
  tickets: await normalizeValues(
    Ticket,
    {
      booked: "booked",
      Booked: "booked",
      created: "booked",
      Created: "booked",
      issued: "issued",
      Issued: "issued",
      changed: "changed",
      Changed: "changed",
      cancelled: "cancelled",
      Cancelled: "cancelled",
      canceled: "cancelled",
      Canceled: "cancelled",
    },
    "booked",
  ),
  visas: await normalizeValues(
    Visa,
    {
      submitted: "submitted",
      Submitted: "submitted",
      approved: "approved",
      Approved: "approved",
      refused: "refused",
      Refused: "refused",
      delivered: "delivered",
      Delivered: "delivered",
    },
    "submitted",
  ),
  cargo: await normalizeValues(
    Cargo,
    {
      received: "received",
      Received: "received",
      in_transit: "in_transit",
      "In Transit": "in_transit",
      arrived: "arrived",
      Arrived: "arrived",
      ready_for_collection: "ready_for_collection",
      "Ready for Collection": "ready_for_collection",
      delivered: "delivered",
      Delivered: "delivered",
      cancelled: "cancelled",
      Cancelled: "cancelled",
      claim: "claim",
      Claim: "claim",
    },
    "received",
  ),
});
