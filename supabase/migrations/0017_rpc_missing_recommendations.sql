-- 0017_rpc_missing_recommendations
-- Derived "recommended for this month" query (spec §3.4, §7.5, D3). For a given
-- (month, year) in America/Mexico_City, return each recommended item whose
-- [window_start, window_end] window overlaps the month AND for which NO transaction
-- shares the item's category_id in that month/year. Type is a display attribute
-- only (D3); the match key is category + month + year.
--
-- "Active" (§7.5) means the window overlaps the requested month — recommended_items
-- has no separate status flag. window_end IS NULL is an open-ended (still active) window.
--
-- A recommended item with a NULL category_id can never be "covered" by a transaction
-- (transactions.category_id is NOT NULL, so `= NULL` never matches), so it is always
-- recommended within its window — the faithful reading of D3's category match.
--
-- Never materialized per month (§7.5): this is a stateless, always-correct query.
-- SECURITY INVOKER: recommended_items and transactions are both filtered to the
-- caller by RLS, so aggregation only ever sees the caller's rows.
--
-- Returns one jsonb-wrapped item per row (`{ item }`) so PostgREST yields an array
-- matching the §3.4 response contract; the api layer Zod-validates each item.

create or replace function missing_recommendations(p_month integer, p_year integer)
returns table (item jsonb)
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
  select to_jsonb(ri) as item
  from recommended_items ri
  where ri.window_start <= v_month_end
    and (ri.window_end is null or ri.window_end >= v_month_start)
    and not exists (
      select 1
      from transactions t
      where t.category_id = ri.category_id
        and t.tx_date between v_month_start and v_month_end
    )
  order by ri.created_at;
end;
$$;

grant execute on function missing_recommendations(integer, integer) to authenticated;
