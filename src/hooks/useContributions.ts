import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  createContribution,
  deleteContribution,
  listContributions,
  type ContributionInput,
} from '@/api/contributions';
import { qk } from '@/domain/queryKeys';

/** A vehicle's contributions; feeds ContributionHistory (§4.7). */
export function useContributions(investmentId: string | undefined) {
  return useQuery({
    queryKey: qk.contributions(investmentId ?? ''),
    queryFn: () => listContributions(investmentId as string),
    enabled: !!investmentId,
  });
}

/**
 * A contribution changes the grand invested total (`['totals']`), the per-vehicle
 * contributed total (`['investments']`), and this vehicle's contribution list, so
 * every dependent cache refetches (spec §6.1 matrix). It also moves the month's
 * "invested this period" figure (the Phase 2 `investedThisMonth` read), which the
 * matrix predates — invalidated by prefix so the month view stays correct. Liquid
 * cash is never touched (D2); `['totals']` refetches only `total_invested_cents`.
 */
function invalidateAfterContribution(qc: QueryClient, investmentId: string): void {
  void qc.invalidateQueries({ queryKey: qk.totals() });
  void qc.invalidateQueries({ queryKey: qk.investments() });
  void qc.invalidateQueries({ queryKey: qk.contributions(investmentId) });
  void qc.invalidateQueries({ queryKey: ['investedThisMonth'] });
}

export function useCreateContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContributionInput) => createContribution(input),
    onSuccess: (_result, input) => invalidateAfterContribution(qc, input.investment_id),
  });
}

export function useDeleteContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; investmentId: string }) =>
      deleteContribution(vars.id),
    onSuccess: (_result, vars) => invalidateAfterContribution(qc, vars.investmentId),
  });
}
