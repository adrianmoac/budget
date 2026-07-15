-- 0016_rpc_record_debt_payment
-- Atomic debt payment (spec §3.2, §7.2). In one transaction:
--   1. Insert an EXPENSE transaction classified to the caller's debt category and
--      linked to the debt (debt_id). The 0011 liquid_cash trigger fires, so the
--      cash debit and the debt side can never disagree.
--   2. Compute covered = amount >= minimum_payment; if covered AND remaining_months
--      > 0, decrement remaining_months by exactly one (D4) and set status='paid'
--      when it reaches zero.
--   3. Insert the debt_payments row linking the transaction, recording covered and
--      months_decremented (0 or 1).
-- If any step fails the whole function rolls back.
--
-- SECURITY INVOKER: runs under the caller's RLS, so a debt owned by another user is
-- invisible (resolves to debt_not_found) and every write is scoped to the caller.
-- The full transaction and debt rows are returned as jsonb OUT params so PostgREST
-- yields a single object matching the response contract; the api layer Zod-validates it.

create or replace function record_debt_payment(
  p_debt_id      uuid,
  p_amount_cents integer,
  p_date         date,
  p_description  text,
  out transaction        jsonb,
  out debt               jsonb,
  out covered_minimum    boolean,
  out months_decremented smallint
)
returns record
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt          debts;
  v_tx            transactions;
  v_debt_cat_id   uuid;
  v_new_remaining integer;
  v_months        smallint := 0;
begin
  -- Validate the amount (backstop to client Zod and the transactions CHECK).
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;

  -- Resolve the debt under caller RLS; must exist and be active.
  select * into v_debt from debts where id = p_debt_id;
  if not found then
    raise exception 'debt_not_found' using errcode = 'P0001';
  end if;
  if v_debt.status <> 'active' then
    raise exception 'debt_not_active' using errcode = 'P0001';
  end if;

  -- The caller's single debt category classifies the resulting expense; the 0014
  -- guard trigger requires debt_id entries to carry exactly this category.
  select id into v_debt_cat_id from categories where kind = 'debt';
  if not found then
    -- Provisioned by handle_new_user; absence is an unrecoverable state.
    raise exception 'debt_category_missing' using errcode = 'P0001';
  end if;

  insert into transactions
    (type, amount_cents, tx_date, description, category_id, recurrence, debt_id)
  values
    ('expense', p_amount_cents, p_date, coalesce(p_description, ''),
     v_debt_cat_id, 'recurrent', p_debt_id)
  returning * into v_tx;

  covered_minimum := p_amount_cents >= v_debt.minimum_payment_cents;

  if covered_minimum and v_debt.remaining_months > 0 then
    v_months        := 1;
    v_new_remaining := v_debt.remaining_months - 1;
    update debts
       set remaining_months = v_new_remaining,
           status = case when v_new_remaining = 0 then 'paid'::debt_status else status end
     where id = p_debt_id
     returning * into v_debt;
  end if;

  insert into debt_payments
    (debt_id, transaction_id, amount_cents, payment_date, covered_minimum, months_decremented)
  values
    (p_debt_id, v_tx.id, p_amount_cents, p_date, covered_minimum, v_months);

  months_decremented := v_months;
  transaction        := to_jsonb(v_tx);
  debt               := to_jsonb(v_debt);
end;
$$;

grant execute on function record_debt_payment(uuid, integer, date, text) to authenticated;
