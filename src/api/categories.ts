import { z } from 'zod';
import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { Category } from '@/domain/types';

/**
 * List categories (for the EntryForm dropdown, month-view labels, and the
 * Categories page). Rename is a plain update; delete is routed through the
 * `delete_category` RPC (spec §3.1, §3.3).
 */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Create a normal category. Name collisions surface as `name_conflict` (§3.1). */
export async function createCategory(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Rename a category. `UNIQUE(user_id, name)` rejects collisions (`name_conflict`). */
export async function renameCategory(id: string, name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export interface DeleteCategoryResult {
  deleted_id: string;
  reassigned_transactions: number;
  reassigned_recommendations: number;
}

// The RPC returns an untyped record (OUT params); validate/narrow it before use
// (spec §10.3). Shape mismatch is a contract break → surfaces as unexpected_error.
const deleteCategoryResultSchema = z.object({
  deleted_id: z.string().uuid(),
  reassigned_transactions: z.number().int().nonnegative(),
  reassigned_recommendations: z.number().int().nonnegative(),
});

/**
 * Delete a category via the atomic RPC: dependents are reassigned to Otros and
 * the category removed in one transaction. Rejects Otros/debt
 * (`cannot_delete_protected_category`) and unknown ids (`category_not_found`).
 */
export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  const { data, error } = await supabase.rpc('delete_category', { p_category_id: id });
  if (error) throw AppError.fromUnknown(error);
  const parsed = deleteCategoryResultSchema.safeParse(data);
  if (!parsed.success) throw new AppError('unexpected_error');
  return parsed.data;
}
