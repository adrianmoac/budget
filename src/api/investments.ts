import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { Investment } from '@/domain/types';

/** List investment vehicles (name, contributed total, market value). */
export async function fetchInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/**
 * Update a vehicle's manually-editable market value. `contributed_total_cents`
 * is trigger-maintained and MUST NOT be written by the client (spec §3.1).
 */
export async function updateMarketValue(
  id: string,
  marketValueCents: number,
): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update({ market_value_cents: marketValueCents })
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}
