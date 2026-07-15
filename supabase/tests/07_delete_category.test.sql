-- delete_category RPC (0015): atomic reassign-to-Otros, protected-kind rejection,
-- not-found rejection, and name-uniqueness on create + rename (spec §7.4, AC-Category-delete).
begin;
select plan(11);

insert into auth.users (id, email)
  values ('c0000000-0000-0000-0000-000000000001', 'cat@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000001"}', true);

-- Fixtures: a normal category ('Comida', seeded via handle_new_user) with one
-- dependent transaction and one dependent recommended item.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 12345, '2026-03-10', 'Despensa',
          (select id from categories where kind = 'normal' and name = 'Comida'));

insert into recommended_items (type, category_id, description, window_start)
  values ('expense', (select id from categories where kind = 'normal' and name = 'Comida'),
          'Súper mensual', '2026-01-01');

-- Snapshot liquid cash before the deletion (must be untouched by reassignment).
create temp table lc_before as select liquid_cash_cents from totals;

-- Delete the used category once; capture the returned counts.
create temp table dc_result as
  select * from delete_category(
    (select id from categories where kind = 'normal' and name = 'Comida'));

select is((select reassigned_transactions from dc_result), 1,
  'delete_category reports the one reassigned transaction');
select is((select reassigned_recommendations from dc_result), 1,
  'delete_category reports the one reassigned recommended item');
select is((select count(*)::int from categories where name = 'Comida'), 0,
  'the deleted category is gone');
select is(
  (select category_id from transactions where description = 'Despensa'),
  (select id from categories where kind = 'otros'),
  'the dependent transaction is reassigned to Otros');
select is(
  (select category_id from recommended_items where description = 'Súper mensual'),
  (select id from categories where kind = 'otros'),
  'the dependent recommended item is reassigned to Otros');
select is(
  (select liquid_cash_cents from totals),
  (select liquid_cash_cents from lc_before),
  'liquid cash is unchanged by category deletion');

-- Protected kinds cannot be deleted through the RPC.
select throws_ok(
  $$ select delete_category((select id from categories where kind = 'otros')) $$,
  'P0001', 'cannot_delete_protected_category',
  'deleting the Otros category via RPC is rejected');
select throws_ok(
  $$ select delete_category((select id from categories where kind = 'debt')) $$,
  'P0001', 'cannot_delete_protected_category',
  'deleting the debt category via RPC is rejected');

-- Unknown / foreign category id resolves to not found.
select throws_ok(
  $$ select delete_category('00000000-0000-0000-0000-000000000099') $$,
  'P0001', 'category_not_found',
  'deleting an unknown category is rejected');

-- Name uniqueness (D9) on create and on rename.
select throws_ok(
  $$ insert into categories (name) values ('Coche') $$,
  '23505', null,
  'creating a category with a duplicate name is rejected');
select throws_ok(
  $$ update categories set name = 'Coche' where name = 'Casa' $$,
  '23505', null,
  'renaming a category to an existing name is rejected');

select * from finish();
rollback;
