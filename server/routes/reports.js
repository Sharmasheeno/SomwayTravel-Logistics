import express from "express";
import { requireUser } from "../middleware/auth.js";
import { buildFinanceReport } from "../lib/finance.js";
import { getAccountsReceivableSummary } from "../lib/receivables.js";
import { calendarMonthRange } from "../lib/reportingPeriod.js";

const router = express.Router();

router.get("/finance", requireUser, async (req, res, next) => {
  try {
    if (!["owner", "consultant"].includes(req.user.role)) return res.status(403).json({ error: "Financial reports are restricted." });
    const branchId = String(req.query.branchId || "");
    const from = String(req.query.from || "0000-00-00");
    const to = String(req.query.to || "9999-99-99");
    const [rows, accountsReceivable] = await Promise.all([
      buildFinanceReport({ branchId, from, to }),
      getAccountsReceivableSummary({
        user: req.user,
        filters: { branchId, asOf: to, status: "outstanding" },
      }),
    ]);
    const totals = rows.reduce((map, row) => {
      const current = map[row.currency] || {
        currency: row.currency,
        customerCharges: 0,
        paymentsReceived: 0,
        profit: 0,
        revenue: 0,
        directCost: 0,
        collections: 0,
        grossProfit: 0,
        expenses: 0,
        outstanding: 0,
        supplierExposure: 0,
      };
      current.customerCharges += row.customerCharges;
      current.paymentsReceived += row.paymentsReceived;
      current.profit += row.profit;
      current.revenue += row.revenue;
      current.directCost += row.directCost;
      current.collections += row.collections;
      current.grossProfit += row.grossProfit;
      current.expenses += row.expenses;
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
        rows: monthRows.map((row) => ({
          branch: row.branch,
          branchId: row.branchId,
          currency: row.currency,
          customerCharges: row.customerCharges,
          paymentsReceived: row.paymentsReceived,
          profit: row.profit,
          revenue: row.revenue,
          directCost: row.directCost,
          grossProfit: row.grossProfit,
        })),
      });
    }
    return res.json({
      rows,
      totals: Object.values(totals),
      trend,
      accountsReceivable: {
        summary: accountsReceivable.summary,
        totals: accountsReceivable.totals,
      },
      scope: { branchId, from, to },
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
