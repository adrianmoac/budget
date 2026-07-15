-- 0015_rpc_delete_category
-- Atomic category deletion with reassignment to Otros (spec §3.3, §7.3).
-- In one transaction: reassign the target category's transactions and
-- recommended_items to the caller's 'otros' category, then delete the target.
-- Amounts are untouched, so liquid_cash_cents is unaffected.
--
-- SECURITY INVOKER: runs under the caller's RLS, so a category owned by another
-- user is simply invisible (resolves to category_not_found) and every UPDATE is
-- scoped to the caller's rows. Protected kinds ('otros','debt') are rejected here
-- (FR-5); the 0013 guard trigger is the defense-in-depth backstop.
--
-- Returns a single record (OUT params) with the exact contract keys.

create or replace function delete_category(
  p_category_id uuid,
  out deleted_id uuid,
  out reassigned_transactions integer,
  out reassigned_recommendations integer
)
returns record
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_kind     category_kind;
  v_otros_id uuid;
begin
  -- Resolve the target under the caller's RLS; missing or foreign => not found.
  select kind into v_kind from categories where id = p_category_id;
  if not found then
    raise exception 'category_not_found' using errcode = 'P0001';
  end if;

  if v_kind in ('otros', 'debt') then
    raise exception 'cannot_delete_protected_category' using errcode = 'P0001';
  end if;

  -- The caller's single Otros category is the reassignment target.
  select id into v_otros_id from categories where kind = 'otros';
  if not found then
    raise exception 'category_not_found' using errcode = 'P0001';
  end if;

  update transactions
    set category_id = v_otros_id
    where category_id = p_category_id;
  get diagnostics reassigned_transactions = row_count;

  update recommended_items
    set category_id = v_otros_id
    where category_id = p_category_id;
  get diagnostics reassigned_recommendations = row_count;

  delete from categories where id = p_category_id;

  deleted_id := p_category_id;
end;
$$;

grant execute on function delete_category(uuid) to authenticated;
