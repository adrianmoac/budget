import { AppError } from './errors';
import { supabase } from './supabaseClient';
import { monthRange } from '@/domain/date';
import type { Recurrence, Transaction, TxType } from '@/domain/types';

/**
 * Editable fields for a (non-debt) transaction. Debt-category entries go through
 * the `record_debt_payment` RPC in Phase 4, never a plain insert (spec §3.1);
 * this layer therefore never sets `debt_id`.
 */
export interface TransactionInput {
  type: TxType;
  amount_cents: number;
  tx_date: string;
  description: string;
  category_id: string;
  recurrence: Recurrence;
}

/** List a month's transactions, newest first (uses the `(user_id, tx_date)` index). */
export async function listTransactionsByMonth(
  year: number,
  month: number,
): Promise<Transaction[]> {
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('tx_date', start)
    .lte('tx_date', end)
    .order('tx_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(input)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw AppError.fromUnknown(error);
}
