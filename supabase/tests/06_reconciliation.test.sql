-- Reconciliation view (0021): stored totals must equal values recomputed from rows;
-- deliberately corrupting a totals row must surface as non-zero drift.
begin;
select plan(4);

insert into auth.users (id, email)
  values ('f0000000-0000-0000-0000-000000000001', 'recon@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-0000-0000-000000000001"}', true);

-- A mixed sequence of transactions and contributions.
insert into transactions (type, amount_cents, tx_date, category_id) values
  ('income',  100000, '2026-03-01', (select id from categories where kind = 'normal' and name = 'Personal')),
  ('expense',  40000, '2026-03-05', (select id from categories where kind = 'normal' and name = 'Comida')),
  ('expense',   5000, '2026-03-06', (select id from categories where kind = 'normal' and name = 'Súper'));
insert into investment_contributions (investment_id, amount_cents, contrib_date) values
  ((select id from investments where name = 'GBM'),   30000, '2026-03-02'),
  ((select id from investments where name = 'Cetes'), 10000, '2026-03-03');

select is(
  (select liquid_cash_drift from reconciliation where user_id = 'f0000000-0000-0000-0000-000000000001'),
  0::bigint, 'liquid cash reconciles to zero drift after a mixed sequence');
select is(
  (select total_invested_drift from reconciliation where user_id = 'f0000000-0000-0000-0000-000000000001'),
  0::bigint, 'total invested reconciles to zero drift after a mixed sequence');

-- Corrupt the stored totals directly (only possible as a superuser / trigger bug).
reset role;
update totals
   set liquid_cash_cents    = liquid_cash_cents + 12345,
       total_invested_cents = total_invested_cents - 500
 where user_id = 'f0000000-0000-0000-0000-000000000001';

select is(
  (select liquid_cash_drift from reconciliation where user_id = 'f0000000-0000-0000-0000-000000000001'),
  12345::bigint, 'injected liquid cash drift is detected');
select is(
  (select total_invested_drift from reconciliation where user_id = 'f0000000-0000-0000-0000-000000000001'),
  (-500)::bigint, 'injected total invested drift is detected');

select * from finish();
rollback;
