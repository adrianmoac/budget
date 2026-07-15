import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvestment,
  deleteInvestment,
  fetchInvestments,
  renameInvestment,
  updateMarketValue,
} from '@/api/investments';
import { qk } from '@/domain/queryKeys';

export function useInvestments() {
  return useQuery({
    queryKey: qk.investments(),
    queryFn: fetchInvestments,
  });
}

export function useCreateInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createInvestment(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.investments() }),
  });
}

export function useRenameInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      renameInvestment(vars.id, vars.name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.investments() }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvestment(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.investments() }),
  });
}

/**
 * Edit a vehicle's market value. Invalidates `['investments']`; the dashboard
 * recomputes interest client-side from the fresh list (spec §6.1 note *).
 */
export function useUpdateMarketValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; marketValueCents: number }) =>
      updateMarketValue(vars.id, vars.marketValueCents),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.investments() });
    },
  });
}
