-- year_summary RPC (0019): per-month income/expense/balance/invested aggregation,
-- 12-row zero-fill, year scoping, and invalid_period (spec §7 DoD, AC-Month/Year views).
begin;
select plan(8);

insert into auth.users (id, email)
  values ('e0000000-0000-0000-0000-000000000001', 'yr@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001"}', true);

-- March 2026: income 10000, expense 4000 → balance 6000.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('income', 10000, '2026-03-05', 'Sueldo', null);  -- income: no category (0022)
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 4000, '2026-03-20', 'Gasto',
          (select id from categories where kind = 'otros'));

-- March 2026 contribution of 2500 to GBM (does not affect income/expense; D2).
insert into investment_contributions (investment_id, amount_cents, contrib_date)
  values ((select id from investments where name = 'GBM'), 2500, '2026-03-10');

-- A prior-year income must not leak into 2026.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('income', 99999, '2025-03-05', 'Sueldo previo', null);

select is((select count(*)::int from year_summary(2026)), 12,
  'year_summary returns exactly 12 rows');

select is((select income_cents from year_summary(2026) where month = 3), 10000::bigint,
  'March income is aggregated');
select is((select expense_cents from year_summary(2026) where month = 3), 4000::bigint,
  'March expense is aggregated');
select is((select balance_cents from year_summary(2026) where month = 3), 6000::bigint,
  'March balance = income - expense');
select is((select invested_cents from year_summary(2026) where month = 3), 2500::bigint,
  'March invested is aggregated');

select is((select income_cents from year_summary(2026) where month = 1), 0::bigint,
  'a month with no activity is zero-filled');

select is((select sum(income_cents)::bigint from year_summary(2026)), 10000::bigint,
  'only the requested year is aggregated (prior-year row excluded)');

select throws_ok(
  $$ select * from year_summary(1999) $$,
  'P0001', 'invalid_period', 'a year outside 2000–2100 is rejected');

select * from finish();
rollback;
