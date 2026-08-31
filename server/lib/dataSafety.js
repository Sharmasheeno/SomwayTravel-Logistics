import DataSnapshot from "../models/DataSnapshot.js";
import { randomToken } from "../utils/tokens.js";

export const PROTECTED_COLLECTIONS = [
  "tickets",
  "cargo",
  "visas",
  "expenses",
  "suppliers",
  "clients",
  "closes",
];

export const REQUIRED_SNAPSHOT_COLLECTIONS = [
  ...PROTECTED_COLLECTIONS,
  "rates",
  "startingBalances",
  "activities",
];

export const validateAgencySnapshotShape = (data) => {
  const missingCollections = REQUIRED_SNAPSHOT_COLLECTIONS.filter((key) => !Array.isArray(data?.[key]));
  return {
    ok: missingCollections.length === 0,
    missingCollections,
  };
};

export const countEntities = (data) =>
  [
    "tickets",
    "cargo",
    "visas",
    "expenses",
    "suppliers",
    "clients",
    "closes",
    "rates",
    "startingBalances",
    "activities",
  ].reduce((counts, key) => {
    counts[key] = Array.isArray(data?.[key]) ? data[key].length : 0;
    return counts;
  }, {});

const isLargeDrop = (currentCount, incomingCount) => {
  if (incomingCount >= currentCount) return false;
  const removed = currentCount - incomingCount;
  if (currentCount >= 5 && incomingCount === 0) return true;
  return currentCount >= 20 && removed >= 10 && removed / currentCount >= 0.5;
};

export const evaluateWriteSafety = (currentData, incomingData, options = {}) => {
  if (options.allowLargeDeletes) return { ok: true, violations: [] };

  const currentCounts = countEntities(currentData);
  const incomingCounts = countEntities(incomingData);
  const violations = PROTECTED_COLLECTIONS.filter((key) =>
    isLargeDrop(currentCounts[key] || 0, incomingCounts[key] || 0)
  ).map((key) => ({
    collection: key,
    currentCount: currentCounts[key] || 0,
    incomingCount: incomingCounts[key] || 0,
  }));

  return { ok: violations.length === 0, violations };
};

export const describeSafetyViolations = (violations) =>
  violations
    .map((item) => `${item.collection}: ${item.currentCount} existing -> ${item.incomingCount} incoming`)
    .join("; ");

export const createDataSnapshot = async (data, actor, reason = "before-data-write") => {
  const snapshot = await DataSnapshot.create({
    id: `snapshot_${Date.now().toString(36)}_${randomToken(6)}`,
    at: new Date().toISOString(),
    reason,
    actorId: actor?.id?.toString?.() || actor?._id?.toString?.() || "",
    actorName: actor?.name || "",
    actorRole: actor?.role || "",
    entityCounts: countEntities(data),
    data,
  });

  const excess = await DataSnapshot.find({}).sort({ at: -1 }).skip(50).select("_id");
  if (excess.length) await DataSnapshot.deleteMany({ _id: { $in: excess.map((row) => row._id) } });

  return snapshot;
};
