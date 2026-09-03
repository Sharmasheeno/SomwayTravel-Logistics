import Cargo from "../models/Cargo.js";
import { assertActiveBranch } from "./branches.js";

export const CARGO_STATUSES = [
  "received",
  "in_transit",
  "arrived",
  "ready_for_collection",
  "delivered",
  "cancelled",
  "claim",
];
export const CARGO_STATUS_LABELS = {
  received: "Received",
  in_transit: "In Transit",
  arrived: "Arrived",
  ready_for_collection: "Ready for Collection",
  delivered: "Delivered",
  cancelled: "Cancelled",
  claim: "Claim",
};

const LEGACY_STATUS = {
  "In Transit": "in_transit",
  Arrived: "arrived",
  Delivered: "delivered",
  Claim: "claim",
  Received: "received",
  "Ready for Collection": "ready_for_collection",
  Cancelled: "cancelled",
};

const ALLOWED_TRANSITIONS = {
  received: ["in_transit", "cancelled"],
  in_transit: ["arrived", "cancelled"],
  arrived: ["ready_for_collection", "delivered", "cancelled"],
  ready_for_collection: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
  claim: [],
};

export const normalizeCargoStatus = (status) => {
  const value = String(status || "").trim();
  if (CARGO_STATUSES.includes(value)) return value;
  return LEGACY_STATUS[value] || "received";
};

export const cargoStatusLabel = (status) =>
  CARGO_STATUS_LABELS[normalizeCargoStatus(status)] || "Received";

export const publicCargoTimeline = (cargo) => {
  const history = Array.isArray(cargo.statusHistory) ? cargo.statusHistory : [];
  return history
    .filter((entry) =>
      [
        "received",
        "in_transit",
        "arrived",
        "ready_for_collection",
        "delivered",
        "cancelled",
        "claim",
      ].includes(normalizeCargoStatus(entry.toStatus || entry.status)),
    )
    .map((entry) => ({
      status: normalizeCargoStatus(entry.toStatus || entry.status),
      label: cargoStatusLabel(entry.toStatus || entry.status),
      at: entry.at || "",
    }));
};

const userBranchId = (user) => user.assignedBranchId?.toString?.() || "";
const isOwner = (user) => user.role === "owner";
const sameId = (a, b) => String(a || "") === String(b || "");

export const canViewCargo = (cargo, user) =>
  isOwner(user) ||
  [cargo.originBranchId, cargo.destinationBranchId, cargo.paidByBranchId].some(
    (branchId) => sameId(branchId, userBranchId(user)),
  );

const actionBranch = (cargo, toStatus, user) => {
  if (toStatus === "in_transit") return cargo.originBranchId;
  if (["arrived", "ready_for_collection", "delivered"].includes(toStatus))
    return cargo.destinationBranchId;
  if (toStatus === "cancelled")
    return userBranchId(user) || cargo.originBranchId;
  return userBranchId(user) || cargo.originBranchId;
};

export const assertCargoTransitionAllowed = (cargo, toStatus, user) => {
  const fromStatus = normalizeCargoStatus(cargo.status);
  const nextStatus = normalizeCargoStatus(toStatus);
  if (!CARGO_STATUSES.includes(nextStatus)) {
    const error = new Error("Unknown cargo status.");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_TRANSITIONS[fromStatus]?.includes(nextStatus)) {
    const error = new Error(
      `Cargo cannot move from ${cargoStatusLabel(fromStatus)} to ${cargoStatusLabel(nextStatus)}.`,
    );
    error.status = 400;
    throw error;
  }
  if (isOwner(user)) return;
  if (user.role !== "operator" || !user.assignedBranchId) {
    const error = new Error("This account cannot update cargo workflow.");
    error.status = 403;
    throw error;
  }
  if (
    nextStatus === "in_transit" &&
    !sameId(cargo.originBranchId, user.assignedBranchId)
  ) {
    const error = new Error("Only the origin branch can dispatch this cargo.");
    error.status = 403;
    throw error;
  }
  if (
    ["arrived", "ready_for_collection", "delivered"].includes(nextStatus) &&
    !sameId(cargo.destinationBranchId, user.assignedBranchId)
  ) {
    const error = new Error(
      "Only the destination branch can complete this cargo step.",
    );
    error.status = 403;
    throw error;
  }
  if (nextStatus === "cancelled" && !canViewCargo(cargo, user)) {
    const error = new Error("This cargo belongs to another branch.");
    error.status = 403;
    throw error;
  }
};

