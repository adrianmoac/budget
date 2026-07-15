import { describe, expect, it } from 'vitest';
import {
  asCentavos,
  formatMXN,
  fromCentavos,
  MAX_CENTAVOS,
  signedEffect,
  toCentavos,
} from './money';

describe('toCentavos', () => {
  it('converts whole pesos to integer centavos', () => {
    expect(toCentavos(100)).toBe(10_000);
  });

  it('converts fractional pesos without float drift', () => {
    // 19.99 * 100 in floats is 1998.9999…; rounding must yield exactly 1999.
    expect(toCentavos(19.99)).toBe(1999);
  });

  it('round-trips through fromCentavos', () => {
    for (const pesos of [0, 1, 19.99, 1234.56, 999999.99]) {
      expect(fromCentavos(toCentavos(pesos))).toBeCloseTo(pesos, 2);
    }
  });

  it('accepts zero', () => {
    expect(toCentavos(0)).toBe(0);
  });

  it('rejects NaN', () => {
    expect(() => toCentavos(Number.NaN)).toThrow(RangeError);
  });

  it('rejects Infinity', () => {
    expect(() => toCentavos(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => toCentavos(Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });

  it('rejects negative amounts', () => {
    expect(() => toCentavos(-1)).toThrow(RangeError);
  });

  it('rejects amounts exceeding the INTEGER centavos range', () => {
    expect(() => toCentavos(MAX_CENTAVOS / 100 + 1)).toThrow(RangeError);
  });
});

describe('asCentavos', () => {
  it('brands an integer', () => {
    expect(asCentavos(1999)).toBe(1999);
  });

  it('rejects non-integers', () => {
    expect(() => asCentavos(19.99)).toThrow(RangeError);
  });
});

describe('signedEffect', () => {
  it('is positive for income', () => {
    expect(signedEffect('income', 500)).toBe(500);
  });

  it('is negative for expense', () => {
    expect(signedEffect('expense', 500)).toBe(-500);
  });

  it('mirrors the DB signed_effect contract (parity)', () => {
    // The DB function (proven in Phase 1 pgTAP) computes the same values; this
    // asserts the TS mirror cannot drift from that contract.
    expect(signedEffect('income', 1)).toBe(1);
    expect(signedEffect('expense', 1)).toBe(-1);
  });
});

describe('formatMXN', () => {
  it('formats integer centavos as MXN currency', () => {
    // Non-breaking space between symbol and number; assert the significant parts.
    const out = formatMXN(123_456);
    expect(out).toContain('1,234.56');
    expect(out).toContain('$');
  });

  it('formats zero', () => {
    expect(formatMXN(0)).toContain('0.00');
  });

  it('formats negative amounts (e.g. negative interest)', () => {
    expect(formatMXN(-5000)).toContain('50.00');
    expect(formatMXN(-5000)).toContain('-');
  });
});
