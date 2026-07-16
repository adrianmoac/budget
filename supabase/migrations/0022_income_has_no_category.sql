-- 0022_income_has_no_category
-- An income carries no category; only expenses are classified (revises FR-4/D3,
-- which assumed every transaction had one).
--
-- `category_id` becomes nullable and a CHECK pins the invariant in both directions:
-- income MUST have no category, expense MUST have one. Enforcing both halves means
-- a type flip (expense<->income) cannot leave a stale category behind — the update
-- has to clear or set it in the same statement, which is exactly what EntryForm does.
--
-- Existing income rows are stripped of their category. This is intentionally
-- destructive: those categories were never meaningful for income, and the derived
-- liquid_cash total is unaffected (it reads type + amount only, never category).
--
-- Knock-on effects, verified:
--   * delete_category (0015) reassigns `where category_id = p_category_id`, so it
--     only ever touches expense rows now — no change needed.
--   * The 0014 debt_id guard only fires when debt_id is not null, and debt payments
--     are always expenses carrying the debt category — no change needed.
--   * Index transactions_user_category simply skips the NULL income rows.

alter table transactions alter column category_id drop not null;

update transactions
   set category_id = null
 where type = 'income'
   and category_id is not null;

alter table transactions
  add constraint transactions_category_by_type
  check (
    (type = 'income'  and category_id is null) or
    (type = 'expense' and category_id is not null)
  );
