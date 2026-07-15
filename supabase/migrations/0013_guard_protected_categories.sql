-- 0013_guard_protected_categories
-- Defense-in-depth behind the delete_category RPC: block deletion of the protected
-- 'otros' and 'debt' categories at the database level. Raises the stable machine code
-- cannot_delete_protected_category.

create or replace function trg_guard_protected_categories()
returns trigger
language plpgsql
as $$
begin
  if old.kind in ('otros', 'debt') then
    raise exception 'cannot_delete_protected_category'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger protected_categories_guard
  before delete on categories
  for each row execute function trg_guard_protected_categories();
