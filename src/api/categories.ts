import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { Category } from '@/domain/types';

/**
 * List categories (for the EntryForm dropdown and month-view labels). Category
 * CRUD and `delete_category` arrive in Phase 3; Phase 2 only reads.
 */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw AppError.fromUnknown(error);
  return data;
}