export const buildCargoHistoryEntry = ({
  fromStatus = "",
  toStatus,
  user,
  branchId,
  note = "",
}) => ({
  event: `cargo_${normalizeCargoStatus(toStatus)}`,
  fromStatus: fromStatus ? normalizeCargoStatus(fromStatus) : "",
  toStatus: normalizeCargoStatus(toStatus),
  at: new Date().toISOString(),
  userId: user?.id?.toString?.() || user?._id?.toString?.() || "",
  userName: user?.name || "",
  branchId: branchId || null,
  note,
});

export const prepareNewCargoLifecycle = (record, user) => {
  const status = "received";
  const branchId = record.originBranchId || user?.assignedBranchId || null;
  const entry = buildCargoHistoryEntry({
    toStatus: status,
    user,
    branchId,
    note: "Cargo received",
  });
  return {
    ...record,
    status,
    workflowVersion: 0,
    receivedAt: record.receivedAt || entry.at,
    receivedByUserId: record.receivedByUserId || entry.userId,
    statusHistory:
      Array.isArray(record.statusHistory) && record.statusHistory.length
        ? record.statusHistory
        : [entry],
  };
};

export const assertCargoRouteEditable = (existing, user) => {
  if (!existing || isOwner(user)) return;
  const status = normalizeCargoStatus(existing.status);
  if (status === "received") return;
  const error = new Error("Cargo route cannot be changed after dispatch.");
  error.status = 403;
  throw error;
};

export const transitionCargoStatus = async ({
  id,
  toStatus,
  user,
  note = "",
  cancellationReason = "",
}) => {
  const cargo = await Cargo.findOne({ id });
  if (!cargo) {
    const error = new Error("Cargo record not found.");
    error.status = 404;
    throw error;
  }
  if (!canViewCargo(cargo, user)) {
    const error = new Error("This cargo belongs to another branch.");
    error.status = 403;
    throw error;
  }
  const nextStatus = normalizeCargoStatus(toStatus);
  if (
    nextStatus === "cancelled" &&
    !String(cancellationReason || note).trim()
  ) {
    const error = new Error("Cancellation reason is required.");
    error.status = 400;
    throw error;
  }
  assertCargoTransitionAllowed(cargo, nextStatus, user);
  const fromStatus = normalizeCargoStatus(cargo.status);
  const branchId = actionBranch(cargo, nextStatus, user);
  if (branchId) await assertActiveBranch(branchId);
  const entry = buildCargoHistoryEntry({
    fromStatus,
    toStatus: nextStatus,
    user,
    branchId,
    note: nextStatus === "cancelled" ? cancellationReason || note : note,
  });
  const fields = {
    status: nextStatus,
    updatedBy: entry.userId,
    updatedAt: entry.at,
  };
  if (nextStatus === "in_transit") {
    fields.dispatchedAt = entry.at;
    fields.dispatchedByUserId = entry.userId;
  }
  if (nextStatus === "arrived") {
    fields.arrivedAt = entry.at;
    fields.arrivedByUserId = entry.userId;
  }
  if (nextStatus === "ready_for_collection") {
    fields.readyForCollectionAt = entry.at;
    fields.readyForCollectionByUserId = entry.userId;
  }
  if (nextStatus === "delivered") {
    fields.deliveredAt = entry.at;
    fields.deliveredByUserId = entry.userId;
    fields.dateDelivered = cargo.dateDelivered || entry.at.slice(0, 10);
  }
  if (nextStatus === "cancelled") {
    fields.cancelledAt = entry.at;
    fields.cancelledByUserId = entry.userId;
    fields.cancellationReason = cancellationReason || note;
  }
  const updated = await Cargo.findOneAndUpdate(
    {
      id,
      status: cargo.status,
      workflowVersion: cargo.workflowVersion || 0,
    },
    {
      $set: fields,
      $inc: { workflowVersion: 1 },
      $push: { statusHistory: entry },
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    const error = new Error(
      "This cargo changed in another session. Reload and try again.",
    );
    error.status = 409;
    throw error;
  }
  return updated;
};
