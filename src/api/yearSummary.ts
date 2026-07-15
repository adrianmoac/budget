import { z } from 'zod';
import { AppError } from './errors';
import { supabase } from './supabaseClient';

/**
 * Year view data source (spec §3.6, §4.4). `year_summary` is a server-side
 * aggregate returning exactly 12 rows (zero-filled) of per-month income, expense,
 * balance, and invested-this-month — scoped to the caller by RLS.
 */
export interface YearMonthSummary {
  month: number;
  income_cents: number;
  expense_cents: number;
  balance_cents: number;
  invested_cents: number;
}

const summaryRowSchema = z.object({
  month: z.number().int(),
  income_cents: z.number(),
  expense_cents: z.number(),
  balance_cents: z.number(),
  invested_cents: z.number(),
});

/** Per-month aggregates for a year (12 rows). Validated before use (§10.3). */
export async function fetchYearSummary(year: number): Promise<YearMonthSummary[]> {
  const { data, error } = await supabase.rpc('year_summary', { p_year: year });
  if (error) throw AppError.fromUnknown(error);
  const parsed = z.array(summaryRowSchema).safeParse(data);
  if (!parsed.success) throw new AppError('unexpected_error');
  return parsed.data;
}
