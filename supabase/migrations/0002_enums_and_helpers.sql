-- 0002_enums_and_helpers
-- Enum types shared across the schema and the immutable signed_effect() helper.
-- signed_effect() is the single source of truth for how a transaction's type maps
-- to its effect on liquid cash; it is used by BOTH the liquid_cash trigger (0011)
-- and the reconciliation view (0021) so the two can never drift apart.

create type tx_type as enum ('expense', 'income');
create type recurrence as enum ('recurrent', 'variable');
create type category_kind as enum ('normal', 'otros', 'debt');
create type debt_status as enum ('active', 'paid', 'archived');

create or replace function signed_effect(p_type tx_type, p_amount integer)
returns bigint
language sql
immutable
as $$
  select case p_type
    when 'income'  then  p_amount::bigint
    when 'expense' then -p_amount::bigint
  end;
$$;
