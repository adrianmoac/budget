-- Reconciliation monitor check (architecture §15, CP-7.2).
--
-- Asserts the single most valuable invariant in a money app: the stored
-- denormalized totals equal the values recomputed from the underlying rows.
-- Reads the `reconciliation` view (migration 0021), which uses the same
-- signed_effect() as the liquid_cash trigger, so there is one source of truth.
--
-- Run with ON_ERROR_STOP so a drift RAISE aborts psql with a non-zero exit,
-- turning the scheduled job red (the alert):
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f reconciliation_check.sql
--
-- A direct DB connection (postgres role) bypasses RLS, so every user's row is
-- checked, not just the caller's.

do $$
declare
  drift_count integer;
begin
  select count(*)
    into drift_count
    from reconciliation
   where liquid_cash_drift <> 0
      or total_invested_drift <> 0;

  if drift_count > 0 then
    raise exception
      'reconciliation drift detected in % row(s): stored totals disagree with recomputed sums',
      drift_count;
  end if;

  raise notice 'reconciliation clean: zero drift across all users';
end $$;
