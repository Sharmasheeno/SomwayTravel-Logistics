import express from "express";
import { requireUser } from "../middleware/auth.js";
import { createCustomerPayment, createSupplierPayment, voidCustomerPayment } from "../lib/finance.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";

const router = express.Router();

router.post("/", requireUser, async (req, res, next) => {
  try {
    await createCustomerPayment({ ...req.body, user: req.user });
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

export default router;
