import { describe, expect, it } from 'vitest';
import { clampDueDay, hasCoveringPaymentInMonth, sameMonth } from './debts';
import type { DebtPayment } from './types';

function payment(overrides: Partial<DebtPayment>): DebtPayment {
  return {
    id: 'p1',
    user_id: 'u1',
    debt_id: 'd1',
    transaction_id: 't1',
    amount_cents: 50000,
    payment_date: '2026-03-15',
    covered_minimum: true,
    months_decremented: 1,
    created_at: '2026-03-15T00:00:00Z',
    ...overrides,
  };
}

describe('sameMonth', () => {
  it('returns true for two dates in the same calendar month', () => {
    expect(sameMonth('2026-03-01', '2026-03-31')).toBe(true);
  });

  it('returns false for dates in different months', () => {
    expect(sameMonth('2026-03-31', '2026-04-01')).toBe(false);
  });
});

describe('hasCoveringPaymentInMonth', () => {
  it('is true when a covering payment exists in the given month', () => {
    const payments = [payment({ payment_date: '2026-03-10', covered_minimum: true })];
    expect(hasCoveringPaymentInMonth(payments, '2026-03-15')).toBe(true);
  });

  it('ignores below-minimum payments in the month', () => {
    const payments = [payment({ payment_date: '2026-03-10', covered_minimum: false })];
    expect(hasCoveringPaymentInMonth(payments, '2026-03-15')).toBe(false);
  });

  it('ignores covering payments from other months', () => {
    const payments = [payment({ payment_date: '2026-02-10', covered_minimum: true })];
    expect(hasCoveringPaymentInMonth(payments, '2026-03-15')).toBe(false);
  });
});

describe('clampDueDay', () => {
  it('clamps day 31 to February 28 in a non-leap year (D7)', () => {
    expect(clampDueDay(2026, 2, 31)).toBe(28);
  });

  it('clamps day 31 to February 29 in a leap year', () => {
    expect(clampDueDay(2024, 2, 31)).toBe(29);
  });

  it('leaves a valid day unchanged', () => {
    expect(clampDueDay(2026, 3, 15)).toBe(15);
  });
});
