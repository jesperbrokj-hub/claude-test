import { MonthKey } from "./months";
import { MonthSource } from "./estimate";

export interface MonthData {
  month: MonthKey;
  newCvr: number | null;
  source: MonthSource;
  onboarded: number | null;
  marketSharePct: number | null;
}
