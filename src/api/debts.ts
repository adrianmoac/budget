import { z } from 'zod';
import { AppError } from './errors';
import { supabase } from './supabaseClient';
import type { Debt, DebtPayment, DebtStatus, Transaction } from '@/domain/types';

/**
 * Debt data layer (spec §3.1, §3.2). Debts are created/edited via plain table ops
 * (RLS + CHECKs are the backstop) and soft-deleted by archiving; there is no hard
 * delete (D5). Payments are recorded exclusively through the atomic
 * `record_debt_payment` RPC — never a direct transaction insert (§3.2).
 */

export interface DebtInput {
  name: string;
  total_months: number;
  remaining_months: number;
  minimum_payment_cents: number;
  due_day: number;
  start_date: string;
}

/** List debts, optionally filtered by status, newest first. */
export async function listDebts(status?: DebtStatus): Promise<Debt[]> {
  let query = supabase.from('debts').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Create an active debt with `remaining_months` seeded by the caller (= total). */
export async function createDebt(input: DebtInput): Promise<Debt> {
  const { data, error } = await supabase.from('debts').insert(input).select().single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Update editable debt fields (incl. the manual `remaining_months` override, D4). */
export async function updateDebt(id: string, patch: Partial<DebtInput>): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Soft-delete a debt by archiving it; payment history and liquidCash stay intact (D5). */
export async function archiveDebt(id: string): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw AppError.fromUnknown(error);
  return data;
}

/** Payments for a debt, newest first — feeds history and the duplicate-payment check. */
export async function listDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const { data, error } = await supabase
    .from('debt_payments')
    .select('*')
    .eq('debt_id', debtId)
    .order('payment_date', { ascending: false });
  if (error) throw AppError.fromUnknown(error);
  return data;
}

export interface RecordDebtPaymentInput {
  debt_id: string;
  amount_cents: number;
  date: string;
  description: string;
}

export interface RecordDebtPaymentResult {
  transaction: Transaction;
  debt: Debt;
  covered_minimum: boolean;
  months_decremented: 0 | 1;
}

// The RPC returns an untyped object (jsonb OUT params); validate/narrow it before
// use (§10.3). The row fields the UI reads are checked explicitly; the full rows
// come from `to_jsonb(row)` so are cast to their generated types after validation.
const recordDebtPaymentResultSchema = z.object({
  transaction: z.object({ id: z.string().uuid() }).passthrough(),
  debt: z
    .object({
      id: z.string().uuid(),
      remaining_months: z.number().int().nonnegative(),
      status: z.enum(['active', 'paid', 'archived']),
    })
    .passthrough(),
  covered_minimum: z.boolean(),
  months_decremented: z.union([z.literal(0), z.literal(1)]),
});

/**
 * Record a debt payment atomically (§3.2): one RPC = one transaction that inserts
 * the cash expense, links the payment, and conditionally decrements one month.
 * Rejects unknown/inactive debts and non-positive amounts.
 */
export async function recordDebtPayment(
  input: RecordDebtPaymentInput,
): Promise<RecordDebtPaymentResult> {
  const { data, error } = await supabase.rpc('record_debt_payment', {
    p_debt_id: input.debt_id,
    p_amount_cents: input.amount_cents,
    p_date: input.date,
    p_description: input.description,
  });
  if (error) throw AppError.fromUnknown(error);
  const parsed = recordDebtPaymentResultSchema.safeParse(data);
  if (!parsed.success) throw new AppError('unexpected_error');
  return {
    transaction: parsed.data.transaction as unknown as Transaction,
    debt: parsed.data.debt as unknown as Debt,
    covered_minimum: parsed.data.covered_minimum,
    months_decremented: parsed.data.months_decremented,
  };
}
