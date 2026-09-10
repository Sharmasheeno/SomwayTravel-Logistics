import express from "express";
import Cargo from "../models/Cargo.js";
import Visa from "../models/Visa.js";
import { requireUser } from "../middleware/auth.js";
import { getUserBranchScope } from "../lib/branches.js";
import { cargoStatusLabel } from "../lib/cargoWorkflow.js";
import { buildNotifications } from "../lib/notifications.js";

const router = express.Router();

// The topbar bell. Alerts are derived from live records on each read rather
// than stored, so nothing can drift out of sync with the underlying data and
// there is no read/unread state to migrate.
router.get("/", requireUser, async (req, res, next) => {
  try {
    const result = await buildNotifications({ user: req.user });
    res.set("Cache-Control", "no-store");
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character);

router.post("/status", requireUser, async (req, res) => {
  if (req.user.role === "consultant") {
    return res.status(403).json({ error: "Owner or officer access is required." });
  }

  const { kind, id } = req.body ?? {};
  if (!id || !["cargo", "visa"].includes(kind || "")) {
    return res.status(400).json({ error: "A cargo or visa record is required." });
  }

  const scope = getUserBranchScope(req.user);
  let recipient = "";
  let customer = "";
  let reference = "";
  let status = "";
  let summary = "";

  if (kind === "cargo") {
    const record = await Cargo.findOne({ id });
    if (!record) return res.status(404).json({ error: "Cargo record not found." });
    if (scope.kind !== "all" && ![record.originBranchId, record.destinationBranchId, record.paidByBranchId].some((branchId) => String(branchId || "") === scope.branchId)) {
      return res.status(403).json({ error: "This shipment belongs to another branch." });
    }
    recipient = record.senderEmail || "";
    customer = record.sender;
    reference = record.tracking;
    status = cargoStatusLabel(record.status);
    summary = `Route: ${record.origin} to ${record.destination}\nReceived: ${record.dateIn}\nShipment: ${record.weight} kg`;
  } else {
    const record = await Visa.findOne({ id });
    if (!record) return res.status(404).json({ error: "Visa application not found." });
    if (scope.kind !== "all" && String(record.branchId || "") !== scope.branchId) return res.status(403).json({ error: "This application belongs to another branch." });
    recipient = record.email || "";
    customer = record.applicant;
    reference = record.ref;
    status = record.status;
    summary = `Destination: ${record.destination}\nApplication type: ${record.visaType || "Visa application"}\nApplication date: ${record.appDate}`;
  }

  if (!recipient) return res.status(400).json({ error: "Add the customer's email address to this record first." });

  const { RESEND_API_KEY, MACRUF_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !MACRUF_FROM_EMAIL) {
    return res.status(503).json({ error: "Automatic email delivery is ready but the agency sender has not been configured yet." });
  }

  const lines = summary.split("\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#153f45"><div style="padding:24px;background:#0f3d44;color:#fff;border-radius:18px 18px 0 0"><h1 style="margin:0;font-size:23px">SomWay Travel & Logistics</h1><p style="margin:7px 0 0;color:#cce2df">Status update</p></div><div style="padding:26px;border:1px solid #dce7e4;border-top:0;border-radius:0 0 18px 18px"><p>Hello ${escapeHtml(customer)},</p><p>Your ${kind === "cargo" ? "cargo shipment" : "visa application"} has an updated status.</p><div style="padding:18px;background:#f1f8f6;border-radius:13px"><div style="font-size:12px;color:#6b7f81">Reference</div><strong style="display:block;font-size:20px;margin:4px 0 15px">${escapeHtml(reference)}</strong><div style="font-size:12px;color:#6b7f81">Current status</div><strong style="display:block;font-size:20px;margin-top:4px;color:#12877d">${escapeHtml(status)}</strong></div>${lines.map((line) => `<p style="margin:13px 0 0">${escapeHtml(line)}</p>`).join("")}<p style="margin-top:24px;color:#6b7f81">Questions? WhatsApp +252 61 563 3609 or email Macruuftravelcargo@gmail.com.</p></div></div>`;
  const text = `Hello ${customer},\n\nYour ${kind === "cargo" ? "cargo shipment" : "visa application"} status is ${status}.\nReference: ${reference}\n${summary}\n\nSomWay Travel & Logistics\nWhatsApp: +252 61 563 3609`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: MACRUF_FROM_EMAIL,
      to: [recipient],
      reply_to: "Macruuftravelcargo@gmail.com",
      subject: `SomWay status update: ${reference}`,
      html,
      text,
    }),
  });
  const result = await response.json();
  if (!response.ok) return res.status(502).json({ error: result.message || "The email provider could not deliver this update." });
  return res.json({ ok: true, recipient, messageId: result.id });
});

export default router;
