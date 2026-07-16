-- 0027_rpc_recommendation_status
-- Per-item recommendation state for a month, and the single source of truth for
-- recommendation matching. `missing_recommendations` (0017/0024) becomes a thin
-- wrapper over it so the match rules exist in exactly one place.
--
-- WHY THREE SEPARATE FLAGS
-- The /recommended page splits templates into "pending" and "past". The tempting
-- shortcut — treat absence from missing_recommendations as "covered" — is WRONG:
-- that RPC also omits items that simply are not DUE this month. A 'yearly' item
-- anchored to March is absent every month except March, and would be misfiled as
-- past for eleven months a year. "Covered" and "due" are different facts, so they
-- are reported separately and never inferred from one another.
--
--   is_covered — a matching transaction exists in this month. Match key per type
--                (0022/0024): expense -> same category; income -> same description,
--                trimmed and case-folded (income carries no category). An income
--                item with a blank description has nothing to match on and is
--                therefore never covered, as is an expense item with no category
--                (`= NULL` never matches).
--   is_expired — the window closed before this month. Only bounded windows expire;
--                window_end IS NULL (incl. every 'none' item) never does.
--   is_due     — show it this month: inside the window, the repeat rule fires, and
--                it is not already covered.
--
-- Repeat rules: 'monthly' fires every month in the window; 'yearly' fires only in
-- the anniversary month of window_start; 'none' fires from window_start onward and
-- keeps firing until covered (0026).
--
-- Stateless and derived — never materialized per month (§7.5). SECURITY INVOKER, so
-- both sides of the coverage check only ever see the caller's own rows.

create or replace function recommendation_status(p_month integer, p_year integer)
returns table (
  item       jsonb,
  is_covered boolean,
  is_due     boolean,
  is_expired boolean
)
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_month_start date;
  v_month_end   date;
begin
  if p_month is null or p_month < 1 or p_month > 12
     or p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;

  return query
  with flags as (
    select
      ri,
      exists (
        select 1
        from transactions t
        where t.tx_date between v_month_start and v_month_end
          and case ri.type
                when 'expense' then
                  t.type = 'expense' and t.category_id = ri.category_id
                when 'income' then
                  t.type = 'income'
                  and btrim(ri.description) <> ''
                  and lower(btrim(t.description)) = lower(btrim(ri.description))
              end
      ) as covered,
      -- Month-granular, matching the rest of the window logic: any day of
      -- window_start within a month makes that whole month "started".
      (ri.window_start <= v_month_end) as started,
      (ri.window_end is not null and ri.window_end < v_month_start) as expired,
      (ri.window_end is null or ri.window_end >= v_month_start) as within_end,
      (case ri.repeat_mode
         when 'monthly' then true
         when 'none'    then true  -- a one-off stays due until it is covered
         when 'yearly'  then extract(month from ri.window_start)::integer = p_month
       end) as scheduled
    from recommended_items ri
  )
  select
    to_jsonb(f.ri) as item,
    f.covered      as is_covered,
    (f.started and f.within_end and f.scheduled and not f.covered) as is_due,
    f.expired      as is_expired
  from flags f
  order by (f.ri).created_at;
end;
$$;

grant execute on function recommendation_status(integer, integer) to authenticated;

-- missing_recommendations now delegates: "missing this month" is exactly is_due,
-- which already excludes covered items. Behaviour for existing monthly/yearly rows
-- is unchanged, so the dashboard banner and its callers are untouched. The
-- invalid_period guard propagates from recommendation_status.
create or replace function missing_recommendations(p_month integer, p_year integer)
returns table (item jsonb)
language sql
security invoker
stable
set search_path = public
as $$
  select s.item
  from recommendation_status(p_month, p_year) s
  where s.is_due;
$$;

grant execute on function missing_recommendations(integer, integer) to authenticated;
