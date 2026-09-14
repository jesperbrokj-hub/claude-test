-- Markedsandel-dashboard: manuelt onboarding-lager
-- Kør denne i Supabase SQL editor (kan være samme projekt som GrowthDeal,
-- bare en ny tabel — eller et separat projekt, begge dele virker fint,
-- market_share_onboarding er ikke relateret til GrowthDeal's tabeller)

create table if not exists market_share_onboarding (
  month text primary key,  -- "YYYY-MM"
  onboarded integer not null check (onboarded >= 0),
  updated_at timestamptz default now()
);

alter table market_share_onboarding enable row level security;

create policy "Service role full access" on market_share_onboarding
  for all using (true);
