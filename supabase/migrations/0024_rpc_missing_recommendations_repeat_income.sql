-- 0024_rpc_missing_recommendations_repeat_income
-- Revises missing_recommendations (0017) for two changes:
--
--   1. repeat_mode (0023): 'monthly' items are recommended in every month their
--      window overlaps; 'yearly' items only in the anniversary month of
--      window_start.
--   2. Income no longer carries a category (0022), so D3's category+month+year
--      match key cannot cover income items. The match key is now per type:
--        * expense -> an expense in the same category, that month, covers it
--                     (D3 unchanged).
--        * income  -> an income whose description matches the item's, that month,
--                     covers it. Compared case-insensitively and whitespace-trimmed
--                     so "Quincena " and "quincena" are the same item.
--
-- Never-covered cases (always recommended inside their window), both faithful to
-- 0017's treatment of a NULL category:
--   * an expense item with no category — `= NULL` never matches.
--   * an income item with an empty description — there is nothing to match on, so
--     it is not silently covered by any blank-description income.
--
-- Still stateless and derived (§7.5); still SECURITY INVOKER, so both sides of the
-- NOT EXISTS only ever see the caller's own rows.

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
    and (
      ri.repeat_mode = 'monthly'
      or extract(month from ri.window_start)::integer = p_month
    )
    and not exists (
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
    )
  order by ri.created_at;
end;
$$;

grant execute on function missing_recommendations(integer, integer) to authenticated;
