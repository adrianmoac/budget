import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  archiveDebt,
  createDebt,
  listDebtPayments,
  listDebts,
  recordDebtPayment,
  updateDebt,
  type DebtInput,
  type RecordDebtPaymentInput,
} from '@/api/debts';
import { qk } from '@/domain/queryKeys';
import type { DebtStatus } from '@/domain/types';

export function useDebts(status?: DebtStatus) {
  return useQuery({
    queryKey: qk.debts(status),
    queryFn: () => listDebts(status),
  });
}

/** A debt's payments; used for history and the duplicate-payment warning (D6). */
export function useDebtPayments(debtId: string | undefined) {
  return useQuery({
    queryKey: qk.debtPayments(debtId ?? ''),
    queryFn: () => listDebtPayments(debtId as string),
    enabled: !!debtId,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DebtInput) => createDebt(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<DebtInput> }) =>
      updateDebt(vars.id, vars.patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

export function useArchiveDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveDebt(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['debts'] }),
  });
}

/**
 * A debt payment inserts a cash expense and mutates the debt, so every affected
 * cache must refetch (spec §6.1 matrix): totals, the period-scoped transaction and
 * recommendation families, the year summary, all debt lists, and this debt's
 * payments. Prefix invalidation covers the period/status-scoped keys.
 */
function invalidateAfterDebtPayment(qc: QueryClient, debtId: string): void {
  void qc.invalidateQueries({ queryKey: qk.totals() });
  void qc.invalidateQueries({ queryKey: ['transactions'] });
  void qc.invalidateQueries({ queryKey: ['yearSummary'] });
  void qc.invalidateQueries({ queryKey: ['recommendations'] });
  void qc.invalidateQueries({ queryKey: ['debts'] });
  void qc.invalidateQueries({ queryKey: qk.debtPayments(debtId) });
}

export function useRecordDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordDebtPaymentInput) => recordDebtPayment(input),
    onSuccess: (_result, input) => invalidateAfterDebtPayment(qc, input.debt_id),
  });
}
