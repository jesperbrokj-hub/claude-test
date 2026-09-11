import { Router } from "express";
import { currentMonth, monthRange, shiftMonth } from "../lib/months";
import { getNewCvrForMonth } from "../lib/estimate";
import { getAllOnboarding } from "../lib/store";
import { MonthData } from "../lib/types";

export const marketShareRouter = Router();

const PUBLISH_LAG_LOOKBACK = 3;

/**
 * StatBank publishes with a lag, so the current calendar month often has no
 * data yet. When the caller didn't pin an explicit `to`, walk backwards to
 * the newest month that actually resolves (actual or estimate) instead of
 * defaulting to a month that's guaranteed to come back "unavailable".
 */
async function findLatestAvailableMonth(startMonth: string): Promise<string> {
  let month = startMonth;
  for (let i = 0; i < PUBLISH_LAG_LOOKBACK; i++) {
    const { source } = await getNewCvrForMonth(month);
    if (source !== "unavailable") return month;
    month = shiftMonth(month, -1);
  }
  return month;
}

// GET /api/market-share?months=24  — trailing N months ending the newest available month
// GET /api/market-share?from=2025-01&to=2026-06  — explicit range (honored verbatim)
marketShareRouter.get("/", async (req, res) => {
  const to =
    typeof req.query.to === "string" ? req.query.to : await findLatestAvailableMonth(currentMonth());
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
