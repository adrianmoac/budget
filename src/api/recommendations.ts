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

const statusRowSchema = missingRowSchema.extend({
  is_covered: z.boolean(),
  is_due: z.boolean(),
  is_expired: z.boolean(),
  covered_on: z.string().nullable(),
});

export interface RecommendationStatus {
  item: RecommendedItem;
  /**
   * A matching transaction covers it (expense → category, income → description).
   * Repeating items look only inside the month; a one-off looks back to its start
   * date, so a payment made months ago still counts (0028).
   */
  is_covered: boolean;
  /** In-window, not expired, the repeat rule fires this month, and not covered. */
  is_due: boolean;
  /** The window closed before today (or before the month, when looking back). */
  is_expired: boolean;
  /** ISO date of the earliest covering transaction; null when not covered. */
  covered_on: string | null;
}

/**
 * Per-item state for a month (§3.4). The three flags are deliberately independent:
 * an item can be neither due nor covered nor expired — a `yearly` item outside its
 * anniversary month is simply not due yet. Inferring "covered" from absence in
 * `fetchMissingRecommendations` would misread exactly that case, so the /recommended
 * split reads `is_covered`/`is_expired` directly.
 */
export async function fetchRecommendationStatus(
  year: number,
  month: number,
): Promise<RecommendationStatus[]> {
  const { data, error } = await supabase.rpc('recommendation_status', {
    p_month: month,
    p_year: year,
  });
  if (error) throw AppError.fromUnknown(error);
  const parsed = z.array(statusRowSchema).safeParse(data);
  if (!parsed.success) throw new AppError('unexpected_error');
  return parsed.data.map((row) => ({
    item: row.item as unknown as RecommendedItem,
    is_covered: row.is_covered,
    is_due: row.is_due,
    is_expired: row.is_expired,
    covered_on: row.covered_on,
  }));
}

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
