-- record_debt_payment RPC (0016): atomic expense + payment row + conditional
-- one-month decrement, guard rejections, multi-step rollback, and the manual
-- remaining_months bound (spec §7.5, AC-Debt-payment).
begin;
select plan(21);

insert into auth.users (id, email)
  values ('d0000000-0000-0000-0000-000000000001', 'debt@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001"}', true);

-- Fixtures: three active debts. A/B have 6 months and a $500 minimum; C has a
-- single remaining month so a covering payment drives it to 'paid'.
insert into debts (name, total_months, remaining_months, minimum_payment_cents, due_day, start_date)
  values ('Debt A', 6, 6, 50000, 15, '2026-01-01'),
         ('Debt B', 6, 6, 50000, 15, '2026-01-01'),
         ('Debt C', 1, 1, 30000, 15, '2026-01-01');

-- ---- Covered payment on Debt A: decrements exactly one month ----
create temp table lc0 as select liquid_cash_cents from totals;

create temp table pay_a as
  select * from record_debt_payment(
    (select id from debts where name = 'Debt A'), 50000, '2026-03-15', 'Pago A');

select is((select months_decremented from pay_a)::int, 1,
  'covered payment reports one month decremented');
select is((select covered_minimum from pay_a), true,
  'covered payment reports covered_minimum = true');
select is((select remaining_months from debts where name = 'Debt A'), 5,
  'covered payment decrements remaining_months by one');
select is(
  (select count(*)::int from debt_payments dp
     join debts d on d.id = dp.debt_id
    where d.name = 'Debt A' and dp.covered_minimum and dp.months_decremented = 1),
  1, 'a covered debt_payments row is recorded');
select is(
  (select count(*)::int from transactions
    where type = 'expense'
      and recurrence = 'recurrent'
      and amount_cents = 50000
      and debt_id = (select id from debts where name = 'Debt A')
      and category_id = (select id from categories where kind = 'debt')),
  1, 'the payment inserts a debt-category expense linked to the debt');
select is(
  (select liquid_cash_cents from totals),
  (select liquid_cash_cents from lc0) - 50000,
  'covered payment reduces liquid cash by the amount');

-- ---- Below-minimum payment on Debt B: no decrement, still debits cash ----
create temp table lc1 as select liquid_cash_cents from totals;

create temp table pay_b as
  select * from record_debt_payment(
    (select id from debts where name = 'Debt B'), 10000, '2026-03-15', 'Abono B');

select is((select covered_minimum from pay_b), false,
  'below-minimum payment reports covered_minimum = false');
select is((select months_decremented from pay_b)::int, 0,
  'below-minimum payment reports zero months decremented');
select is((select remaining_months from debts where name = 'Debt B'), 6,
  'below-minimum payment leaves remaining_months unchanged');
select is(
  (select liquid_cash_cents from totals),
  (select liquid_cash_cents from lc1) - 10000,
  'below-minimum payment still reduces liquid cash by the amount');

-- ---- Covering payment that reaches zero flips status to 'paid' ----
create temp table pay_c as
  select * from record_debt_payment(
    (select id from debts where name = 'Debt C'), 30000, '2026-03-15', 'Pago final C');

select is((select remaining_months from debts where name = 'Debt C'), 0,
  'final covering payment reaches zero remaining months');
select is((select status from debts where name = 'Debt C')::text, 'paid',
  'debt status flips to paid when remaining months reaches zero');

-- ---- Guard rejections ----
select throws_ok(
  $$ select record_debt_payment((select id from debts where name = 'Debt A'), 0, '2026-03-15', 'x') $$,
  'P0001', 'invalid_amount',
  'a non-positive amount is rejected');
select throws_ok(
  $$ select record_debt_payment('00000000-0000-0000-0000-000000000099', 50000, '2026-03-15', 'x') $$,
  'P0001', 'debt_not_found',
  'an unknown debt id is rejected');
select throws_ok(
  $$ select record_debt_payment((select id from debts where name = 'Debt C'), 30000, '2026-03-15', 'x') $$,
  'P0001', 'debt_not_active',
  'paying a non-active (paid) debt is rejected');

-- ---- Multi-step rollback: force the final debt_payments insert to fail and
-- prove the expense insert AND the month decrement are both reverted. ----
-- The `authenticated` role has no CREATE on schema public, so drop back to the
-- superuser to install the fault-injection trigger, then resume as the caller —
-- the RPC under test must still run under RLS for this to prove anything.
reset role;
create function _force_fail_payment() returns trigger language plpgsql as $$
begin raise exception 'forced_failure' using errcode = 'P0001'; end;
$$;
create trigger _force_fail before insert on debt_payments
  for each row execute function _force_fail_payment();
set local role authenticated;

create temp table lc2 as select liquid_cash_cents from totals;
create temp table txcount as select count(*)::int as n from transactions;

select throws_ok(
  $$ select record_debt_payment((select id from debts where name = 'Debt A'), 50000, '2026-04-15', 'rollback') $$,
  'P0001', 'forced_failure',
  'a failure during the payment aborts the whole RPC');
select is(
  (select liquid_cash_cents from totals),
  (select liquid_cash_cents from lc2),
  'rollback leaves liquid cash untouched (expense insert reverted)');
select is((select remaining_months from debts where name = 'Debt A'), 5,
  'rollback leaves remaining_months untouched (decrement reverted)');
select is((select count(*)::int from transactions), (select n from txcount),
  'rollback leaves no orphaned transaction');

reset role;
drop trigger _force_fail on debt_payments;
drop function _force_fail_payment();
set local role authenticated;

-- ---- Manual remaining_months override is bounded to [0, total_months] (D4) ----
select throws_ok(
  $$ update debts set remaining_months = total_months + 1 where name = 'Debt A' $$,
  '23514', null,
  'a manual remaining_months above total_months is rejected');
select lives_ok(
  $$ update debts set remaining_months = 3 where name = 'Debt A' $$,
  'a manual remaining_months within bounds is accepted');

select * from finish();
rollback;
