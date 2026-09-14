import { createClient } from "@supabase/supabase-js";
import { MonthKey } from "./months";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TABLE = "market_share_onboarding";

type OnboardingData = Record<MonthKey, number>;

export async function getOnboarding(month: MonthKey): Promise<number | null> {
  const { data } = await supabase.from(TABLE).select("onboarded").eq("month", month).maybeSingle();
  return data?.onboarded ?? null;
}

export async function getAllOnboarding(): Promise<OnboardingData> {
  const { data } = await supabase.from(TABLE).select("month, onboarded");
  const result: OnboardingData = {};
  for (const row of data ?? []) {
    result[row.month] = row.onboarded;
  }
  return result;
}

export async function setOnboarding(month: MonthKey, value: number): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({ month, onboarded: value }, { onConflict: "month" });
  if (error) throw new Error(error.message);
}

export async function deleteOnboarding(month: MonthKey): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("month", month);
  if (error) throw new Error(error.message);
}
