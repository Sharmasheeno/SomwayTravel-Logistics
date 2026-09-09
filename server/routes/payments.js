import express from "express";
import { requireUser } from "../middleware/auth.js";
import { createCustomerPayment, createCancellationRefund, createSupplierPayment, voidCustomerPayment, voidSupplierPayment } from "../lib/finance.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";
import { refreshCloseSnapshots } from "../lib/serviceDeletion.js";
import { rebuildStoredDailySummaries } from "../lib/dailySummary.js";

const router = express.Router();

router.post("/refund", requireUser, async (req, res, next) => {
  try {
    await createCancellationRefund({ ...req.body, user: req.user });
    await refreshCloseSnapshots();
    await rebuildStoredDailySummaries();
    return res.status(201).json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "This refund has already been recorded. Refresh the workspace." });
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/", requireUser, async (req, res, next) => {
  try {
    await createCustomerPayment({ ...req.body, idempotencyKey: req.get("Idempotency-Key") || req.body?.idempotencyKey, user: req.user });
    return res.status(201).json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/:id/void", requireUser, async (req, res, next) => {
  try {
    await voidCustomerPayment({ id: req.params.id, reason: req.body?.reason, user: req.user });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/suppliers", requireUser, async (req, res, next) => {
  try {
    await createSupplierPayment({ ...req.body, user: req.user });
    return res.status(201).json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/suppliers/:id/void", requireUser, async (req, res, next) => {
  try {
    await voidSupplierPayment({ id: req.params.id, reason: req.body?.reason, user: req.user });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
