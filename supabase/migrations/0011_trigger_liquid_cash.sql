-- 0011_trigger_liquid_cash
-- Maintains totals.liquid_cash_cents from transactions. This trigger is the ONLY
-- writer of liquid_cash_cents. It runs as SECURITY DEFINER so it can update the
-- totals row despite the SELECT-only RLS on totals; user scoping is explicit via
-- the row's user_id. The UPDATE branch applies a single delta expression that
-- correctly handles amount changes, type flips (expense<->income), and both at once.

create or replace function trg_liquid_cash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update totals
       set liquid_cash_cents = liquid_cash_cents + signed_effect(new.type, new.amount_cents),
           updated_at = now()
     where user_id = new.user_id;
    return new;

  elsif tg_op = 'DELETE' then
    update totals
       set liquid_cash_cents = liquid_cash_cents - signed_effect(old.type, old.amount_cents),
           updated_at = now()
     where user_id = old.user_id;
    return old;

  elsif tg_op = 'UPDATE' then
    update totals
       set liquid_cash_cents = liquid_cash_cents
             + signed_effect(new.type, new.amount_cents)
             - signed_effect(old.type, old.amount_cents),
           updated_at = now()
     where user_id = new.user_id;
    return new;
  end if;
  return null;
end;
$$;

create trigger liquid_cash_maintain
  after insert or update or delete on transactions
  for each row execute function trg_liquid_cash();
