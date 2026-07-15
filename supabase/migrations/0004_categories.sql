-- 0004_categories
-- User-owned categories. Exactly one 'otros' and one 'debt' category per user
-- (partial unique indexes); names are unique per user (collision rejection on
-- create and rename). Protected kinds cannot be deleted (guard trigger 0013);
-- deletion is routed through the delete_category RPC in a later phase.

create table categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 64),
  kind       category_kind not null default 'normal',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create unique index categories_one_otros_per_user on categories (user_id) where kind = 'otros';
create unique index categories_one_debt_per_user  on categories (user_id) where kind = 'debt';

alter table categories enable row level security;

create policy categories_select_own on categories
  for select using (auth.uid() = user_id);
create policy categories_insert_own on categories
  for insert with check (auth.uid() = user_id);
create policy categories_update_own on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy categories_delete_own on categories
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on categories to authenticated;
