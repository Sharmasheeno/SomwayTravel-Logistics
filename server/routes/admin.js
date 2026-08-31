import express from "express";
import User, { STAFF_ROLES } from "../models/User.js";
import { requireOwner } from "../middleware/auth.js";
import { assertActiveBranch } from "../lib/branches.js";
import { randomToken } from "../utils/tokens.js";

const router = express.Router();

const canonical = (value) => String(value || "").trim().toLowerCase();
const slug = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 24) || "staff";
const temporaryPassword = () => `Macruf-${randomToken(5)}!`;

const withLoginUrl = (req, user) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  return {
    ...user.toSafeObject(true),
    loginUrl: user.role === "owner" ? `${origin}/admin` : `${origin}/portal/${user.loginToken}`,
  };
};

router.get("/users", requireOwner, async (req, res) => {
  const rows = await User.find({});
  return res.json({ users: rows.map((row) => withLoginUrl(req, row)) });
});

router.post("/users", requireOwner, async (req, res) => {
  const { name, username, password, role, assignedBranchId } = req.body ?? {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName || !role || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: "Name and an Owner or Operator role are required." });
  }
  const branch = role === "operator" ? await assertActiveBranch(assignedBranchId) : null;

  let email = canonical(username) || slug(trimmedName);
  const duplicate = await User.findOne({ email });
  if (duplicate) email = `${slug(trimmedName)}.${randomToken(2)}`;

  const finalPassword = password && String(password).length >= 10 ? String(password) : temporaryPassword();

  const user = await User.create({
    name: trimmedName,
    email,
    password: finalPassword,
    role,
    assignedBranchId: branch?._id || null,
    isOwner: false,
    active: true,
  });

  return res.status(201).json({ user: withLoginUrl(req, user), temporaryPassword: finalPassword });
});

router.patch("/users", requireOwner, async (req, res) => {
  const { id, active, name, username, role, assignedBranchId, resetPassword } = req.body ?? {};
  if (!id || id === req.user.id.toString()) {
    return res.status(400).json({ error: "Choose a staff account." });
  }

  const target = await User.findById(id);
  if (!target) {
    return res.status(404).json({ error: "Staff account not found." });
  }

  if (typeof active === "boolean") target.active = active;
  if (name && String(name).trim()) target.name = String(name).trim();

  if (username && String(username).trim()) {
    const email = canonical(username);
    const duplicate = await User.findOne({ email, _id: { $ne: target._id } });
    if (duplicate) return res.status(409).json({ error: "That username is already in use." });
    target.email = email;
  }

  if (role && STAFF_ROLES.includes(role)) target.role = role;
  if (target.role === "operator") {
    const branch = await assertActiveBranch(assignedBranchId || target.assignedBranchId);
    target.assignedBranchId = branch._id;
  } else if (target.role === "owner") {
    target.assignedBranchId = null;
  }

  let password;
  if (resetPassword) {
    password = temporaryPassword();
    target.password = password;
  }

  await target.save();

  return res.json({ user: withLoginUrl(req, target), ...(password ? { temporaryPassword: password } : {}) });
});

router.patch("/account", requireOwner, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Enter the current and new password." });
  }
  if (String(newPassword).length < 10) {
    return res.status(400).json({ error: "Use at least 10 characters for the new password." });
  }

  const owner = await User.findById(req.user.id);
  const isValid = await owner.comparePassword(String(currentPassword));
  if (!isValid) return res.status(401).json({ error: "The current password is incorrect." });

  owner.password = String(newPassword);
  await owner.save();

  return res.json({ ok: true });
});

export default router;
