/**
 * Derived investment interest (architecture D1, §7.1). `totalInterestMoney` is
 * NOT stored — it is computed at read time as market value minus invested. The
 * percentage is guarded against divide-by-zero: `null` when nothing is invested
 * (the UI hides the % and shows a tooltip instead — AC-Interest-zero).
 */
export interface InterestResult {
  /** market value − invested (may be negative). */
  interestCents: number;
  /** interest / invested × 100, or `null` when invested is 0. */
  percent: number | null;
}

export function computeInterest(
  marketValueCents: number,
  investedCents: number,
): InterestResult {
  const interestCents = marketValueCents - investedCents;
  const percent = investedCents === 0 ? null : (interestCents / investedCents) * 100;
  return { interestCents, percent };
}
