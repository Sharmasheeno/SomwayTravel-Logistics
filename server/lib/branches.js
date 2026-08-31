import mongoose from "mongoose";
import Branch, { BRANCH_CODE_PATTERN } from "../models/Branch.js";

export const LEGACY_BRANCHES = [
  { name: "Nairobi Office", code: "NBO", city: "Nairobi", country: "Kenya", defaultCurrency: "KES", allowedCurrencies: ["KES", "USD"] },
  { name: "Mogadishu Office", code: "MOG", city: "Mogadishu", country: "Somalia", defaultCurrency: "USD", allowedCurrencies: ["USD"] },
];

export const legacyOfficeName = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (["nairobi", "nairobi office", "nbo"].includes(text)) return "Nairobi";
  if (["mogadishu", "mogadishu office", "mog", "mgq"].includes(text)) return "Mogadishu";
  return "";
};

export const plainBranch = (branch) => {
  const object = branch.toObject ? branch.toObject() : branch;
  return {
    id: object._id?.toString?.() || object.id,
    name: object.name,
    code: object.code,
    city: object.city,
    country: object.country,
    defaultCurrency: object.defaultCurrency,
    allowedCurrencies: Array.isArray(object.allowedCurrencies) && object.allowedCurrencies.length ? object.allowedCurrencies : [object.defaultCurrency].filter(Boolean),
    phone: object.phone || "",
    email: object.email || "",
    address: object.address || "",
    isActive: object.isActive !== false,
    createdAt: object.createdAt ? object.createdAt.toISOString() : "",
    updatedAt: object.updatedAt ? object.updatedAt.toISOString() : "",
  };
};

export const seedCoreBranches = async () => {
  const result = { scanned: LEGACY_BRANCHES.length, created: 0, updated: 0, skipped: 0 };
  for (const branch of LEGACY_BRANCHES) {
    const existing = await Branch.findOne({ code: branch.code });
    if (existing) {
      const before = JSON.stringify(plainBranch(existing));
      Object.assign(existing, { ...branch, isActive: true });
      await existing.save();
      const after = JSON.stringify(plainBranch(existing));
      if (before === after) result.skipped += 1;
      else result.updated += 1;
      continue;
    }
    await Branch.create({ ...branch, isActive: true });
    result.created += 1;
  }
  return result;
};

export const listBranches = async ({ includeInactive = true } = {}) => {
  const query = includeInactive ? {} : { isActive: true };
  return Branch.find(query).sort({ name: 1 });
};

export const findBranchByOffice = async (office) => {
  if (mongoose.connection.readyState === 0) return null;
  const legacy = legacyOfficeName(office);
  if (!legacy) return null;
  const branch = LEGACY_BRANCHES.find((item) => item.city === legacy);
  return branch ? Branch.findOne({ code: branch.code }) : null;
};

export const assertActiveBranch = async (branchId) => {
  if (!mongoose.isValidObjectId(branchId)) {
    const error = new Error("Choose a valid active branch.");
    error.status = 400;
    throw error;
  }
  const branch = await Branch.findOne({ _id: branchId, isActive: true });
  if (!branch) {
    const error = new Error("Choose a valid active branch.");
    error.status = 400;
    throw error;
  }
  return branch;
};

export const branchCodeIsValid = (code) => BRANCH_CODE_PATTERN.test(String(code || "").trim().toUpperCase());

export const getUserBranchScope = (user) => {
  if (!user) return { kind: "none", branchId: null };
  if (user.role === "owner") return { kind: "all", branchId: null };
  if (user.role === "operator" && user.assignedBranchId) {
    return { kind: "branch", branchId: user.assignedBranchId.toString() };
  }
  if (user.role === "consultant") return { kind: "readOnly", branchId: null };
  return { kind: "none", branchId: null };
};

export const assertBranchAccess = async (user, branchId) => {
  const scope = getUserBranchScope(user);
  if (scope.kind === "all") return assertActiveBranch(branchId);
  if (scope.kind !== "branch" || scope.branchId !== String(branchId)) {
    const error = new Error("This branch is outside your assigned access.");
    error.status = 403;
    throw error;
  }
  return assertActiveBranch(branchId);
};
