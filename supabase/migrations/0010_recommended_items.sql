-- 0010_recommended_items
-- Template rows describing an expected expense/income and the [window_start, window_end]
-- recommendation window. "Missing for month M / year Y" is a derived query (later phase),
-- never materialized per month. category_id is SET NULL on delete; the reassignment RPC
-- moves items to Otros before a category is removed.

create table recommended_items (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type                  tx_type not null,
  category_id           uuid references categories (id) on delete set null,
  description           text not null default '' check (char_length(description) between 0 and 280),
  expected_amount_cents integer check (expected_amount_cents is null or expected_amount_cents > 0),
  window_start          date not null,
  window_end            date check (window_end is null or window_end >= window_start),
  created_at            timestamptz not null default now()
);

create index recommended_items_user_type_category on recommended_items (user_id, type, category_id);

alter table recommended_items enable row level security;

create policy recommended_items_select_own on recommended_items
  for select using (auth.uid() = user_id);
create policy recommended_items_insert_own on recommended_items
  for insert with check (auth.uid() = user_id);
create policy recommended_items_update_own on recommended_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recommended_items_delete_own on recommended_items
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on recommended_items to authenticated;
