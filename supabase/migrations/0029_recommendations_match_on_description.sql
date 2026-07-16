-- 0029_recommendations_match_on_description
-- Description becomes the match key for BOTH types, so a category can carry more
-- than one recommendation. This retires D3 (match on category + month + year)
-- entirely — category is now an organisational/display attribute only.
--
-- WHY: under the 0024 rule an expense was covered by ANY expense in its category, so
-- two items sharing a category ("Agua" and "Luz" under Casa) could never coexist —
-- the first matching expense silently covered both. Matching on description instead
-- makes each item stand on its own, and collapses the two per-type branches into one
-- uniform rule that already applied to income.
--
-- The match stays exact but forgiving of typing: both sides are trimmed and
-- case-folded, so "Agua", "  agua " and "AGUA" are the same item. It is NOT a
-- substring match — "Luz" must not be covered by "Luces de navidad".
--
-- `t.type = ri.type` is retained so an income cannot cover an expense item (or vice
-- versa) merely by sharing a description.
--
-- Consequences, both intended:
--   * An expense recommendation with NO category is now perfectly coverable — the
--     dead-end noted in 0024/0027 (an expense item with a null category could never
--     match) is gone.
--   * A transaction whose description is blank covers nothing. Since description is
--     now the only key, a blank one is an item that can never be satisfied, so the
--     CHECK below forbids creating one (Zod rejects it at the boundary; this is the
--     defence-in-depth half, §13).

-- No existing row has a blank description; fail loudly rather than silently skip.
do $$
begin
  if exists (select 1 from recommended_items where btrim(description) = '') then
    raise exception 'cannot require a description: existing recommended_items have a blank one';
  end if;
end;
$$;

alter table recommended_items drop constraint recommended_items_description_check;
alter table recommended_items
  add constraint recommended_items_description_check
  check (char_length(btrim(description)) between 1 and 280);

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
  -- Expiry reference: today when looking at the current month, else the month's start
  -- (0028) — so a historical query never expires an item inside its own window.
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
                -- A one-off looks back to its start date; a repeating item only
                -- counts a payment inside the queried month (0028).
                (case when ri.repeat_mode = 'none' then ri.window_start else v_month_start end)
                and v_month_end
          and t.type = ri.type
          and btrim(ri.description) <> ''
          and lower(btrim(t.description)) = lower(btrim(ri.description))
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
