import { describe, expect, it } from 'vitest';
import {
  currentMonthYearMX,
  daysInMonth,
  formatDateMX,
  monthRange,
  monthLabelES,
  todayISOMX,
} from './date';

describe('daysInMonth', () => {
  it('handles 31-day months', () => {
    expect(daysInMonth(2025, 1)).toBe(31);
  });

  it('handles 30-day months', () => {
    expect(daysInMonth(2025, 4)).toBe(30);
  });

  it('handles February in a non-leap year', () => {
    expect(daysInMonth(2025, 2)).toBe(28);
  });

  it('handles February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });
});

describe('monthRange', () => {
  it('spans the whole month inclusively', () => {
    expect(monthRange(2025, 2)).toEqual({ start: '2025-02-01', end: '2025-02-28' });
  });

  it('clamps the end to the leap-February last day', () => {
    expect(monthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('zero-pads single-digit months', () => {
    expect(monthRange(2025, 7)).toEqual({ start: '2025-07-01', end: '2025-07-31' });
  });
});

describe('currentMonthYearMX', () => {
  it('reads month/year in America/Mexico_City', () => {
    // 2025-01-01T05:30:00Z is still 2024-12-31 23:30 in Mexico City (UTC-6).
    const { month, year } = currentMonthYearMX(new Date('2025-01-01T05:30:00Z'));
    expect(year).toBe(2024);
    expect(month).toBe(12);
  });
});

describe('todayISOMX', () => {
  it('formats the MX calendar day as ISO', () => {
    expect(todayISOMX(new Date('2025-06-15T18:00:00Z'))).toBe('2025-06-15');
  });
});

describe('formatDateMX', () => {
  it('formats an ISO date without timezone drift on the calendar day', () => {
    // Must render June 1, not May 31, despite UTC-6.
    expect(formatDateMX('2025-06-01')).toContain('01');
    expect(formatDateMX('2025-06-01')).toContain('2025');
  });
});

describe('monthLabelES', () => {
  it('returns the Spanish month name', () => {
    expect(monthLabelES(1)).toBe('Enero');
    expect(monthLabelES(12)).toBe('Diciembre');
  });
});
