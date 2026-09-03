import express from "express";
import User from "../models/User.js";
import { requireUser } from "../middleware/auth.js";
import { readAgencyData, visibleData } from "../lib/agencyData.js";

const router = express.Router();

router.get("/", requireUser, async (req, res) => {
  const [source, team] = await Promise.all([readAgencyData(), User.find({})]);
  const safeUsers = team.map((row) => row.toSafeObject());
  return res.json({ data: visibleData(source, req.user, safeUsers) });
});

router.put("/", requireUser, (_req, res) => {
  return res.status(405).json({
    error:
      "Whole-workspace writes are disabled. Use the entity and settings endpoints.",
  });
});

export default router;
