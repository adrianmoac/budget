-- 0025_market_value_follows_contributions
-- A contribution now also raises the vehicle's market value (revises D1, which had
-- market_value_cents as a purely manual field).
--
-- This fixes an accounting bug, not just a convenience gap. totalInterestMoney is
-- derived as `market_value − invested` (§7.1), so a contribution used to raise
-- `invested` while `market_value` stayed flat — reporting an instant loss exactly
-- equal to the amount just contributed. Adding money is not a loss. Mirroring the
-- contribution into market value leaves interest unchanged at contribution time,
-- which is correct; market value then only moves on real gains/losses, entered by
-- hand as before.
--
-- The mirror covers every branch that already maintains contributed_total_cents —
-- insert, delete, amount change, and moving a contribution between vehicles — so
-- deleting a mistaken contribution fully undoes it.
--
-- `greatest(0, ...)` floors the decrementing paths. An exact mirror could otherwise
-- drive the column negative: contribute 1000 (market -> 1000), hand-edit market down
-- to 500, then delete the contribution (500 - 1000 = -500). A negative market value
-- is meaningless, so it clamps. The clamp means the trigger can never trip the CHECK
-- added below; that constraint exists to guard direct client writes.
--
-- Still the only writer of these aggregate columns, and still SECURITY DEFINER to
-- bypass the SELECT-only RLS on totals.

create or replace function trg_total_invested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update totals
       set total_invested_cents = total_invested_cents + new.amount_cents,
           updated_at = now()
     where user_id = new.user_id;
    update investments
       set contributed_total_cents = contributed_total_cents + new.amount_cents,
           market_value_cents      = market_value_cents + new.amount_cents
     where id = new.investment_id;
    return new;

  elsif tg_op = 'DELETE' then
    update totals
       set total_invested_cents = total_invested_cents - old.amount_cents,
           updated_at = now()
     where user_id = old.user_id;
    update investments
       set contributed_total_cents = contributed_total_cents - old.amount_cents,
           market_value_cents      = greatest(0, market_value_cents - old.amount_cents)
     where id = old.investment_id;
    return old;

  elsif tg_op = 'UPDATE' then
    update totals
       set total_invested_cents = total_invested_cents + (new.amount_cents - old.amount_cents),
           updated_at = now()
     where user_id = new.user_id;

    if new.investment_id = old.investment_id then
      update investments
         set contributed_total_cents = contributed_total_cents + (new.amount_cents - old.amount_cents),
             market_value_cents      = greatest(0, market_value_cents + (new.amount_cents - old.amount_cents))
       where id = new.investment_id;
    else
      -- contribution moved to a different vehicle
      update investments
         set contributed_total_cents = contributed_total_cents - old.amount_cents,
             market_value_cents      = greatest(0, market_value_cents - old.amount_cents)
       where id = old.investment_id;
      update investments
         set contributed_total_cents = contributed_total_cents + new.amount_cents,
             market_value_cents      = market_value_cents + new.amount_cents
       where id = new.investment_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Defence in depth for direct client writes (the manual market-value edit): a
-- negative market value is never valid. Fail loudly if any existing row already
-- violates it rather than silently skipping the constraint.
do $$
begin
  if exists (select 1 from investments where market_value_cents < 0) then
    raise exception 'cannot add investments_market_value_nonneg: existing rows have a negative market_value_cents';
  end if;
end;
$$;

alter table investments
  add constraint investments_market_value_nonneg check (market_value_cents >= 0);
