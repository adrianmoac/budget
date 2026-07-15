import type { DebtStatus } from './types';

/**
 * Central React Query key registry (spec §6.1). Query keys MUST come from here —
 * no inline literals (spec §10.2). Keys are `as const` so their tuple shape is
 * preserved for precise invalidation.
 */
export const qk = {
  totals: () => ['totals'] as const,
  investments: () => ['investments'] as const,
  transactions: (year: number, month: number) =>
    ['transactions', { year, month }] as const,
  investedThisMonth: (year: number, month: number) =>
    ['investedThisMonth', { year, month }] as const,
  yearSummary: (year: number) => ['yearSummary', year] as const,
  categories: () => ['categories'] as const,
  debts: (status?: DebtStatus) => ['debts', { status: status ?? 'all' }] as const,
  debtPayments: (debtId: string) => ['debtPayments', debtId] as const,
  contributions: (investmentId: string) =>
    ['contributions', { investmentId }] as const,
  // Derived "missing this period" list from the missing_recommendations RPC (§6.1).
  recommendations: (year: number, month: number) =>
    ['recommendations', { year, month }] as const,
  // The recommended-item templates themselves (the /recommended CRUD list). Distinct
  // from the period-scoped derived `recommendations` key above; an app-specific
  // consumer beyond the §6.1 matrix (like `investedThisMonth`), invalidated on CRUD.
  recommendedItems: () => ['recommendedItems'] as const,
} as const;
