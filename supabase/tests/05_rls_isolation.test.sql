-- RLS isolation: a second user sees zero of the first user's rows across every table,
-- and an unauthenticated (anon) role has no table access at all.
begin;
select plan(8);

insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000001', 'u1@test.local');
insert into auth.users (id, email) values ('e0000000-0000-0000-0000-000000000002', 'u2@test.local');

-- As user 1, create data in every user-writable table.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000001"}', true);

insert into transactions (type, amount_cents, tx_date, category_id)
  values ('expense', 10000, '2026-01-10', (select id from categories where kind = 'normal' and name = 'Casa'));
insert into debts (name, total_months, remaining_months, minimum_payment_cents, due_day, start_date)
  values ('U1 debt', 6, 6, 20000, 5, '2026-01-01');
insert into investment_contributions (investment_id, amount_cents, contrib_date)
  values ((select id from investments where name = 'GBM'), 15000, '2026-01-11');
insert into recommended_items (type, category_id, description, window_start)
  values ('expense', (select id from categories where kind = 'normal' and name = 'Casa'), 'rent', '2026-01-01');

-- As user 2: sees only their own seeded rows, none of user 1's.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-000000000002"}', true);

select is((select count(*)::int from transactions), 0, 'user 2 sees zero of user 1 transactions');
select is((select count(*)::int from debts), 0, 'user 2 sees zero of user 1 debts');
select is((select count(*)::int from investment_contributions), 0, 'user 2 sees zero of user 1 contributions');
select is((select count(*)::int from recommended_items), 0, 'user 2 sees zero of user 1 recommended items');
select is((select count(*)::int from categories), 12, 'user 2 sees only their own 12 categories');
select is((select count(*)::int from totals), 1, 'user 2 sees only their own totals row');

-- Anon role has no grants on financial tables.
set local role anon;
select throws_ok($$ select * from transactions $$, '42501');
select throws_ok($$ select * from totals $$, '42501');

select * from finish();
rollback;
