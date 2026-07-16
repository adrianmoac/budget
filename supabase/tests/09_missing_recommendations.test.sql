-- recommendation_status / missing_recommendations (0017 → 0024 → 0027 → 0028 → 0029).
--
-- Since 0029 the match key for BOTH types is the description, trimmed and
-- case-folded — category is organisational only (D3 retired). That is what lets a
-- single category carry several recommendations, which this file pins hard.
--
-- Also covered: repeat_mode (monthly / yearly / none), the three independent status
-- flags, day-granular expiry, covered_on, and the invalid_period guards.
begin;
select plan(36);

insert into auth.users (id, email)
  values ('d0000000-0000-0000-0000-000000000001', 'rec@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001"}', true);

-- Fixtures. Note 'Agua' and 'Luz' deliberately SHARE the Casa category: under the
-- old category-match rule one would silently cover the other.
insert into recommended_items (type, category_id, description, window_start, window_end, repeat_mode)
values
  ('expense', (select id from categories where kind='normal' and name='Comida'),
   'Súper mensual', '2026-01-01', '2026-12-31', 'monthly'),
  ('expense', (select id from categories where kind='normal' and name='Ropa'),
   'Ropa de enero', '2026-01-01', '2026-01-31', 'monthly'),
  ('income',  null, 'Aguinaldo', '2026-01-01', null, 'monthly'),
  ('expense', (select id from categories where kind='normal' and name='Viajes'),
   'Seguro anual', '2026-03-01', '2027-12-31', 'yearly'),
  ('expense', (select id from categories where kind='normal' and name='Casa'),
   'Agua', '2026-01-01', null, 'monthly'),
  ('expense', (select id from categories where kind='normal' and name='Casa'),
   'Luz', '2026-01-01', null, 'monthly');

-- ---- Window overlap ----
select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Súper mensual'),
  1, 'a windowed item with no matching transaction is recommended');

select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Ropa de enero'),
  0, 'an item whose window closed before the month is not recommended');

-- ---- Description is the match key, not the category (0029) ----
-- Same category, different description: must NOT cover.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 5000, '2026-03-15', 'Otra cosa',
          (select id from categories where kind='normal' and name='Comida'));
select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Súper mensual'),
  1, 'an expense in the same category with a different description does NOT cover');

-- Matching description in a DIFFERENT category, mis-cased and padded: must cover.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 30000, '2026-03-16', '  SÚPER MENSUAL  ',
          (select id from categories where kind='otros'));
select is(
  (select count(*)::int from missing_recommendations(3, 2026)
     where item->>'description' = 'Súper mensual'),
  0, 'a matching description covers regardless of category, ignoring case and spaces');

select is(
  (select count(*)::int from missing_recommendations(4, 2026)
     where item->>'description' = 'Súper mensual'),
  1, 'a covering transaction only suppresses the month it falls in');

-- ---- THE POINT: two recommendations under ONE category stay independent ----
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 18000, '2026-04-10', 'Agua',
          (select id from categories where kind='normal' and name='Casa'));
select is(
  (select count(*)::int from recommendation_status(4, 2026)
     where item->>'description' = 'Agua' and is_covered),
  1, 'paying Agua covers the Agua item');
select is(
  (select count(*)::int from recommendation_status(4, 2026)
     where item->>'description' = 'Luz' and is_due and not is_covered),
  1, 'paying Agua leaves Luz — same category — still due');

-- Substring is not a match: "Luces de navidad" must not cover "Luz".
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 5000, '2026-04-11', 'Luces de navidad',
          (select id from categories where kind='normal' and name='Casa'));
select is(
  (select count(*)::int from recommendation_status(4, 2026)
     where item->>'description' = 'Luz' and is_covered),
  0, 'a transaction merely containing the description does not cover it');

-- An income cannot cover an expense item that shares its description.
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('income', 40000, '2026-04-12', 'Luz', null);
select is(
  (select count(*)::int from recommendation_status(4, 2026)
     where item->>'description' = 'Luz' and is_covered),
  0, 'an income does not cover an expense item sharing its description');

insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 40000, '2026-04-13', 'luz',
          (select id from categories where kind='normal' and name='Comida'));
select is(
  (select count(*)::int from recommendation_status(4, 2026)
     where item->>'description' = 'Luz' and is_covered),
  1, 'an expense with the matching description covers it, whatever its category');

-- ---- Income matches the same way ----
select is(
  (select count(*)::int from missing_recommendations(12, 2026)
     where item->>'description' = 'Aguinaldo'),
  1, 'an income item with no description-matching income is recommended');
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('income', 120000, '2026-12-20', '  AGUINALDO ', null);
select is(
  (select count(*)::int from recommendation_status(12, 2026)
     where item->>'description' = 'Aguinaldo' and is_covered),
  1, 'a matching income covers the income item');
select is(
  (select count(*)::int from recommendation_status(11, 2026)
     where item->>'description' = 'Aguinaldo' and is_covered),
  0, 'a covering income only suppresses the month it falls in');

-- ---- repeat_mode: yearly ----
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
  1, 'a yearly item recurs in the same month of a later year inside its window');

-- ---- THE TRAP (0027): "not due" is not "covered" ----
-- The /recommended split must not infer coverage from absence in the missing list:
-- a yearly item anchored to March is absent every month but March, and would be
-- misfiled as past for eleven months a year.
select is(
  (select count(*)::int from recommendation_status(7, 2026)
     where item->>'description' = 'Seguro anual'
       and not is_due and not is_covered and not is_expired),
  1, 'a yearly item outside its anniversary month is not due, not covered, not expired');
