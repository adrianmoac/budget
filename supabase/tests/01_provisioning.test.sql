-- Provisioning: a freshly created auth user is fully seeded by handle_new_user (0020).
begin;
select plan(9);

insert into auth.users (id, email)
  values ('a0000000-0000-0000-0000-000000000001', 'prov@test.local');

-- totals: exactly one zeroed row.
select is(
  (select count(*)::int from totals where user_id = 'a0000000-0000-0000-0000-000000000001'),
  1, 'totals row created for new user');
select is(
  (select liquid_cash_cents from totals where user_id = 'a0000000-0000-0000-0000-000000000001'),
  0::bigint, 'liquid_cash_cents seeded at 0');
select is(
  (select total_invested_cents from totals where user_id = 'a0000000-0000-0000-0000-000000000001'),
  0::bigint, 'total_invested_cents seeded at 0');

-- categories: 12 total, exactly one otros + one debt + ten normal.
select is(
  (select count(*)::int from categories where user_id = 'a0000000-0000-0000-0000-000000000001'),
  12, '12 categories seeded');
select is(
  (select count(*)::int from categories where user_id = 'a0000000-0000-0000-0000-000000000001' and kind = 'otros'),
  1, 'exactly one otros category');
select is(
  (select count(*)::int from categories where user_id = 'a0000000-0000-0000-0000-000000000001' and kind = 'debt'),
  1, 'exactly one debt category');
select is(
  (select count(*)::int from categories where user_id = 'a0000000-0000-0000-0000-000000000001' and kind = 'normal'),
  10, 'ten normal categories');

-- investments: GBM + Cetes, zeroed.
select is(
  (select array_agg(name order by name) from investments where user_id = 'a0000000-0000-0000-0000-000000000001'),
  array['Cetes', 'GBM'],
  'GBM and Cetes seeded');
select is(
  (select (coalesce(sum(contributed_total_cents), 0) + coalesce(sum(market_value_cents), 0))::bigint
     from investments where user_id = 'a0000000-0000-0000-0000-000000000001'),
  0::bigint, 'seed investments start at zero contributed and market value');

select * from finish();
rollback;
