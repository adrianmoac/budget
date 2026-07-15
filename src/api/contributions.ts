import { AppError } from './errors';
import { supabase } from './supabaseClient';
import { monthRange } from '@/domain/date';

/**
 * Sum of contribution amounts in a month ("invested this period", §7.7). Phase 2
 * needs only this read for the month/period totals; full contribution CRUD is
 * Phase 5.
 */
export async function fetchInvestedCentsInMonth(
  year: number,
  month: number,
): Promise<number> {
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('amount_cents')
    .gte('contrib_date', start)
    .lte('contrib_date', end);
  if (error) throw AppError.fromUnknown(error);
  return data.reduce((sum, row) => sum + row.amount_cents, 0);
}
