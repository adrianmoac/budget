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

/** Create an investment vehicle. Name collisions surface as `name_conflict` (§3.1). */
export async function createInvestment(name: string): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .insert({ name })
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Rename a vehicle. `UNIQUE(user_id, name)` rejects collisions (`name_conflict`). */
export async function renameInvestment(id: string, name: string): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update({ name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/**
 * Delete a vehicle. The `investment_contributions` FK is ON DELETE RESTRICT, so a
 * vehicle with contributions cannot be removed — that surfaces as
 * `fk_restrict_use_rpc` (§3.1). The UI disables delete when contributed_total > 0.
 */
export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from('investments').delete().eq('id', id);
  if (error) throw AppError.fromUnknown(error);
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
