-- 0023_recommended_items_repeat
-- A recommended item repeats either every month or every year within its window.
--
-- 'monthly' reproduces the pre-existing behaviour (recommend in every month the
-- window overlaps), so it is the default and existing rows keep behaving as before.
-- 'yearly' recommends only in the anniversary month of window_start — an item
-- starting in March is recommended each March its window still covers.
--
-- The repeat mode is a filter over the derived query (0024), not a generator: no
-- rows are materialized per period, preserving the §7.5 "derived, never stored"
-- stance.

create type recommend_repeat as enum ('monthly', 'yearly');

alter table recommended_items
  add column repeat_mode recommend_repeat not null default 'monthly';
