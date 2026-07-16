-- missing_recommendations RPC (0017, revised by 0024): window overlap,
-- category-match exclusion for expenses, description-match exclusion for income,
-- repeat_mode (monthly vs yearly), per-month scoping, and invalid_period
-- (spec §7.7, AC-Recommendation).
begin;
select plan(13);

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

-- An income item. Income carries no category (0022), so it is matched by
-- description instead (0024); nothing matches 'Ingreso sin categoría' yet.
insert into recommended_items (type, category_id, description, window_start, window_end)
  values ('income', null, 'Ingreso sin categoría', '2026-01-01', null);

-- A yearly item anchored to March: recommended each March its window covers, and
-- in no other month.
insert into recommended_items (type, category_id, description, window_start, window_end, repeat_mode)
  values ('expense',
          (select id from categories where kind = 'normal' and name = 'Viajes'),
          'Seguro anual', '2026-03-01', '2027-12-31', 'yearly');

-- An income item with a blank description has nothing to match on, so it must
-- never be silently covered by a blank-description income.
insert into recommended_items (type, category_id, description, window_start, window_end)
  values ('income', null, '', '2026-01-01', null);

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
  1, 'an income item with no description-matching income is recommended');

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

-- ---- repeat_mode (0023/0024) ----
select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Seguro anual'),
  1, 'a yearly item is recommended in the anniversary month of its window_start');

select is(
  (select count(*)::int from missing_recommendations(4, 2026)
     where item->>'description' = 'Seguro anual'),
  0, 'a yearly item is not recommended outside its anniversary month');

select is(
  (select count(*)::int from missing_recommendations(3, 2027)
     where item->>'description' = 'Seguro anual'),
  1, 'a yearly item recurs in the same month of a later year still inside its window');

-- ---- Income is matched by description, not category (0024) ----
-- Deliberately mis-cased and padded: the match trims and lowercases both sides.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('income', 120000, '2026-03-31', '  INGRESO SIN CATEGORÍA  ', null);

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Ingreso sin categoría'),
  0, 'an income whose description matches (case/space-insensitively) covers the item');

select is(
  (select count(*)::int from missing_recommendations(4, 2026)
     where item->>'description' = 'Ingreso sin categoría'),
  1, 'a covering income only suppresses the month it falls in');

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = ''),
  1, 'an income item with a blank description is never covered');

-- Invalid-period guards.
select throws_ok(
  $$ select * from missing_recommendations(13, 2026) $$,
  'P0001', 'invalid_period', 'a month outside 1–12 is rejected');
select throws_ok(
  $$ select * from missing_recommendations(3, 1999) $$,
  'P0001', 'invalid_period', 'a year outside 2000–2100 is rejected');

select * from finish();
rollback;
