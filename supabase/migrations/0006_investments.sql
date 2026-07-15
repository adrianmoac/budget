-- 0006_investments
-- Investment vehicles (e.g. GBM, Cetes). contributed_total_cents is trigger-maintained
-- (0012) and MUST NOT be written by the client. market_value_cents is a manual field
-- used to derive totalInterestMoney at read time. Names are unique per user.

create table investments (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                    text not null check (char_length(name) between 1 and 80),
  contributed_total_cents bigint not null default 0,
  market_value_cents      bigint not null default 0,
  created_at              timestamptz not null default now(),
  unique (user_id, name)
);

alter table investments enable row level security;

create policy investments_select_own on investments
  for select using (auth.uid() = user_id);
create policy investments_insert_own on investments
  for insert with check (auth.uid() = user_id);
create policy investments_update_own on investments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy investments_delete_own on investments
  for delete using (auth.uid() = user_id);

-- Full CRUD; contributed_total_cents is trigger-maintained and, by convention, never
-- written by the client (see api/ layer). The trigger writes it as SECURITY DEFINER.
grant select, insert, update, delete on investments to authenticated;
