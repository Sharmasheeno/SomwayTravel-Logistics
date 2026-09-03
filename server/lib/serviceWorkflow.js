import Ticket from "../models/Ticket.js";
import Visa from "../models/Visa.js";
import { assertBranchAccess } from "./branches.js";

export const TICKET_STATUSES = ["booked", "issued", "changed", "cancelled"];
export const VISA_STATUSES = ["submitted", "approved", "refused", "delivered"];

const TRANSITIONS = {
  ticket: {
    booked: ["issued", "cancelled"],
    issued: ["changed", "cancelled"],
    changed: ["issued", "cancelled"],
    cancelled: [],
  },
  visa: {
    submitted: ["approved", "refused"],
    approved: ["delivered"],
    refused: [],
    delivered: [],
  },
};

const MODELS = { ticket: Ticket, visa: Visa };
const STATUSES = { ticket: TICKET_STATUSES, visa: VISA_STATUSES };

export const normalizeServiceStatus = (kind, value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  const aliases =
    kind === "visa"
      ? {
          submitted: "submitted",
          approved: "approved",
          refused: "refused",
          delivered: "delivered",
        }
      : {
          booked: "booked",
          created: "booked",
          issued: "issued",
          changed: "changed",
          cancelled: "cancelled",
          canceled: "cancelled",
        };
  return aliases[normalized] || STATUSES[kind]?.[0] || "";
};

export const prepareNewServiceWorkflow = (kind, record, user) => {
  const status = normalizeServiceStatus(kind, record.status);
  const at = new Date().toISOString();
  return {
    ...record,
    status,
    workflowVersion: 0,
    statusHistory: [
      {
        event: `${kind}_${status}`,
        fromStatus: "",
        toStatus: status,
        at,
        userId: user.id?.toString?.() || user._id?.toString?.() || "",
        userName: user.name || "",
        branchId: record.branchId || null,
        note: `${kind === "ticket" ? "Ticket" : "Visa"} created`,
      },
    ],
  };
};

export const transitionServiceStatus = async ({
  kind,
  id,
  toStatus,
  note = "",
  correctionReason = "",
  user,
}) => {
  const Model = MODELS[kind];
  if (!Model) {
    throw Object.assign(new Error("Unknown service workflow."), {
      status: 400,
    });
  }
  const record = await Model.findOne({ id });
  if (!record) {
    throw Object.assign(new Error("Service record not found."), {
      status: 404,
    });
  }
  if (user.role !== "owner") await assertBranchAccess(user, record.branchId);
  const fromStatus = normalizeServiceStatus(kind, record.status);
  const nextStatus = normalizeServiceStatus(kind, toStatus);
  if (!STATUSES[kind].includes(nextStatus) || nextStatus === fromStatus) {
    throw Object.assign(new Error("Choose a valid next status."), {
      status: 400,
    });
  }
  const normallyAllowed = TRANSITIONS[kind][fromStatus]?.includes(nextStatus);
  const reason = String(correctionReason || "").trim();
  if (!normallyAllowed && (user.role !== "owner" || !reason)) {
    throw Object.assign(
      new Error(
        user.role === "owner"
          ? "A correction reason is required for this status change."
          : `Status cannot move from ${fromStatus} to ${nextStatus}.`,
      ),
      { status: 409 },
    );
  }
  const at = new Date().toISOString();
  const entry = {
    event: `${kind}_${nextStatus}`,
    fromStatus,
    toStatus: nextStatus,
    at,
    userId: user.id?.toString?.() || user._id?.toString?.() || "",
    userName: user.name || "",
    branchId: record.branchId || null,
    note: reason || String(note || "").trim(),
  };
  const updated = await Model.findOneAndUpdate(
    {
      id,
      status: record.status,
      workflowVersion: record.workflowVersion || 0,
    },
    {
      $set: { status: nextStatus, updatedAt: at },
      $inc: { workflowVersion: 1 },
      $push: { statusHistory: entry },
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    throw Object.assign(
      new Error(
        "This record changed in another session. Reload and try again.",
      ),
      { status: 409 },
    );
  }
  return updated;
};
