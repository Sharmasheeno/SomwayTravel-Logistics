import express from "express";
import User, { STAFF_ROLES } from "../models/User.js";
import { requireOwner } from "../middleware/auth.js";
import { assertActiveBranch } from "../lib/branches.js";
import { randomToken } from "../utils/tokens.js";
import { generateStrongPassword, passwordProblem } from "../utils/password.js";
import Session from "../models/Session.js";
import Activity from "../models/Activity.js";
import { clearSessionCookie } from "../utils/cookies.js";
import AgencySettings from "../models/AgencySettings.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";

const router = express.Router();

const canonical = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
const slug = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 24) || "staff";
// Generated credentials must satisfy the same policy as typed ones.
const temporaryPassword = () => generateStrongPassword();

const withLoginUrl = (req, user) => {
  const origin = `${req.protocol}://${req.get("host")}`;
  return {
    ...user.toSafeObject(true),
    loginUrl:
      user.role === "owner"
        ? `${origin}/admin`
        : `${origin}/portal/${user.loginToken}`,
  };
};

router.get("/users", requireOwner, async (req, res) => {
  const rows = await User.find({});
  return res.json({ users: rows.map((row) => withLoginUrl(req, row)) });
});

router.get("/settings", requireOwner, async (_req, res) => {
  const settings = await AgencySettings.findOne({ key: "singleton" }).lean();
  return res.json({
    settings: {
      agencyName: settings?.agencyName || "Macruf Travel and Cargo Agency",
      timezone: settings?.timezone || "Africa/Mogadishu",
      businessDayStart: settings?.businessDayStart || "07:00",
      businessDayEnd: settings?.businessDayEnd || "18:00",
    },
  });
});

router.patch("/settings", requireOwner, async (req, res) => {
  const current = await AgencySettings.findOne({ key: "singleton" }).lean();
  const agencyName = String(
    req.body?.agencyName ||
      current?.agencyName ||
      "Macruf Travel and Cargo Agency",
  ).trim();
  if (agencyName.length < 3 || agencyName.length > 120) {
    return res.status(400).json({
      error: "Agency name must be between 3 and 120 characters.",
    });
  }
  const timezone = String(
    req.body?.timezone || current?.timezone || "Africa/Mogadishu",
  ).trim();
  const businessDayStart = String(
    req.body?.businessDayStart || current?.businessDayStart || "07:00",
  ).trim();
  const businessDayEnd = String(
    req.body?.businessDayEnd || current?.businessDayEnd || "18:00",
  ).trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
  } catch {
    return res.status(400).json({ error: "Choose a valid IANA timezone." });
  }
  const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (
    !validTime(businessDayStart) ||
    !validTime(businessDayEnd) ||
    businessDayStart >= businessDayEnd
  ) {
    return res.status(400).json({
      error: "Business hours must be valid and the end must follow the start.",
    });
  }
  await AgencySettings.findOneAndUpdate(
    { key: "singleton" },
    { $set: { agencyName, timezone, businessDayStart, businessDayEnd } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  await Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: req.user.id.toString(),
    userName: req.user.name,
    action: "Updated settings",
    entity: "Settings",
    detail: `Updated agency settings and business hours (${businessDayStart}-${businessDayEnd} ${timezone})`,
  });
  return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
});

router.post("/users", requireOwner, async (req, res) => {
  const { name, username, password, role, assignedBranchId } = req.body ?? {};
  const trimmedName = String(name || "").trim();
  if (!trimmedName || !role || !STAFF_ROLES.includes(role)) {
    return res
      .status(400)
      .json({ error: "Name and an Owner or Operator role are required." });
  }
  const branch =
    role === "operator" ? await assertActiveBranch(assignedBranchId) : null;

  let email = canonical(username) || slug(trimmedName);
  const duplicate = await User.findOne({ email });
  if (duplicate) email = `${slug(trimmedName)}.${randomToken(2)}`;

  // An owner may supply a password, but it has to meet the policy; an empty
  // one falls back to a generated password that meets it by construction.
  let finalPassword = temporaryPassword();
  if (password !== undefined && String(password) !== "") {
    const problem = passwordProblem(password);
    if (problem) return res.status(400).json({ error: problem });
    finalPassword = String(password);
  }

  const user = await User.create({
    name: trimmedName,
    email,
    password: finalPassword,
    role,
    assignedBranchId: branch?._id || null,
    isOwner: false,
    active: true,
  });

  return res
    .status(201)
    .json({ user: withLoginUrl(req, user), temporaryPassword: finalPassword });
});

router.patch("/users", requireOwner, async (req, res) => {
  const { id, active, name, username, role, assignedBranchId, resetPassword } =
    req.body ?? {};
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
    if (duplicate)
      return res
        .status(409)
        .json({ error: "That username is already in use." });
    target.email = email;
  }

  if (role && STAFF_ROLES.includes(role)) target.role = role;
  if (target.role === "operator") {
    const branch = await assertActiveBranch(
      assignedBranchId || target.assignedBranchId,
    );
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
  if (target.active === false || resetPassword)
    await Session.deleteMany({ userId: target._id });
  await Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: req.user.id.toString(),
    userName: req.user.name,
    action: "Updated staff",
    entity: "Security",
    detail: `Updated ${target.name} (${target.role}, ${target.active ? "active" : "suspended"})`,
  });

  return res.json({
    user: withLoginUrl(req, target),
    ...(password ? { temporaryPassword: password } : {}),
  });
});

router.patch("/account", requireOwner, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Enter the current and new password." });
  }
  const ownerPasswordProblem = passwordProblem(newPassword);
  if (ownerPasswordProblem) {
    return res.status(400).json({ error: ownerPasswordProblem });
  }

  const owner = await User.findById(req.user.id);
  const isValid = await owner.comparePassword(String(currentPassword));
  if (!isValid)
    return res
      .status(401)
      .json({ error: "The current password is incorrect." });

  owner.password = String(newPassword);
  await owner.save();
  await Session.deleteMany({ userId: owner._id });
  clearSessionCookie(res);
  await Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: owner._id.toString(),
    userName: owner.name,
    action: "Changed password",
    entity: "Security",
    detail: "Owner changed account password and revoked active sessions",
  });

  return res.json({ ok: true });
});

export default router;
