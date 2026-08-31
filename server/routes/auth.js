import express from "express";
import Session from "../models/Session.js";
import User, { OWNER_EMAIL } from "../models/User.js";
import Activity from "../models/Activity.js";
import { currentUser } from "../middleware/auth.js";
import { readCookie, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from "../utils/cookies.js";
import { randomToken, hashToken } from "../utils/tokens.js";

const router = express.Router();

const canonical = (value) => String(value || "").trim().toLowerCase();

const createSession = async (userId) => {
  const token = randomToken(32);
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + 14 * 86400000),
  });
  return token;
};

router.get("/status", async (_req, res) => {
  const owner = await User.findOne({ email: canonical(OWNER_EMAIL) }).select("active");
  res.set("Cache-Control", "no-store");
  return res.json({
    setupRequired: !owner,
    ownerUsername: OWNER_EMAIL,
    ownerActive: owner?.active ?? false,
  });
});

router.post("/setup-owner", async (req, res) => {
  const { name, password } = req.body ?? {};
  if (!password || String(password).length < 10) {
    return res.status(400).json({ error: "Use at least 10 characters for the owner password." });
  }
  const existing = await User.findOne({ email: canonical(OWNER_EMAIL) });
  if (existing) return res.status(409).json({ error: "The owner account has already been created. Sign in instead." });

  const owner = await User.create({
    name: String(name || "Agency Owner").trim() || "Agency Owner",
    email: canonical(OWNER_EMAIL),
    password: String(password),
    role: "owner",
    isOwner: true,
    active: true,
  });

  await Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: owner._id.toString(),
    userName: owner.name,
    action: "Workspace",
    entity: "Workspace",
    detail: "Created the secure agency workspace",
  });

  const token = await createSession(owner._id);
  setSessionCookie(res, token);
  return res.status(201).json({ user: owner.toSafeObject() });
});

router.post("/login", async (req, res) => {
  const { username, password, linkToken } = req.body ?? {};
  const trimmedLinkToken = String(linkToken || "").trim();

  const user = trimmedLinkToken
    ? await User.findOne({ loginToken: trimmedLinkToken })
    : await User.findOne({ email: canonical(username) });

  if (!user || !user.active || !password) {
    return res.status(401).json({ error: "Username or password is incorrect." });
  }

  const isValid = await user.comparePassword(String(password));
  if (!isValid) return res.status(401).json({ error: "Username or password is incorrect." });

  const token = await createSession(user._id);
  setSessionCookie(res, token);
  res.set("Cache-Control", "no-store");
  return res.json({ user: user.toSafeObject() });
});

router.post("/logout", async (req, res) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  clearSessionCookie(res);
  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ user: null });
  return res.json({ user: user.toSafeObject() });
});

router.get("/link", async (req, res) => {
  const token = String(req.query.token || "");
  const user = await User.findOne({ loginToken: token }).select("name email role active");
  if (!user || !user.active) return res.status(404).json({ error: "This staff access link is not active." });
  return res.json({ user: { name: user.name, username: user.email, role: user.role, active: user.active } });
});

export default router;