select is(
  (select count(*)::int from recommendation_status(7, 2026)
     where item->>'description' = 'Seguro anual' and (is_expired or is_covered)),
  0, 'a yearly item outside its anniversary month is NOT past');

-- ---- Expiry ----
select is(
  (select count(*)::int from recommendation_status(3, 2026)
     where item->>'description' = 'Ropa de enero' and is_expired and not is_due),
  1, 'an item whose window closed before the month is expired');
select is(
  (select count(*)::int from recommendation_status(1, 2026)
     where item->>'description' = 'Ropa de enero' and not is_expired),
  1, 'a historical query does not expire an item inside its own window');
select is(
  (select count(*)::int from recommendation_status(12, 2026)
     where item->>'description' = 'Aguinaldo' and is_expired),
  0, 'an open-ended window never expires');

-- ---- repeat_mode: none — paid ONCE, not once per month (0028) ----
insert into recommended_items (type, category_id, description, window_start, window_end, repeat_mode)
  values ('expense', (select id from categories where kind='normal' and name='Personal'),
          'Pasaporte', '2025-08-01', null, 'none');
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 150000, '2025-08-14', 'Pasaporte',
          (select id from categories where kind='normal' and name='Personal'));

select is(
  (select count(*)::int from recommendation_status(8, 2025)
     where item->>'description' = 'Pasaporte' and is_covered and not is_due),
  1, 'a one-off is covered in the month it was paid');
select is(
  (select count(*)::int from recommendation_status(6, 2026)
     where item->>'description' = 'Pasaporte' and is_covered and not is_due),
  1, 'a one-off paid months ago stays covered in later months');
select is(
  (select count(*)::int from missing_recommendations(6, 2026)
     where item->>'description' = 'Pasaporte'),
  0, 'the banner does not re-nag about a one-off already paid months ago');
select is(
  (select count(*)::int from recommendation_status(7, 2025)
     where item->>'description' = 'Pasaporte' and is_covered),
  0, 'a later payment does not retroactively cover an earlier month');
select is(
  (select covered_on from recommendation_status(6, 2026)
     where item->>'description' = 'Pasaporte'),
  '2025-08-14'::date, 'covered_on reports the date the one-off was actually paid');

-- A repeating item must NOT inherit that lookback: rent is owed again every month.
insert into recommended_items (type, category_id, description, window_start, window_end, repeat_mode)
  values ('expense', (select id from categories where kind='normal' and name='Casa'),
          'Renta', '2026-01-01', null, 'monthly');
insert into transactions (type, amount_cents, tx_date, description, category_id)
  values ('expense', 800000, '2026-05-03', 'Renta',
          (select id from categories where kind='normal' and name='Casa'));
select is(
  (select count(*)::int from recommendation_status(5, 2026)
     where item->>'description' = 'Renta' and is_covered),
  1, 'a monthly item is covered in the month it was paid');
select is(
  (select count(*)::int from recommendation_status(6, 2026)
     where item->>'description' = 'Renta' and is_covered),
  0, 'a monthly item is NOT covered by a previous month''s payment');
select is(
  (select covered_on from recommendation_status(5, 2026)
     where item->>'description' = 'Renta'),
  '2026-05-03'::date, 'covered_on reports the covering date for a monthly item');

-- ---- Day-granular expiry (0028), anchored to today so the test cannot rot ----
insert into recommended_items (type, category_id, description, window_start, window_end, repeat_mode)
values
  ('expense', (select id from categories where kind='normal' and name='Suscripciones'),
   'Vence hoy', date_trunc('month', current_date)::date, current_date, 'monthly'),
  ('expense', (select id from categories where kind='normal' and name='Suscripciones'),
   'Venció ayer', date_trunc('month', current_date)::date, current_date - 1, 'monthly');

select is(
  (select count(*)::int from recommendation_status(
       extract(month from current_date)::int, extract(year from current_date)::int)
     where item->>'description' = 'Vence hoy' and not is_expired and is_due),
  1, 'an item whose window ends TODAY is still pending, not expired');
select is(
  (select count(*)::int from recommendation_status(
       extract(month from current_date)::int, extract(year from current_date)::int)
     where item->>'description' = 'Venció ayer' and is_expired and not is_due),
  1, 'an item whose window ended yesterday expires mid-month, not at month end');

-- ---- The wrapper must stay exactly "the due ones" ----
select is(
  (select count(*)::int from missing_recommendations(6, 2026)),
  (select count(*)::int from recommendation_status(6, 2026) where is_due),
  'missing_recommendations returns exactly the due items');

-- ---- Guards ----
select throws_ok(
  $$ select * from missing_recommendations(13, 2026) $$,
  'P0001', 'invalid_period', 'a month outside 1–12 is rejected');
select throws_ok(
  $$ select * from missing_recommendations(3, 1999) $$,
  'P0001', 'invalid_period', 'a year outside 2000–2100 is rejected');
select throws_ok(
  $$ select * from recommendation_status(0, 2026) $$,
  'P0001', 'invalid_period', 'recommendation_status rejects an invalid month');

-- Description is the only match key, so a blank one could never be satisfied (0029).
select throws_ok(
  $$ insert into recommended_items (type, description, window_start)
     values ('expense', '   ', '2026-01-01') $$,
  '23514', null,
  'a blank description is rejected: it could never be covered');

select * from finish();
rollback;
