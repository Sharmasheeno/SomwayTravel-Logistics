import Session from "../models/Session.js";
import User from "../models/User.js";
import { readCookie, SESSION_COOKIE } from "../utils/cookies.js";
import { hashToken } from "../utils/tokens.js";

export const currentUser = async (req) => {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findById(session.userId);
  // A deleted or suspended account must not keep a working session. Removing
  // the row here means the account cannot act even if it still holds the
  // cookie, and the orphaned session does not linger in the database.
  if (!user || !user.active) {
    await Session.deleteMany({ userId: session.userId });
    return null;
  }
  return user;
};

export const attachUser = async (req, _res, next) => {
  req.user = await currentUser(req);
  next();
};

export const requireUser = async (req, res, next) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: "Sign in required." });
  req.user = user;
  next();
};

export const requireOwner = async (req, res, next) => {
  const user = await currentUser(req);
  if (!user || user.role !== "owner") return res.status(403).json({ error: "Owner access is required." });
  req.user = user;
  next();
};
