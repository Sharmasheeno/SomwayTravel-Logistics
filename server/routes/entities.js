import express from "express";
import { requireUser } from "../middleware/auth.js";
import {
  deleteEntity,
  readVisibleAgencyData,
  writeCargoWithInitialPayment,
  writeEntity,
} from "../lib/entityPersistence.js";

const router = express.Router();

router.post("/cargo/with-payment", requireUser, async (req, res, next) => {
  try {
    await writeCargoWithInitialPayment({
      record: req.body?.record,
      initialPayment: {
        ...(req.body?.initialPayment || {}),
        idempotencyKey:
          req.get("Idempotency-Key") || req.body?.initialPayment?.idempotencyKey,
      },
      user: req.user,
      action: req.body?.action,
    });
    return res.status(201).json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.post("/:collection", requireUser, async (req, res, next) => {
  try {
    await writeEntity({
      collection: req.params.collection,
      record: req.body?.record,
      user: req.user,
      action: req.body?.action,
    });
    return res.status(201).json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.patch("/:collection/:id", requireUser, async (req, res, next) => {
  try {
    await writeEntity({
      collection: req.params.collection,
      id: req.params.id,
      record: req.body?.record,
      user: req.user,
      action: req.body?.action,
    });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

router.delete("/:collection/:id", requireUser, async (req, res, next) => {
  try {
    await deleteEntity({
      collection: req.params.collection,
      id: req.params.id,
      user: req.user,
      action: req.body?.action,
    });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
