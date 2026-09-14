import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MonthKey } from "./months";

const TABLE = "market_share_onboarding";

// Created only when configured, so a missing/blank env var degrades
// onboarding endpoints to a clear error instead of crashing the whole
// server on startup (this app has other features that don't need a DB).
const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const NOT_CONFIGURED = "Supabase er ikke konfigureret (mangler SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)";

type OnboardingData = Record<MonthKey, number>;

export async function getOnboarding(month: MonthKey): Promise<number | null> {
  if (!supabase) return null;
  const { data } = await supabase.from(TABLE).select("onboarded").eq("month", month).maybeSingle();
  return data?.onboarded ?? null;
}

export async function getAllOnboarding(): Promise<OnboardingData> {
  if (!supabase) return {};
  const { data } = await supabase.from(TABLE).select("month, onboarded");
  const result: OnboardingData = {};
  for (const row of data ?? []) {
    result[row.month] = row.onboarded;
  }
  return result;
}

export async function setOnboarding(month: MonthKey, value: number): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { error } = await supabase.from(TABLE).upsert({ month, onboarded: value }, { onConflict: "month" });
  if (error) throw new Error(error.message);
}

export async function deleteOnboarding(month: MonthKey): Promise<void> {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  const { error } = await supabase.from(TABLE).delete().eq("month", month);
  if (error) throw new Error(error.message);
}
