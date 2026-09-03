import express from "express";
import { requireUser } from "../middleware/auth.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";
import { transitionServiceStatus } from "../lib/serviceWorkflow.js";

const router = express.Router();

const transition = (kind) => async (req, res, next) => {
  try {
    await transitionServiceStatus({
      kind,
      id: req.params.id,
      toStatus: req.body?.status,
      note: req.body?.note,
      correctionReason: req.body?.correctionReason,
      user: req.user,
    });
    return res.json({ ok: true, data: await readVisibleAgencyData(req.user) });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
};

router.post("/tickets/:id/transition", requireUser, transition("ticket"));
router.post("/visas/:id/transition", requireUser, transition("visa"));

export default router;
