-- total_invested trigger (0012): maintains totals.total_invested_cents (grand total)
-- and investments.contributed_total_cents (per vehicle), including moving a contribution
-- between vehicles. Contributions must NEVER change liquid_cash (D2).
begin;
select plan(12);

insert into auth.users (id, email)
  values ('c0000000-0000-0000-0000-000000000001', 'inv@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-000000000001"}', true);

-- Insert 50000 to GBM.
insert into investment_contributions (id, investment_id, amount_cents, contrib_date)
  values ('cccccccc-0000-0000-0000-00000000000a',
          (select id from investments where name = 'GBM'), 50000, '2026-02-01');
select is((select total_invested_cents from totals), 50000::bigint, 'insert raises grand total');
select is((select contributed_total_cents from investments where name = 'GBM'), 50000::bigint,
  'insert raises GBM contributed total');
select is((select liquid_cash_cents from totals), 0::bigint, 'contribution does not touch liquid cash');

-- Insert 20000 to Cetes.
insert into investment_contributions (investment_id, amount_cents, contrib_date)
  values ((select id from investments where name = 'Cetes'), 20000, '2026-02-02');
select is((select total_invested_cents from totals), 70000::bigint, 'second insert accumulates grand total');
select is((select contributed_total_cents from investments where name = 'Cetes'), 20000::bigint,
  'Cetes contributed total set');

-- Update amount of the GBM contribution 50000 -> 60000.
update investment_contributions set amount_cents = 60000
  where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 80000::bigint, 'update amount adjusts grand total by delta');
select is((select contributed_total_cents from investments where name = 'GBM'), 60000::bigint,
  'update amount adjusts GBM contributed total');

-- Move the contribution from GBM to Cetes (grand total unchanged).
update investment_contributions set investment_id = (select id from investments where name = 'Cetes')
  where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 80000::bigint, 'moving vehicles leaves grand total unchanged');
select is((select contributed_total_cents from investments where name = 'GBM'), 0::bigint,
  'moving vehicles debits the source vehicle');
select is((select contributed_total_cents from investments where name = 'Cetes'), 80000::bigint,
  'moving vehicles credits the destination vehicle');

-- Delete the (now Cetes, 60000) contribution.
delete from investment_contributions where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 20000::bigint, 'delete reverses grand total');
select is((select contributed_total_cents from investments where name = 'Cetes'), 20000::bigint,
  'delete reverses vehicle contributed total');

select * from finish();
rollback;
