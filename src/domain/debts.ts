import { daysInMonth } from './date';
import type { DebtPayment } from './types';

/**
 * Pure debt helpers (no React). Month comparison works on the `YYYY-MM` prefix of
 * ISO dates, which is TZ-safe because dates are stored day-granular (§0.2).
 */

/** True when two ISO `YYYY-MM-DD` dates fall in the same calendar month. */
export function sameMonth(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 7) === isoB.slice(0, 7);
}

/**
 * Whether the debt already has a covering payment in the month of `iso` (D6). The
 * UI warns on this but still allows the payment; multiple covering payments per
 * month are permitted.
 */
export function hasCoveringPaymentInMonth(
  payments: DebtPayment[],
  iso: string,
): boolean {
  return payments.some((p) => p.covered_minimum && sameMonth(p.payment_date, iso));
}

/** Clamp a debt's due day to the target month's length (D7): e.g. 31 → Feb 28/29. */
export function clampDueDay(year: number, month: number, dueDay: number): number {
  return Math.min(dueDay, daysInMonth(year, month));
}
