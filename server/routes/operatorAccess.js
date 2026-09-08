import express from "express";
import { requireOwner, requireUser } from "../middleware/auth.js";
import AgencySettings from "../models/AgencySettings.js";
import { operatorSettings, operatorAccessPayload, validateOperatorRoute, generateOperatorRoute } from "../lib/operatorAccess.js";

const router = express.Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
// Validate a supplied path without advertising the private route publicly.
router.get("/validate", async (req, res) => {
  const settings = await operatorSettings();
  const valid = req.query.path === "/admin" || req.query.path === settings.operatorAccessRoute;
  return res.status(valid ? 200 : 404).json({ valid });
});
router.get("/", requireUser, async (req, res) => res.json(operatorAccessPayload(req, await operatorSettings())));
router.patch("/", requireOwner, async (req, res) => {
  const route = req.body?.regenerate === true ? generateOperatorRoute() : validateOperatorRoute(req.body?.route);
  await operatorSettings();
  const settings = await AgencySettings.findOneAndUpdate({ key: "singleton" }, { $set: { operatorAccessRoute: route } }, { new: true }).lean();
  return res.json(operatorAccessPayload(req, settings));
});
export default router;
