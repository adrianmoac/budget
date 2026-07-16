/**
 * Date helpers. Budgeting is day-granular and pinned to America/Mexico_City to
 * avoid TZ off-by-one at month boundaries (architecture §0.2, §14). Dates are
 * stored/transported as ISO `YYYY-MM-DD` strings (no time component).
 */
export const MX_TZ = 'America/Mexico_City';

export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export interface MonthYear {
  month: number; // 1..12
  year: number;
}

/** Current month/year in MX time. */
export function currentMonthYearMX(now: Date = new Date()): MonthYear {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MX_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  return { month, year };
}

/** Today's date in MX time as an ISO `YYYY-MM-DD` string. */
export function todayISOMX(now: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: MX_TZ }).format(now);
}

/** Number of days in the given 1-based month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Inclusive ISO date range `[start, end]` covering the whole month, suitable for
 * `tx_date` range filters (`gte start`, `lte end`).
 */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = String(daysInMonth(year, month)).padStart(2, '0');
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${lastDay}` };
}

/** Format an ISO date string for display in es-MX. */
export function formatDateMX(iso: string): string {
  // Parse as a plain date at UTC noon to avoid TZ shifting the calendar day.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MX_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

export function monthLabelES(month: number): string {
  return MONTH_NAMES_ES[month - 1] ?? '';
}

/**
 * Format an ISO date as month + year only (`"jun 2026"`), dropping the day.
 * Recommendation matching is month-granular, so a repeating item's window must not
 * render a day it does not honour (see domain/recommendations.ts).
 */
export function formatMonthYearMX(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MX_TZ,
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

/** The full Spanish month name of an ISO date (`"2026-06-14"` → `"junio"`). */
export function monthNameFromISO(iso: string): string {
  const month = Number(iso.split('-')[1]);
  return (monthLabelES(month) || iso).toLowerCase();
}

/** The year component of an ISO date as a string (`"2026-06-14"` → `"2026"`). */
export function yearFromISO(iso: string): string {
  return iso.split('-')[0] ?? iso;
}
