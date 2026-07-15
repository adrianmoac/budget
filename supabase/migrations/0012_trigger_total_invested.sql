-- 0012_trigger_total_invested
-- Maintains totals.total_invested_cents (grand total) and
-- investments.contributed_total_cents (per vehicle) from investment_contributions.
-- Only writer of both aggregate columns. SECURITY DEFINER to bypass the SELECT-only
-- RLS on totals. The UPDATE branch handles amount changes and moving a contribution
-- between vehicles.

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
       set contributed_total_cents = contributed_total_cents + new.amount_cents
     where id = new.investment_id;
    return new;

  elsif tg_op = 'DELETE' then
    update totals
       set total_invested_cents = total_invested_cents - old.amount_cents,
           updated_at = now()
     where user_id = old.user_id;
    update investments
       set contributed_total_cents = contributed_total_cents - old.amount_cents
     where id = old.investment_id;
    return old;

  elsif tg_op = 'UPDATE' then
    update totals
       set total_invested_cents = total_invested_cents + (new.amount_cents - old.amount_cents),
           updated_at = now()
     where user_id = new.user_id;

    if new.investment_id = old.investment_id then
      update investments
         set contributed_total_cents = contributed_total_cents + (new.amount_cents - old.amount_cents)
       where id = new.investment_id;
    else
      -- contribution moved to a different vehicle
      update investments
         set contributed_total_cents = contributed_total_cents - old.amount_cents
       where id = old.investment_id;
      update investments
         set contributed_total_cents = contributed_total_cents + new.amount_cents
       where id = new.investment_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create trigger total_invested_maintain
  after insert or update or delete on investment_contributions
  for each row execute function trg_total_invested();
