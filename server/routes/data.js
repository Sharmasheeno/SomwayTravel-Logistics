import express from "express";
import User from "../models/User.js";
import { requireUser } from "../middleware/auth.js";
import { readAgencyData, visibleData, mergeWrite } from "../lib/agencyData.js";
import {
  createDataSnapshot,
  describeSafetyViolations,
  evaluateWriteSafety,
  validateAgencySnapshotShape,
} from "../lib/dataSafety.js";

const router = express.Router();

router.get("/", requireUser, async (req, res) => {
  const [source, team] = await Promise.all([readAgencyData(), User.find({})]);
  const safeUsers = team.map((row) => row.toSafeObject());
  return res.json({ data: visibleData(source, req.user, safeUsers) });
});

router.put("/", requireUser, async (req, res) => {
  const { data } = req.body ?? {};
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Agency data is required." });
  }
  if (req.user.role === "consultant") {
    return res.status(403).json({ error: "Consultants have read-only access." });
  }

  try {
    const shape = validateAgencySnapshotShape(data);
    if (!shape.ok) {
      return res.status(400).json({
        error: "Agency data snapshot is incomplete. Reload the workspace and try again.",
        missingCollections: shape.missingCollections,
      });
    }

    const currentData = await readAgencyData();
    const allowLargeDeletes = process.env.MACRUF_ALLOW_LARGE_DELETES === "true";
    const safety = evaluateWriteSafety(currentData, data, { allowLargeDeletes });
    if (!safety.ok) {
      return res.status(409).json({
        error:
          "This save would remove an unusually large amount of agency data. Reload the workspace and try again, or run controlled maintenance with MACRUF_ALLOW_LARGE_DELETES=true.",
        details: describeSafetyViolations(safety.violations),
      });
    }

    await createDataSnapshot(currentData, req.user, "before-data-write");
    await mergeWrite(data, req.user.role);
  } catch (error) {
    if (error instanceof Error && error.message.includes("read-only")) {
      return res.status(403).json({ error: error.message });
    }
    throw error;
  }

  const [source, team] = await Promise.all([readAgencyData(), User.find({})]);
  const safeUsers = team.map((row) => row.toSafeObject());
  return res.json({ ok: true, data: visibleData(source, req.user, safeUsers) });
});

export default router;
