import express from "express";
import { requireUser } from "../middleware/auth.js";
import { assertBranchAccess } from "../lib/branches.js";
import {
  assertBranchPaymentMethod,
  dailyCloseSnapshot,
  reopenDailyClose,
  reviewDailyClose,
} from "../lib/finance.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";
import {
  correctDailySummary,
  getDailySummary,
  zonedClock,
} from "../lib/dailySummary.js";
import AgencySettings from "../models/AgencySettings.js";

const router = express.Router();

router.get("/summary", requireUser, async (req, res, next) => {
  try {
    const settings = await AgencySettings.findOne({ key: "singleton" }).lean();
    const timezone = settings?.timezone || "Africa/Mogadishu";
    const businessDate =
      String(req.query.date || "") || zonedClock(new Date(), timezone).date;
    const result = await getDailySummary({
      user: req.user,
      businessDate,
      branchId: String(req.query.branchId || ""),
      currency: String(req.query.currency || ""),
    });
    return res.json({ ...result, businessDate });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/summary/:id/correct", requireUser, async (req, res, next) => {
  try {
    const summary = await correctDailySummary({
      id: req.params.id,
      reason: req.body?.reason,
      user: req.user,
    });
    return res.json({ ok: true, summary });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.get("/preview", requireUser, async (req, res, next) => {
  try {
    const { branchId, currency, paymentMethodId, paymentMethod, date } =
      req.query;
    if (!branchId || !currency || (!paymentMethodId && !paymentMethod) || !date)
      return res.status(400).json({
        error: "Branch, date, currency and payment method are required.",
      });
    if (req.user.role !== "owner") await assertBranchAccess(req.user, branchId);
    const resolved = await assertBranchPaymentMethod({
      branchId,
      currency,
      paymentMethodId,
      paymentMethod,
    });
    return res.json({
      metrics: await dailyCloseSnapshot({
        branchId,
        currency,
        paymentMethodId: resolved.method._id,
        date,
      }),
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/:id/reopen", requireUser, async (req, res, next) => {
  try {
    await reopenDailyClose({
      id: req.params.id,
      reason: req.body?.reason,
      user: req.user,
    });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/:id/review", requireUser, async (req, res, next) => {
  try {
    await reviewDailyClose({ id: req.params.id, user: req.user });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
});

export default router;
