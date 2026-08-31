import express from "express";
import Cargo from "../models/Cargo.js";
import Visa from "../models/Visa.js";
import { publicCargoPayload, publicVisaPayload } from "../lib/publicTracking.js";
import { publicTrackingRateLimit, rateLimitKeyForRequest } from "../lib/rateLimit.js";

const router = express.Router();

router.get("/track", async (req, res) => {
  const rateLimit = publicTrackingRateLimit(rateLimitKeyForRequest(req));
  res.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (!rateLimit.allowed) return res.status(429).json({ error: "Too many tracking requests. Please try again shortly." });

  const reference = String(req.query.reference || "").trim().toLowerCase();
  const kind = req.query.kind === "visa" ? "visa" : "cargo";
  if (!reference) return res.json({ record: null });

  if (kind === "visa") {
    const item = await Visa.findOne({ ref: new RegExp(`^${reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (!item) return res.json({ record: null });
    return res.json({ record: publicVisaPayload(item) });
  }

  const item = await Cargo.findOne({ tracking: new RegExp(`^${reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (!item) return res.json({ record: null });
  return res.json({ record: publicCargoPayload(item) });
});

export default router;
