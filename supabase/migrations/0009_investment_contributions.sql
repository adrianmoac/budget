-- 0009_investment_contributions
-- Money-add events against an investment vehicle. Triggers (0012) keep
-- investments.contributed_total_cents and totals.total_invested_cents correct.
-- Contributions never affect liquid cash (D2).

create table investment_contributions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  investment_id uuid not null references investments (id) on delete restrict,
  amount_cents  integer not null check (amount_cents > 0),
  contrib_date  date not null,
  created_at    timestamptz not null default now()
);

create index investment_contributions_user_date       on investment_contributions (user_id, contrib_date);
create index investment_contributions_user_investment on investment_contributions (user_id, investment_id);

alter table investment_contributions enable row level security;

create policy investment_contributions_select_own on investment_contributions
  for select using (auth.uid() = user_id);
create policy investment_contributions_insert_own on investment_contributions
  for insert with check (auth.uid() = user_id);
create policy investment_contributions_update_own on investment_contributions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy investment_contributions_delete_own on investment_contributions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on investment_contributions to authenticated;
