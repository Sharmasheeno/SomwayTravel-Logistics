import express from "express";
import { requireUser } from "../middleware/auth.js";
import {
  getAccountsReceivableSummary,
} from "../lib/receivables.js";

const router = express.Router();

router.get("/", requireUser, async (req, res, next) => {
  try {
    const result = await getAccountsReceivableSummary({
      user: req.user,
      filters: req.query,
    });
    return res.json({
      ...result,
      rows: result.rows,
      records: result.rows,
    });
  } catch (error) {
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
