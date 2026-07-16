-- total_invested trigger (0012, revised by 0025): maintains totals.total_invested_cents
-- (grand total), investments.contributed_total_cents (per vehicle), and — since 0025 —
-- investments.market_value_cents, which mirrors every contribution delta. Covers
-- moving a contribution between vehicles. Contributions must NEVER change liquid_cash (D2).
begin;
select plan(23);

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
select is((select market_value_cents from investments where name = 'GBM'), 50000::bigint,
  'insert raises GBM market value by the same amount (0025)');
-- The point of 0025: a contribution must not manufacture a loss. market − invested
-- is the interest, and it must be flat across a contribution.
select is(
  (select market_value_cents - contributed_total_cents from investments where name = 'GBM'),
  0::bigint,
  'a contribution leaves per-vehicle interest unchanged (no phantom loss)');

-- Insert 20000 to Cetes.
insert into investment_contributions (investment_id, amount_cents, contrib_date)
  values ((select id from investments where name = 'Cetes'), 20000, '2026-02-02');
select is((select total_invested_cents from totals), 70000::bigint, 'second insert accumulates grand total');
select is((select contributed_total_cents from investments where name = 'Cetes'), 20000::bigint,
  'Cetes contributed total set');
select is((select market_value_cents from investments where name = 'Cetes'), 20000::bigint,
  'insert raises Cetes market value');

-- Update amount of the GBM contribution 50000 -> 60000.
update investment_contributions set amount_cents = 60000
  where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 80000::bigint, 'update amount adjusts grand total by delta');
select is((select contributed_total_cents from investments where name = 'GBM'), 60000::bigint,
  'update amount adjusts GBM contributed total');
select is((select market_value_cents from investments where name = 'GBM'), 60000::bigint,
  'update amount adjusts GBM market value by the same delta');

-- Move the contribution from GBM to Cetes (grand total unchanged).
update investment_contributions set investment_id = (select id from investments where name = 'Cetes')
  where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 80000::bigint, 'moving vehicles leaves grand total unchanged');
select is((select contributed_total_cents from investments where name = 'GBM'), 0::bigint,
  'moving vehicles debits the source vehicle');
select is((select contributed_total_cents from investments where name = 'Cetes'), 80000::bigint,
  'moving vehicles credits the destination vehicle');
select is((select market_value_cents from investments where name = 'GBM'), 0::bigint,
  'moving vehicles debits the source market value');
select is((select market_value_cents from investments where name = 'Cetes'), 80000::bigint,
  'moving vehicles credits the destination market value');

-- Delete the (now Cetes, 60000) contribution.
delete from investment_contributions where id = 'cccccccc-0000-0000-0000-00000000000a';
select is((select total_invested_cents from totals), 20000::bigint, 'delete reverses grand total');
select is((select contributed_total_cents from investments where name = 'Cetes'), 20000::bigint,
  'delete reverses vehicle contributed total');
select is((select market_value_cents from investments where name = 'Cetes'), 20000::bigint,
  'delete reverses vehicle market value');

-- ---- A manual market-value edit still wins; contributions only add to it (D1). ----
update investments set market_value_cents = 95000 where name = 'Cetes';
select is((select market_value_cents from investments where name = 'Cetes'), 95000::bigint,
  'a manual market-value edit is preserved');
insert into investment_contributions (id, investment_id, amount_cents, contrib_date)
  values ('cccccccc-0000-0000-0000-00000000000b',
          (select id from investments where name = 'Cetes'), 5000, '2026-02-03');
select is((select market_value_cents from investments where name = 'Cetes'), 100000::bigint,
  'a later contribution adds on top of the manually edited market value');

-- ---- Clamp (0025): market value floors at 0 rather than going negative. ----
-- Hand-edit below the contributed amount, then delete the contribution: the naive
-- mirror would land on -95000.
update investments set market_value_cents = 0 where name = 'Cetes';
delete from investment_contributions where id = 'cccccccc-0000-0000-0000-00000000000b';
select is((select market_value_cents from investments where name = 'Cetes'), 0::bigint,
  'deleting a contribution floors market value at 0 instead of going negative');

-- ---- The CHECK guards direct client writes (the clamp keeps the trigger clear of it). ----
select throws_ok(
  $$ update investments set market_value_cents = -1 where name = 'Cetes' $$,
  '23514', null,
  'a direct negative market value is rejected');

select * from finish();
rollback;
