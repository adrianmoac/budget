import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInvestments, updateMarketValue } from '@/api/investments';
import { qk } from '@/domain/queryKeys';

export function useInvestments() {
  return useQuery({
    queryKey: qk.investments(),
    queryFn: fetchInvestments,
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
