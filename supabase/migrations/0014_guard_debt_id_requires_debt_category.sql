-- 0014_guard_debt_id_requires_debt_category
-- A transaction may carry a debt_id only when its category is the user's debt category.
-- Enforced as a constraint trigger (AFTER INSERT/UPDATE) so a raw insert that sets
-- debt_id with a non-debt category is rejected, keeping debt state from desyncing.
-- Runs as SECURITY INVOKER: the category lookup is RLS-filtered to the caller's rows.

create or replace function trg_debt_id_requires_debt_category()
returns trigger
language plpgsql
as $$
declare
  v_kind category_kind;
begin
  if new.debt_id is not null then
    select kind into v_kind from categories where id = new.category_id;
    if v_kind is distinct from 'debt' then
      raise exception 'debt_id_requires_debt_category'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create constraint trigger debt_id_requires_debt_category
  after insert or update on transactions
  for each row execute function trg_debt_id_requires_debt_category();
