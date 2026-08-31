import express from "express";
import Branch from "../models/Branch.js";
import { requireOwner, requireUser } from "../middleware/auth.js";
import { branchCodeIsValid, listBranches, plainBranch } from "../lib/branches.js";

const router = express.Router();
const clean = (value) => String(value || "").trim();
const cleanCode = (value) => clean(value).toUpperCase();

const branchPayload = (body) => ({
  name: clean(body?.name),
  code: cleanCode(body?.code),
  city: clean(body?.city),
  country: clean(body?.country),
  defaultCurrency: clean(body?.defaultCurrency),
  allowedCurrencies: Array.isArray(body?.allowedCurrencies) ? [...new Set(body.allowedCurrencies.map((currency) => clean(currency).toUpperCase()).filter(Boolean))] : [clean(body?.defaultCurrency)].filter(Boolean),
  phone: clean(body?.phone),
  email: clean(body?.email).toLowerCase(),
  address: clean(body?.address),
});

const validateBranchPayload = (payload) => {
  if (!payload.name || !payload.city || !payload.country || !["KES", "USD"].includes(payload.defaultCurrency)) return "Name, city, country and default currency are required.";
  if (!payload.allowedCurrencies.length || payload.allowedCurrencies.some((currency) => !["KES", "USD"].includes(currency))) return "Choose supported branch currencies.";
  if (!payload.allowedCurrencies.includes(payload.defaultCurrency)) return "Default currency must be enabled for the branch.";
  if (!branchCodeIsValid(payload.code)) return "Branch code must be 2-6 uppercase letters or numbers.";
  return "";
};

router.get("/", requireUser, async (req, res) => {
  const rows = await listBranches({ includeInactive: req.user.role === "owner" });
  const branches = rows.map(plainBranch);
  if (req.user.role === "operator") {
    return res.json({ branches: branches.filter((branch) => branch.id === req.user.assignedBranchId?.toString()) });
  }
  return res.json({ branches });
});

router.post("/", requireOwner, async (req, res) => {
  const payload = branchPayload(req.body);
  const error = validateBranchPayload(payload);
  if (error) return res.status(400).json({ error });
  const duplicate = await Branch.findOne({ $or: [{ code: payload.code }, { name: payload.name }] });
  if (duplicate) return res.status(409).json({ error: "A branch with that code or name already exists." });
  const branch = await Branch.create({ ...payload, isActive: true });
  return res.status(201).json({ branch: plainBranch(branch) });
});

router.patch("/:id", requireOwner, async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ error: "Branch not found." });
  const payload = branchPayload({ ...plainBranch(branch), ...req.body });
  const error = validateBranchPayload(payload);
  if (error) return res.status(400).json({ error });
  const duplicate = await Branch.findOne({ _id: { $ne: branch._id }, $or: [{ code: payload.code }, { name: payload.name }] });
  if (duplicate) return res.status(409).json({ error: "A branch with that code or name already exists." });
  Object.assign(branch, payload);
  if (typeof req.body?.isActive === "boolean") branch.isActive = req.body.isActive;
  await branch.save();
  return res.json({ branch: plainBranch(branch) });
});

router.patch("/:id/deactivate", requireOwner, async (req, res) => {
  const branch = await Branch.findById(req.params.id);
  if (!branch) return res.status(404).json({ error: "Branch not found." });
  branch.isActive = false;
  await branch.save();
  return res.json({ branch: plainBranch(branch) });
});

export default router;
