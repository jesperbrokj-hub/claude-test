import { Router } from "express";
import { currentMonth, monthRange, shiftMonth } from "../lib/months";
import { getNewCvrForMonth } from "../lib/estimate";
import { getAllOnboarding } from "../lib/store";
import { MonthData } from "../lib/types";

export const marketShareRouter = Router();

// GET /api/market-share?months=24  — trailing N months ending this month
// GET /api/market-share?from=2025-01&to=2026-06  — explicit range
marketShareRouter.get("/", async (req, res) => {
  const to = typeof req.query.to === "string" ? req.query.to : currentMonth();
  const monthsBack = Number(req.query.months) || 24;
  const from = typeof req.query.from === "string" ? req.query.from : shiftMonth(to, -(monthsBack - 1));

  const months = monthRange(from, to);
  const onboarding = getAllOnboarding();

  const results: MonthData[] = await Promise.all(
    months.map(async (month): Promise<MonthData> => {
      const { newCvr, source } = await getNewCvrForMonth(month);
      const onboarded = onboarding[month] ?? null;
      const marketSharePct = newCvr && onboarded !== null ? (onboarded / newCvr) * 100 : null;
      return { month, newCvr, source, onboarded, marketSharePct };
    })
  );

  res.json({ months: results });
});
