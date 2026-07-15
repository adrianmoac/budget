-- 0019_rpc_year_summary
-- Server-side per-month aggregation for the year view (spec §3.6, §4.4, FR-13).
-- Returns exactly 12 rows (one per month, zero-filled) for the requested year:
-- income, expense, balance (= income - expense), and invested-this-month.
--
-- Aggregation is scoped to the caller by RLS (SECURITY INVOKER), so the sums only
-- ever cover the caller's own transactions and contributions. bigint accumulators
-- give headroom over the per-row integer centavos (architecture §0.2).
--
-- Contributions feed `invested_cents` and never touch income/expense — they do not
-- affect liquid cash (D2); this view simply reports "invested this period" (§7.7).

create or replace function year_summary(p_year integer)
returns table (
  month          integer,
  income_cents   bigint,
  expense_cents  bigint,
  balance_cents  bigint,
  invested_cents bigint
)
language plpgsql
security invoker
stable
set search_path = public
as $$
begin
  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;

  return query
  with tx as (
    select
      extract(month from t.tx_date)::integer as month,
      sum(case when t.type = 'income'  then t.amount_cents else 0 end)::bigint as income_cents,
      sum(case when t.type = 'expense' then t.amount_cents else 0 end)::bigint as expense_cents
    from transactions t
    where extract(year from t.tx_date)::integer = p_year
    group by 1
  ),
  contrib as (
    select
      extract(month from ic.contrib_date)::integer as month,
      sum(ic.amount_cents)::bigint as invested_cents
    from investment_contributions ic
    where extract(year from ic.contrib_date)::integer = p_year
    group by 1
  )
  select
    m.month,
    coalesce(tx.income_cents, 0)::bigint  as income_cents,
    coalesce(tx.expense_cents, 0)::bigint as expense_cents,
    (coalesce(tx.income_cents, 0) - coalesce(tx.expense_cents, 0))::bigint as balance_cents,
    coalesce(contrib.invested_cents, 0)::bigint as invested_cents
  from generate_series(1, 12) as m(month)
  left join tx      on tx.month = m.month
  left join contrib on contrib.month = m.month
  order by m.month;
end;
$$;

grant execute on function year_summary(integer) to authenticated;
