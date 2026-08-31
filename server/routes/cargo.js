import express from "express";
import { requireUser } from "../middleware/auth.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";
import { transitionCargoStatus } from "../lib/cargoWorkflow.js";

const router = express.Router();

router.post("/:id/transition", requireUser, async (req, res, next) => {
  try {
    await transitionCargoStatus({
      id: req.params.id,
      toStatus: req.body?.status,
      user: req.user,
      note: req.body?.note,
      cancellationReason: req.body?.cancellationReason,
    });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
