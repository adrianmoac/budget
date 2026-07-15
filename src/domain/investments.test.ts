import { describe, expect, it } from 'vitest';
import { computeInterest } from './investments';

describe('computeInterest', () => {
  it('computes positive interest and percentage', () => {
    // invested 1000.00, market 1100.00 → +100.00 (+10%)
    const result = computeInterest(110_000, 100_000);
    expect(result.interestCents).toBe(10_000);
    expect(result.percent).toBeCloseTo(10, 5);
  });

  it('computes negative interest (loss)', () => {
    const result = computeInterest(90_000, 100_000);
    expect(result.interestCents).toBe(-10_000);
    expect(result.percent).toBeCloseTo(-10, 5);
  });

  it('returns null percent when nothing is invested (divide-by-zero guard)', () => {
    const result = computeInterest(0, 0);
    expect(result.interestCents).toBe(0);
    expect(result.percent).toBeNull();
  });

  it('reports market value as pure interest when invested is 0 but market > 0', () => {
    const result = computeInterest(5_000, 0);
    expect(result.interestCents).toBe(5_000);
    expect(result.percent).toBeNull();
  });
});
