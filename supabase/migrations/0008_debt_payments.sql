-- 0008_debt_payments
-- Ties a cash transaction to the debt it pays, so the cash side and the debt side
-- trace to one event. Populated by the record_debt_payment RPC (later phase).
-- transaction_id CASCADEs so deleting the backing transaction removes the payment row.

create table debt_payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id            uuid not null references debts (id) on delete restrict,
  transaction_id     uuid not null references transactions (id) on delete cascade,
  amount_cents       integer not null check (amount_cents > 0),
  payment_date       date not null,
  covered_minimum    boolean not null,
  months_decremented smallint not null default 0 check (months_decremented in (0, 1)),
  created_at         timestamptz not null default now()
);

create index debt_payments_user_debt_date on debt_payments (user_id, debt_id, payment_date);

alter table debt_payments enable row level security;

create policy debt_payments_select_own on debt_payments
  for select using (auth.uid() = user_id);
create policy debt_payments_insert_own on debt_payments
  for insert with check (auth.uid() = user_id);
create policy debt_payments_update_own on debt_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy debt_payments_delete_own on debt_payments
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on debt_payments to authenticated;
