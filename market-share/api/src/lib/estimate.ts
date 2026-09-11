import { MonthKey, shiftMonth } from "./months";
import { fetchKonkeum, fetchNyrvi2 } from "./statbank";

/** KONKEUM stops publishing raw counts after this month; later months are estimated. */
export const LAST_ACTUAL_MONTH: MonthKey = "2025-12";

export type MonthSource = "actual" | "estimate" | "unavailable";

export interface NewCvrResult {
  newCvr: number | null;
  source: MonthSource;
}

/**
 * Nye CVR-numre for a given month.
 *
 * ≤ LAST_ACTUAL_MONTH: KONKEUM's raw count, verbatim.
 * > LAST_ACTUAL_MONTH: estimated by scaling the same month last year's
 *   actual count with the NYRVI2 index's year-over-year ratio:
 *     estimate = actual(month - 12) × [index(month) / index(month - 12)]
 */
export async function getNewCvrForMonth(month: MonthKey): Promise<NewCvrResult> {
  if (month <= LAST_ACTUAL_MONTH) {
    try {
      const actual = await fetchKonkeum(month);
      return actual === null ? { newCvr: null, source: "unavailable" } : { newCvr: actual, source: "actual" };
    } catch {
      return { newCvr: null, source: "unavailable" };
    }
  }

  const priorYearMonth = shiftMonth(month, -12);
  try {
    const [actualPriorYear, indexThisMonth, indexPriorYear] = await Promise.all([
      fetchKonkeum(priorYearMonth),
      fetchNyrvi2(month),
      fetchNyrvi2(priorYearMonth),
    ]);

    if (actualPriorYear === null || indexThisMonth === null || !indexPriorYear) {
      return { newCvr: null, source: "unavailable" };
    }

    const estimate = actualPriorYear * (indexThisMonth / indexPriorYear);
    return { newCvr: Math.round(estimate), source: "estimate" };
  } catch {
    return { newCvr: null, source: "unavailable" };
  }
}
