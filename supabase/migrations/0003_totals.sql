-- 0003_totals
-- One denormalized row per user holding the authoritative liquid cash and
-- total invested. Trigger-maintained only; the client reads it and never writes it,
-- so RLS grants SELECT only. The maintenance triggers (0011/0012) and the seeding
-- trigger (0020) run as SECURITY DEFINER and therefore bypass these policies.

create table totals (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  liquid_cash_cents    bigint not null default 0,
  total_invested_cents bigint not null default 0,
  updated_at           timestamptz not null default now()
);

alter table totals enable row level security;

create policy totals_select_own on totals
  for select using (auth.uid() = user_id);

-- Client reads totals only; the maintenance triggers (SECURITY DEFINER) are the writers.
grant select on totals to authenticated;
