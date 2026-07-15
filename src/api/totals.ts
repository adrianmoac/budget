import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { Totals } from '@/domain/types';

/**
 * Read the single denormalized totals row (O(1) dashboard read). The client only
 * ever *reads* totals; triggers are the sole writer (architecture §7.1).
 */
export async function fetchTotals(): Promise<Totals> {
  const { data, error } = await supabase.from('totals').select('*').single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}
