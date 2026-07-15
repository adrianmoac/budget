-- 0007_transactions
-- Expense/income line items. amount_cents is always positive; sign is derived from
-- type via signed_effect(). category_id is RESTRICT (deletion routed through the
-- reassignment RPC); debt_id is nullable and only valid with the debt category
-- (enforced by guard trigger 0014). updated_at is bumped on every UPDATE.

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        tx_type not null,
  amount_cents integer not null check (amount_cents > 0),
  tx_date     date not null,
  description text not null default '' check (char_length(description) between 0 and 280),
  category_id uuid not null references categories (id) on delete restrict,
  recurrence  recurrence not null default 'variable',
  debt_id     uuid references debts (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index transactions_user_date      on transactions (user_id, tx_date);
create index transactions_user_category  on transactions (user_id, category_id);
create index transactions_user_type_date on transactions (user_id, type, tx_date);
create index transactions_user_debt      on transactions (user_id, debt_id) where debt_id is not null;

-- Keep updated_at current on every row update (separate from the liquid_cash trigger).
create or replace function trg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transactions_touch_updated_at
  before update on transactions
  for each row execute function trg_touch_updated_at();

alter table transactions enable row level security;

create policy transactions_select_own on transactions
  for select using (auth.uid() = user_id);
create policy transactions_insert_own on transactions
  for insert with check (auth.uid() = user_id);
create policy transactions_update_own on transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_delete_own on transactions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on transactions to authenticated;
