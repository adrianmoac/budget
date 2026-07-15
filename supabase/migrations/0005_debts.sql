-- 0005_debts
-- Debts with a fixed number of monthly payments. remaining_months is bounded to
-- [0, total_months] and is also manually editable (D4). Deletion is a soft archive
-- (status='archived'); no hard delete by convention.

create table debts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 120),
  total_months          integer not null check (total_months > 0),
  remaining_months      integer not null check (remaining_months between 0 and total_months),
  minimum_payment_cents integer not null check (minimum_payment_cents > 0),
  due_day               smallint not null check (due_day between 1 and 31),
  start_date            date not null,
  status                debt_status not null default 'active',
  created_at            timestamptz not null default now()
);

create index debts_user_status on debts (user_id, status);

alter table debts enable row level security;

create policy debts_select_own on debts
  for select using (auth.uid() = user_id);
create policy debts_insert_own on debts
  for insert with check (auth.uid() = user_id);
create policy debts_update_own on debts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debts_delete_own on debts
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on debts to authenticated;
