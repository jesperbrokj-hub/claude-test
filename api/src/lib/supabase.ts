import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function isKnownClient(companyName: string): Promise<boolean> {
  const { data } = await supabase
    .from("known_clients")
    .select("id")
    .ilike("name", `%${companyName}%`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function getAllKnownClients(): Promise<{ name: string; crm_id: string | null }[]> {
  const { data } = await supabase
    .from("known_clients")
    .select("name, crm_id")
    .order("name");
  return data ?? [];
}

export async function upsertKnownClients(
  clients: { name: string; crm_id?: string }[]
): Promise<void> {
  await supabase.from("known_clients").upsert(
    clients.map((c) => ({ name: c.name, crm_id: c.crm_id ?? null })),
    { onConflict: "name" }
  );
}
