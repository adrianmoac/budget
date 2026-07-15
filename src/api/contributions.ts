import { AppError } from './errors';
import { supabase } from './supabaseClient';
import { monthRange } from '@/domain/date';
import type { InvestmentContribution } from '@/domain/types';

/**
 * Sum of contribution amounts in a month ("invested this period", §7.7). Phase 2
 * needs only this read for the month/period totals; full contribution CRUD is
 * Phase 5 (below).
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

/** A vehicle's contributions, newest first (feeds ContributionHistory, §4.7). */
export async function listContributions(
  investmentId: string,
): Promise<InvestmentContribution[]> {
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('*')
    .eq('investment_id', investmentId)
    .order('contrib_date', { ascending: false });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export interface ContributionInput {
  investment_id: string;
  amount_cents: number;
  contrib_date: string;
}

/**
 * Record a contribution. Triggers (0012) raise the grand and per-vehicle invested
 * totals; liquid cash is never affected (D2).
 */
export async function createContribution(
  input: ContributionInput,
): Promise<InvestmentContribution> {
  const { data, error } = await supabase
    .from('investment_contributions')
    .insert(input)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Delete a contribution. Triggers reverse the invested totals (§7.6). */
export async function deleteContribution(id: string): Promise<void> {
  const { error } = await supabase
    .from('investment_contributions')
    .delete()
    .eq('id', id);
  if (error) throw AppError.fromUnknown(error);
}
