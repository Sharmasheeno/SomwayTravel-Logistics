import express from "express";

import { requireOwner } from "../middleware/auth.js";
import Activity from "../models/Activity.js";
import {
  createBusinessBackup,
  restoreBusinessBackup,
  validateBusinessBackup,
} from "../lib/backup.js";
import { randomToken } from "../utils/tokens.js";
import { readVisibleAgencyData } from "../lib/entityPersistence.js";

const router = express.Router();

const audit = (user, detail) =>
  Activity.create({
    id: `log_${randomToken(8)}`,
    at: new Date().toISOString(),
    userId: user.id.toString(),
    userName: user.name,
    action: "Backup",
    entity: "Security",
    detail,
  });

router.get("/export", requireOwner, async (req, res, next) => {
  try {
    const backup = await createBusinessBackup();
    await audit(req.user, "Exported a versioned business backup");
    const stamp = backup.manifest.createdAt.slice(0, 10);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="macruf-business-backup-${stamp}.json"`,
    );
    return res.json(backup);
  } catch (error) {
    return next(error);
  }
});

router.post("/validate", requireOwner, async (req, res) => {
  try {
    const summary = validateBusinessBackup(req.body?.backup);
    await audit(req.user, `Validated backup ${summary.digest.slice(0, 12)}`);
    return res.json({
      ok: true,
      summary,
      confirmation: `RESTORE ${summary.digest.slice(0, 12)}`,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
});

router.post("/restore", requireOwner, async (req, res, next) => {
  try {
    const result = await restoreBusinessBackup({
      backup: req.body?.backup,
      validationDigest: req.body?.validationDigest,
      confirmation: req.body?.confirmation,
    });
    await audit(
      req.user,
      `Completed merge restore ${result.summary.digest.slice(0, 12)}; rollback ${result.rollbackPath}`,
    );
    return res.json({
      ok: true,
      ...result,
      data: await readVisibleAgencyData(req.user),
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
