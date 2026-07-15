-- liquid_cash trigger (0011): the ONLY writer of totals.liquid_cash_cents.
-- Covers insert, update-by-delta (amount change), type flip, amount+type together,
-- delete, and that the client cannot write totals directly.
begin;
select plan(7);

insert into auth.users (id, email)
  values ('b0000000-0000-0000-0000-000000000001', 'cash@test.local');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-000000000001"}', true);

-- Row A: expense 10000; Row B: income 30000. Use a normal category.
insert into transactions (id, type, amount_cents, tx_date, category_id)
  values ('bbbbbbbb-0000-0000-0000-00000000000a', 'expense', 10000, '2026-01-15',
          (select id from categories where kind = 'normal' and name = 'Comida'));
select is((select liquid_cash_cents from totals), (-10000)::bigint,
  'insert expense decrements liquid cash');

insert into transactions (id, type, amount_cents, tx_date, category_id)
  values ('bbbbbbbb-0000-0000-0000-00000000000b', 'income', 30000, '2026-01-16',
          (select id from categories where kind = 'normal' and name = 'Comida'));
select is((select liquid_cash_cents from totals), 20000::bigint,
  'insert income increments liquid cash');

-- Update amount only: A 10000 -> 15000 (expense). Delta = -5000. 20000 -> 15000.
update transactions set amount_cents = 15000 where id = 'bbbbbbbb-0000-0000-0000-00000000000a';
select is((select liquid_cash_cents from totals), 15000::bigint,
  'update amount adjusts liquid cash by the delta');

-- Type flip: A expense 15000 -> income 15000. Delta = +30000. 15000 -> 45000.
update transactions set type = 'income' where id = 'bbbbbbbb-0000-0000-0000-00000000000a';
select is((select liquid_cash_cents from totals), 45000::bigint,
  'type flip expense->income adjusts liquid cash correctly');

-- Amount + type together: B income 30000 -> expense 5000. Delta = -35000. 45000 -> 10000.
update transactions set type = 'expense', amount_cents = 5000
  where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
select is((select liquid_cash_cents from totals), 10000::bigint,
  'combined amount+type change adjusts liquid cash correctly');

-- Delete B (expense 5000). Reverses its effect: +5000. 10000 -> 15000.
delete from transactions where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
select is((select liquid_cash_cents from totals), 15000::bigint,
  'delete reverses the row effect');

-- Client cannot write totals directly (SELECT-only grant → permission denied 42501).
select throws_ok(
  $$ update totals set liquid_cash_cents = 999999 $$,
  '42501');

select * from finish();
rollback;
