-- missing_recommendations RPC (0017): window overlap, category-match exclusion,
-- category-less items, per-month scoping, and invalid_period (spec §7.7, AC-Recommendation).
begin;
select plan(7);

insert into auth.users (id, email)
  values ('d0000000-0000-0000-0000-000000000001', 'rec@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001"}', true);

-- A Comida item active all of 2026.
insert into recommended_items (type, category_id, description, window_start, window_end)
  values ('expense',
          (select id from categories where kind = 'normal' and name = 'Comida'),
          'Súper mensual', '2026-01-01', '2026-12-31');

-- A Ropa item whose window closed in January — must be excluded for March.
insert into recommended_items (type, category_id, description, window_start, window_end)
  values ('expense',
          (select id from categories where kind = 'normal' and name = 'Ropa'),
          'Ropa de enero', '2026-01-01', '2026-01-31');

-- A category-less item — no transaction can ever cover it, so it is always
-- recommended within its (open-ended) window.
insert into recommended_items (type, category_id, description, window_start, window_end)
  values ('income', null, 'Ingreso sin categoría', '2026-01-01', null);

-- March 2026, before any transaction exists.
select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Súper mensual'),
  1, 'a windowed item with no matching transaction is recommended');

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Ropa de enero'),
  0, 'an item whose window closed before the month is not recommended');

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Ingreso sin categoría'),
  1, 'a category-less item is always recommended within its window');

-- Add a Comida transaction in March 2026 → that item is now covered.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 5000, '2026-03-15', 'Despensa',
          (select id from categories where kind = 'normal' and name = 'Comida'));

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Súper mensual'),
  0, 'an item with a matching category transaction that month is not recommended');

-- The covering transaction suppresses only its own month.
select is(
  (select count(*)::int from missing_recommendations(4, 2026)
     where item->>'description' = 'Súper mensual'),
  1, 'a covering transaction only suppresses the month it falls in');

-- Invalid-period guards.
select throws_ok(
  $$ select * from missing_recommendations(13, 2026) $$,
  'P0001', 'invalid_period', 'a month outside 1–12 is rejected');
select throws_ok(
  $$ select * from missing_recommendations(3, 1999) $$,
  'P0001', 'invalid_period', 'a year outside 2000–2100 is rejected');

select * from finish();
rollback;
