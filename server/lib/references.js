import Branch from "../models/Branch.js";
import ReferenceCounter from "../models/ReferenceCounter.js";

const PREFIXES = {
  ticket: "TKT",
  visa: "VIS",
  cargo: "CGO",
};

export const nextBusinessReference = async ({ kind, branchId }) => {
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
  // A single continuous sequence per record type (tickets, visas, cargo),
  // independent of branch and date, so numbers read short: CGO-00001,
  // CGO-00002, ... starting at 00001 and never resetting.
  const key = kind;
  const counter = await ReferenceCounter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return `${prefix}-${String(counter.value).padStart(5, "0")}`;
};
