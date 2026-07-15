import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  listTransactionsByMonth,
  updateTransaction,
  type TransactionInput,
} from '@/api/transactions';
import { qk } from '@/domain/queryKeys';

export function useMonthTransactions(year: number, month: number) {
  return useQuery({
    queryKey: qk.transactions(year, month),
    queryFn: () => listTransactionsByMonth(year, month),
  });
}

/**
 * Invalidate every cache a transaction write can affect (spec §6.1 matrix).
 * Uses key-prefix invalidation for the period-scoped families so a moved date or
 * year is covered too — invalidate-and-refetch, never optimistic totals (§6.1).
 */
function invalidateAfterTransactionMutation(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: qk.totals() });
  void qc.invalidateQueries({ queryKey: ['transactions'] });
  void qc.invalidateQueries({ queryKey: ['yearSummary'] });
  void qc.invalidateQueries({ queryKey: ['recommendations'] });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(input),
    onSuccess: () => invalidateAfterTransactionMutation(qc),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: TransactionInput }) =>
      updateTransaction(vars.id, vars.input),
    onSuccess: () => invalidateAfterTransactionMutation(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateAfterTransactionMutation(qc),
  });
}
