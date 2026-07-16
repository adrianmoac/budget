-- Guard triggers: protected-category deletion (0013), debt_id-requires-debt-category
-- (0014), and the income/expense category invariant (0022).
begin;
select plan(9);

insert into auth.users (id, email)
  values ('d0000000-0000-0000-0000-000000000001', 'guard@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001"}', true);

-- Deleting the protected 'otros' / 'debt' categories is rejected.
select throws_ok(
  $$ delete from categories where kind = 'otros' $$,
  'P0001', 'cannot_delete_protected_category',
  'deleting the otros category is rejected');
select throws_ok(
  $$ delete from categories where kind = 'debt' $$,
  'P0001', 'cannot_delete_protected_category',
  'deleting the debt category is rejected');

-- A normal category with no dependents can be deleted directly.
select lives_ok(
  $$ delete from categories where kind = 'normal' and name = 'Ropa' $$,
  'a normal category with no dependents can be deleted');

-- A debt to reference.
insert into debts (id, name, total_months, remaining_months, minimum_payment_cents, due_day, start_date)
  values ('dddddddd-0000-0000-0000-00000000000d', 'Tarjeta', 12, 12, 50000, 15, '2026-01-01');

-- debt_id with a NON-debt category is rejected.
select throws_ok(
  $$ insert into transactions (type, amount_cents, tx_date, category_id, debt_id)
     values ('expense', 50000, '2026-01-15',
             (select id from categories where kind = 'normal' and name = 'Comida'),
             'dddddddd-0000-0000-0000-00000000000d') $$,
  'P0001', 'debt_id_requires_debt_category',
  'debt_id with a non-debt category is rejected');

-- debt_id WITH the debt category is allowed.
select lives_ok(
  $$ insert into transactions (type, amount_cents, tx_date, category_id, debt_id)
     values ('expense', 50000, '2026-01-15',
             (select id from categories where kind = 'debt'),
             'dddddddd-0000-0000-0000-00000000000d') $$,
  'debt_id with the debt category is allowed');

-- ---- transactions_category_by_type (0022): income has no category, expense must
-- have one. Both halves are enforced, so a type flip cannot strand a category. ----
select throws_ok(
  $$ insert into transactions (type, amount_cents, tx_date, category_id)
     values ('income', 10000, '2026-02-01',
             (select id from categories where kind = 'normal' and name = 'Comida')) $$,
  '23514', null,
  'an income carrying a category is rejected');

select throws_ok(
  $$ insert into transactions (type, amount_cents, tx_date, category_id)
     values ('expense', 10000, '2026-02-01', null) $$,
  '23514', null,
  'an expense without a category is rejected');

select lives_ok(
  $$ insert into transactions (id, type, amount_cents, tx_date, category_id)
     values ('cccccccc-0000-0000-0000-00000000000c', 'income', 10000, '2026-02-02', null) $$,
  'an income with no category is allowed');

-- Flipping that income to an expense without supplying a category is rejected.
select throws_ok(
  $$ update transactions set type = 'expense'
      where id = 'cccccccc-0000-0000-0000-00000000000c' $$,
  '23514', null,
  'flipping income to expense without a category is rejected');

select * from finish();
rollback;
