/** Month keys are always "YYYY-MM" strings, compared lexicographically (safe because of the fixed width). */
export type MonthKey = string;

export function shiftMonth(month: MonthKey, deltaMonths: number): MonthKey {
  const [year, mon] = month.split("-").map(Number);
  const total = year * 12 + (mon - 1) + deltaMonths;
  const newYear = Math.floor(total / 12);
  const newMon = (total % 12) + 1;
  return `${newYear}-${String(newMon).padStart(2, "0")}`;
}

export function currentMonth(): MonthKey {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive range of month keys from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const months: MonthKey[] = [];
  let cur = from;
  while (cur <= to) {
    months.push(cur);
    cur = shiftMonth(cur, 1);
  }
  return months;
}

/** StatBank's "Tid" query value for a month, e.g. "2025-05" -> "2025M05". */
export function toStatbankTid(month: MonthKey): string {
  const [year, mon] = month.split("-");
  return `${year}M${mon}`;
}
