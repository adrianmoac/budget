import type { TxType } from './types';

/**
 * Money helpers. Money is ALWAYS integer centavos in code and DB; pesos exist
 * only at the display/input edge (architecture §6, spec §0). A branded type
 * prevents accidentally mixing pesos and centavos (spec §10.3, §11).
 */
export type Centavos = number & { readonly __brand: 'Centavos' };

/** Line-item amounts are stored as INTEGER centavos (max ≈ $21,474,836.47 MXN). */
export const MAX_CENTAVOS = 2_147_483_647;

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

/** Assert-and-brand a raw integer as Centavos. Rejects non-integers/NaN/Infinity. */
export function asCentavos(value: number): Centavos {
  if (!Number.isInteger(value)) {
    throw new RangeError(`Centavos must be an integer, got ${value}`);
  }
  return value as Centavos;
}

/**
 * Convert a pesos amount (number of pesos, e.g. 19.99) to integer centavos.
 * Rejects NaN/Infinity/negative and values exceeding the INTEGER range — never
 * silently coerces (security-standards: reject invalid input at the boundary).
 */
export function toCentavos(pesos: number): Centavos {
  if (typeof pesos !== 'number' || Number.isNaN(pesos) || !Number.isFinite(pesos)) {
    throw new RangeError(`Invalid pesos amount: ${pesos}`);
  }
  if (pesos < 0) {
    throw new RangeError(`Pesos amount must be non-negative: ${pesos}`);
  }
  // Round to the nearest cent to absorb binary float representation error.
  const centavos = Math.round(pesos * 100);
  if (centavos > MAX_CENTAVOS) {
    throw new RangeError(`Amount exceeds maximum: ${pesos}`);
  }
  return centavos as Centavos;
}

/** Convert integer centavos back to a pesos number (for prefilling edit forms). */
export function fromCentavos(centavos: number): number {
  return centavos / 100;
}

/** Format integer centavos as an MXN currency string, e.g. `$1,234.56`. */
export function formatMXN(centavos: number): string {
  return currencyFormatter.format(centavos / 100);
}

/**
 * Signed effect on liquid cash: `+amount` for income, `-amount` for expense.
 * TypeScript mirror of the DB `signed_effect(tx_type, integer)` function; parity
 * is asserted in tests so the two implementations cannot drift (spec §11).
 */
export function signedEffect(type: TxType, amountCents: number): number {
  return type === 'income' ? amountCents : -amountCents;
}
