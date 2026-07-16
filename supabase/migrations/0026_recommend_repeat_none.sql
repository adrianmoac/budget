-- 0026_recommend_repeat_none
-- A third repeat mode: 'none' — a one-off recommendation that does not repeat.
--
-- Semantics (0027): recommended from its window_start month onward and kept until a
-- matching transaction covers it, however many months that takes. It is therefore
-- never bounded by a window end — the form stores window_end = null for it, which
-- already makes it non-expiring in the status query without special-casing.
--
-- Alone in its own migration on purpose: Postgres forbids *using* a new enum value
-- in the same transaction that adds it, and 0027 compares against 'none'.

alter type recommend_repeat add value 'none';
