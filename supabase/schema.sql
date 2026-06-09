-- GrowthDeal Supabase Schema
-- Run this in the Supabase SQL editor to set up your database

-- Known clients table (synced from your internal CRM via CSV)
create table if not exists known_clients (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  crm_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast case-insensitive name lookups
create index if not exists known_clients_name_lower_idx
  on known_clients (lower(name));

-- Saved companies (bankers can bookmark companies for follow-up)
create table if not exists saved_companies (
  id uuid default gen_random_uuid() primary key,
  dealroom_id text not null,
  name text not null,
  website text,
  sector text,
  hq text,
  growth_stage text,
  total_funding_m text,
  latest_round text,
  latest_round_date date,
  investors text,
  is_existing_client boolean default false,
  ai_summary text,
  ai_why_now text,
  ai_recommended_products text[],
  ai_action text,
  ai_relevance_score int,
  banker_notes text,
  status text default 'New' check (status in ('New', 'In Progress', 'Contacted', 'Not Relevant')),
  saved_by text,
  saved_at timestamptz default now()
);

-- Alert log (track which funding rounds have been surfaced)
create table if not exists alert_log (
  id uuid default gen_random_uuid() primary key,
  dealroom_round_id text not null unique,
  company_name text not null,
  round text,
  amount_m text,
  round_date date,
  surfaced_at timestamptz default now(),
  actioned boolean default false
);

-- Enable Row Level Security (RLS) — all tables accessible to authenticated users
alter table known_clients enable row level security;
alter table saved_companies enable row level security;
alter table alert_log enable row level security;

-- Simple policy: service role (used by the API) has full access
create policy "Service role full access" on known_clients
  for all using (true);

create policy "Service role full access" on saved_companies
  for all using (true);

create policy "Service role full access" on alert_log
  for all using (true);
