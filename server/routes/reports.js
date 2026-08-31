import express from "express";
import { requireUser } from "../middleware/auth.js";
import { buildFinanceReport } from "../lib/finance.js";
import { calendarMonthRange } from "../lib/reportingPeriod.js";

const router = express.Router();

router.get("/finance", requireUser, async (req, res, next) => {
  try {
    if (!["owner", "consultant"].includes(req.user.role)) return res.status(403).json({ error: "Financial reports are restricted." });
    const branchId = String(req.query.branchId || "");
    const from = String(req.query.from || "0000-00-00");
    const to = String(req.query.to || "9999-99-99");
    const rows = await buildFinanceReport({ branchId, from, to });
    const totals = rows.reduce((map, row) => {
      const current = map[row.currency] || { currency: row.currency, revenue: 0, collections: 0, grossProfit: 0, outstanding: 0, supplierExposure: 0 };
      current.revenue += row.revenue;
      current.collections += row.collections;
      current.grossProfit += row.grossProfit;
      current.outstanding += row.outstanding;
      current.supplierExposure += row.supplierExposure;
      map[row.currency] = current;
      return map;
    }, {});
    const trend = [];
    const now = new Date();
    for (let index = 5; index >= 0; index -= 1) {
      const period = calendarMonthRange(now.getFullYear(), now.getMonth() - index);
      const monthRows = await buildFinanceReport({ branchId, from: period.from, to: period.to });
      trend.push({
        label: period.label,
        rows: monthRows.map((row) => ({ branch: row.branch, branchId: row.branchId, currency: row.currency, revenue: row.revenue })),
      });
    }
    return res.json({ rows, totals: Object.values(totals), trend, scope: { branchId, from, to } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
