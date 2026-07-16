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
  // Per-item due/covered/expired flags for a period (recommendation_status RPC).
  // Nested under the 'recommendations' prefix so the existing prefix invalidation
  // after any recommended-item or transaction mutation refetches it too.
  recommendationStatus: (year: number, month: number) =>
    ['recommendations', 'status', { year, month }] as const,
} as const;
