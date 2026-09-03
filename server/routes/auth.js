import express from "express";
import Session from "../models/Session.js";
import User, { OWNER_EMAIL } from "../models/User.js";
import Activity from "../models/Activity.js";
import { currentUser, requireUser } from "../middleware/auth.js";
import { readCookie, setSessionCookie, clearSessionCookie, SESSION_COOKIE } from "../utils/cookies.js";
import { randomToken, hashToken } from "../utils/tokens.js";
import { createFixedWindowRateLimiter, rateLimitKeyForRequest } from "../lib/rateLimit.js";
import { passwordProblem } from "../utils/password.js";

const router = express.Router();

const canonical = (value) => String(value || "").trim().toLowerCase();
const loginRateLimit = createFixedWindowRateLimiter({ limit: Number(process.env.LOGIN_RATE_LIMIT || 8), windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS || 15 * 60_000) });

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
  const ownerPasswordProblem = passwordProblem(password);
  if (ownerPasswordProblem) {
    return res.status(400).json({ error: ownerPasswordProblem });
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
  const rate = loginRateLimit(`${rateLimitKeyForRequest(req)}:${canonical(username) || "link"}`);
  if (!rate.allowed) {
    res.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
    return res.status(429).json({ error: "Too many sign-in attempts. Try again later." });
  }

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
  await Activity.create({ id: `log_${randomToken(8)}`, at: new Date().toISOString(), userId: user._id.toString(), userName: user.name, action: "Signed in", entity: "Security", detail: "Successful staff sign-in" });
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

// Every signed-in user owns their profile. Role, branch and suspension stay
// with the owner in /api/admin/users; this touches only the fields that
// belong to the person themselves.
const MAX_AVATAR_CHARS = 400000;

router.patch("/profile", requireUser, async (req, res) => {
  const { name, phone, avatarUrl, currentPassword, newPassword } =
    req.body ?? {};
  const user = req.user;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ error: "Name cannot be empty." });
    user.name = trimmed;
  }

  if (phone !== undefined) user.phone = String(phone).trim();

  if (avatarUrl !== undefined) {
    const value = String(avatarUrl);
    if (value && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value)) {
      return res
        .status(400)
        .json({ error: "The profile photo must be a PNG, JPEG, WebP or GIF image." });
    }
    if (value.length > MAX_AVATAR_CHARS) {
      return res
        .status(413)
        .json({ error: "That photo is too large. Choose a smaller image." });
    }
    user.avatarUrl = value;
  }

  let passwordChanged = false;
  if (newPassword !== undefined && String(newPassword) !== "") {
    const problem = passwordProblem(newPassword);
    if (problem) {
      return res.status(400).json({ error: problem });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: "Enter your current password." });
    }
    const valid = await user.comparePassword(String(currentPassword));
    if (!valid) {
      return res.status(401).json({ error: "Your current password is incorrect." });
    }
    user.password = String(newPassword);
    passwordChanged = true;
  }

  await user.save();

  if (passwordChanged) {
    // Sign out this account everywhere else, keeping the session that made
    // the change so the person is not logged out of the page they are on.
    const token = readCookie(req, SESSION_COOKIE);
    await Session.deleteMany({
      userId: user._id,
      ...(token ? { tokenHash: { $ne: hashToken(token) } } : {}),
    });
    await Activity.create({
      id: `log_${randomToken(8)}`,
      at: new Date().toISOString(),
      userId: user._id.toString(),
      userName: user.name,
      action: "Changed password",
      entity: "Security",
      detail: "Updated their own password",
    });
  }

  res.set("Cache-Control", "no-store");
  return res.json({ user: user.toSafeObject() });
});

router.get("/link", async (req, res) => {
  const token = String(req.query.token || "");
  const user = await User.findOne({ loginToken: token }).select("name email role active");
  if (!user || !user.active) return res.status(404).json({ error: "This staff access link is not active." });
  return res.json({ user: { name: user.name, username: user.email, role: user.role, active: user.active } });
});

export default router;
