import { formatDateMX, formatMonthYearMX, monthNameFromISO, yearFromISO } from './date';
import type { RecommendedItem, RecommendRepeat } from './types';

/**
 * Presentation rules for a recommendation's repeat mode and window.
 *
 * Matching is month-granular: `recommendation_status` (0027) compares
 * `window_start <= <last day of month>` and `window_end >= <first day of month>`, so
 * every day 1–31 produces an identical result. Rendering a full date on a repeating
 * item therefore promises a precision the matching does not honour — "14 jun 2026"
 * behaves exactly like "1 jun 2026". These labels drop the parts that carry no
 * meaning, per mode:
 *
 *   none    — a one-off: the date is the whole point, so show it in full.
 *   monthly — the day is noise; window_start only says *when it starts*.
 *   yearly  — the day is noise, but the MONTH of window_start is the anniversary
 *             anchor, so lead with it and let the years bound the range.
 */

const REPEAT_LABELS: Record<RecommendRepeat, string> = {
  monthly: 'Cada mes',
  yearly: 'Cada año',
  none: 'Una vez',
};

export function repeatLabel(mode: RecommendRepeat): string {
  return REPEAT_LABELS[mode];
}

type WindowFields = Pick<RecommendedItem, 'window_start' | 'window_end' | 'repeat_mode'>;

export function windowLabel(item: WindowFields): string {
  const { window_start: start, window_end: end, repeat_mode: mode } = item;

  if (mode === 'none') {
    // A one-off has no range (window_end is stored null), and it runs until it is
    // covered — so the date reads as a start, not a deadline.
    return formatDateMX(start);
  }

  if (mode === 'yearly') {
    const anchor = monthNameFromISO(start);
    const years = end
      ? `${yearFromISO(start)} – ${yearFromISO(end)}`
      : `desde ${yearFromISO(start)}`;
    return `${anchor} · ${years}`;
  }

  return end
    ? `${formatMonthYearMX(start)} – ${formatMonthYearMX(end)}`
    : `Desde ${formatMonthYearMX(start)}`;
}
