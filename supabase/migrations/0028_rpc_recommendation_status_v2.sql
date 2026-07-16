-- 0028_rpc_recommendation_status_v2
-- Three corrections to recommendation_status (0027), all still derived — nothing is
-- materialized, per §7.5.
--
-- 1. A ONE-OFF IS PAID ONCE, NOT ONCE PER MONTH.
--    0027 checked coverage only inside the queried month, which is right for
--    'monthly'/'yearly' (you pay rent again every month) but wrong for 'none': a
--    one-off paid in Aug 2025 looked unpaid in every later month, so it sat in
--    Pendientes forever and the dashboard banner nagged about it indefinitely.
--    A 'none' item is now covered by any matching transaction from window_start up
--    to the end of the queried month — i.e. "have I ever paid this since it started?"
--    The upper bound keeps the answer honest for historical queries: a payment made
--    later cannot retroactively cover an earlier month.
--
-- 2. EXPIRY IS DAY-GRANULAR, NOT MONTH-GRANULAR.
--    0027 expired an item only once the whole queried month sat past window_end, so
--    an item whose window closed on the 6th still showed as pending until the 1st of
--    the next month. Expiry is now measured against a reference day:
--      * the queried month is the current month -> today (America/Mexico_City)
--      * otherwise                              -> the first of that month
--    So an item expires the day after its window_end, and one expiring TODAY is still
--    pending (`<` not `<=`). Anchoring to month-start outside the current month keeps
--    historical queries meaningful: asking about January must not mark a January item
--    expired just because today is July.
--
--    Note this is intentionally finer than the coverage match, which stays
--    month-granular (§7.5): "is the window still open?" is a question about now,
--    while "was it paid?" is a question about a period.
--
-- 3. REPORTS WHEN IT WAS COVERED.
--    `covered_on` returns the date of the earliest matching transaction (the first
--    time it was paid), so the UI can say "Registrada el 14 ago 2025" rather than a
--    bare past row. Derived from the same match — no stored status, no drift.
--
-- is_due now keys off `not expired` rather than the old month-granular `within_end`,
-- which is strictly tighter: an item that expired mid-month stops being recommended
-- immediately instead of lingering until the month rolls over.
--
-- The return type gains a column, so the function must be dropped rather than
-- replaced. missing_recommendations selects `item`/`is_due` from it by name via a
-- string-bodied SQL function, so it needs no change and keeps working.

drop function if exists recommendation_status(integer, integer);

create function recommendation_status(p_month integer, p_year integer)
returns table (
  item       jsonb,
  is_covered boolean,
  is_due     boolean,
  is_expired boolean,
  covered_on date
)
language plpgsql
security invoker
stable
set search_path = public
as $$
declare
  v_month_start date;
  v_month_end   date;
  v_today       date;
  v_ref         date;
begin
  if p_month is null or p_month < 1 or p_month > 12
     or p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_today       := (now() at time zone 'America/Mexico_City')::date;
  -- Expiry reference: today when looking at the current month, else the month's start.
  v_ref := case
             when v_today between v_month_start and v_month_end then v_today
             else v_month_start
           end;

  return query
  with flags as (
    select
      ri,
      (
        select min(t.tx_date)
        from transactions t
        where t.tx_date between
                -- A one-off looks all the way back to its start date; a repeating
                -- item only counts a payment inside the queried month.
                (case when ri.repeat_mode = 'none' then ri.window_start else v_month_start end)
                and v_month_end
          and case ri.type
                when 'expense' then
                  t.type = 'expense' and t.category_id = ri.category_id
                when 'income' then
                  t.type = 'income'
                  and btrim(ri.description) <> ''
                  and lower(btrim(t.description)) = lower(btrim(ri.description))
              end
      ) as covered_on,
      (ri.window_start <= v_month_end) as started,
      (ri.window_end is not null and ri.window_end < v_ref) as expired,
      (case ri.repeat_mode
         when 'monthly' then true
         when 'none'    then true  -- a one-off stays due until it is covered
         when 'yearly'  then extract(month from ri.window_start)::integer = p_month
       end) as scheduled
    from recommended_items ri
  )
  select
    to_jsonb(f.ri)              as item,
    (f.covered_on is not null)  as is_covered,
    (f.started and not f.expired and f.scheduled and f.covered_on is null) as is_due,
    f.expired                   as is_expired,
    f.covered_on
  from flags f
  order by (f.ri).created_at;
end;
$$;

grant execute on function recommendation_status(integer, integer) to authenticated;
