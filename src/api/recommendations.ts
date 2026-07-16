import { z } from 'zod';
import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { RecommendedItem, RecommendRepeat } from '@/domain/types';

/**
 * Recommended items (spec §3.1, §4.8) are plain template rows CRUD'd via table ops.
 * "Missing for a month" is the derived `missing_recommendations` RPC (§3.4, §7.5) —
 * never materialized per month. Category reassignment on delete is handled by
 * `delete_category` (the FK is `ON DELETE SET NULL` as a backstop).
 */

export interface RecommendedItemInput {
  type: 'expense' | 'income';
  /** Expense match key (D3); always `null` for income, which matches on description. */
  category_id: string | null;
  description: string;
  expected_amount_cents: number | null;
  window_start: string;
  window_end: string | null;
  /** 'monthly' = every month in the window; 'yearly' = window_start's month only. */
  repeat_mode: RecommendRepeat;
}

/** All recommendation templates, newest first (feeds the /recommended list). */
export async function listRecommendedItems(): Promise<RecommendedItem[]> {
  const { data, error } = await supabase
    .from('recommended_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function createRecommendedItem(
  input: RecommendedItemInput,
): Promise<RecommendedItem> {
  const { data, error } = await supabase
    .from('recommended_items')
    .insert(input)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function updateRecommendedItem(
  id: string,
  input: RecommendedItemInput,
): Promise<RecommendedItem> {
  const { data, error } = await supabase
    .from('recommended_items')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function deleteRecommendedItem(id: string): Promise<void> {
  const { error } = await supabase.from('recommended_items').delete().eq('id', id);
  if (error) throw AppError.fromUnknown(error);
}

// The RPC returns one jsonb-wrapped item per row; validate/narrow before use (§10.3).
const missingRowSchema = z.object({
  item: z.object({ id: z.string().uuid() }).passthrough(),
});

/**
 * Recommendations "missing" for a (month, year): active templates whose window
 * overlaps the month with no transaction sharing their category that month (D3).
 * Derived server-side (§3.4); the wrapped items are cast to their generated type
 * after validation.
 */
export async function fetchMissingRecommendations(
  year: number,
  month: number,
): Promise<RecommendedItem[]> {
  const { data, error } = await supabase.rpc('missing_recommendations', {
    p_month: month,
    p_year: year,
  });
  if (error) throw AppError.fromUnknown(error);
  const parsed = z.array(missingRowSchema).safeParse(data);
  if (!parsed.success) throw new AppError('unexpected_error');
  return parsed.data.map((row) => row.item as unknown as RecommendedItem);
}
