-- 0021_reconciliation_view
-- Read-only invariant check: the stored denormalized totals MUST equal the values
-- recomputed from the underlying rows. Any non-zero drift indicates a trigger bug.
-- Uses the same signed_effect() as the liquid_cash trigger so the two share one
-- definition. security_invoker=true so RLS applies and a user sees only their row.

create view reconciliation
with (security_invoker = true)
as
select
  t.user_id,
  t.liquid_cash_cents                                          as stored_liquid_cash_cents,
  coalesce(tx.sum_signed, 0)::bigint                           as computed_liquid_cash_cents,
  (t.liquid_cash_cents - coalesce(tx.sum_signed, 0))::bigint   as liquid_cash_drift,
  t.total_invested_cents                                       as stored_total_invested_cents,
  coalesce(ic.sum_contrib, 0)::bigint                          as computed_total_invested_cents,
  (t.total_invested_cents - coalesce(ic.sum_contrib, 0))::bigint as total_invested_drift
from totals t
left join (
  select user_id, sum(signed_effect(type, amount_cents)) as sum_signed
  from transactions
  group by user_id
) tx on tx.user_id = t.user_id
left join (
  select user_id, sum(amount_cents) as sum_contrib
  from investment_contributions
  group by user_id
) ic on ic.user_id = t.user_id;

grant select on reconciliation to authenticated;
