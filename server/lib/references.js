import Branch from "../models/Branch.js";
import ReferenceCounter from "../models/ReferenceCounter.js";

const PREFIXES = {
  ticket: "TKT",
  visa: "VIS",
  cargo: "CGO",
};

const compactDate = (value) =>
  String(value || new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, "");

export const nextBusinessReference = async ({ kind, branchId, date }) => {
  const prefix = PREFIXES[kind];
  if (!prefix) {
    throw Object.assign(new Error("Unknown business reference type."), {
      status: 400,
    });
  }
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw Object.assign(
      new Error("Branch not found for reference generation."),
      {
        status: 400,
      },
    );
  }
  const day = compactDate(date);
  const branchCode = String(branch.code || "BR").toUpperCase();
  const key = `${kind}:${branch._id}:${day}`;
  const counter = await ReferenceCounter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return `${prefix}-${branchCode}-${day}-${String(counter.value).padStart(4, "0")}`;
};
