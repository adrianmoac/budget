import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  createRecommendedItem,
  deleteRecommendedItem,
  fetchMissingRecommendations,
  fetchRecommendationStatus,
  updateRecommendedItem,
  type RecommendedItemInput,
} from '@/api/recommendations';
import { qk } from '@/domain/queryKeys';

/** Recommendations "missing" this period — feeds the banner + dashboard (§4.2, §4.8). */
export function useMissingRecommendations(year: number, month: number) {
  return useQuery({
    queryKey: qk.recommendations(year, month),
    queryFn: () => fetchMissingRecommendations(year, month),
  });
}

/**
 * Per-item due/covered/expired flags for a period — feeds the /recommended split
 * into pending vs. already-registered/expired (§4.8). Keyed under the
 * 'recommendations' prefix, so both template CRUD and transaction mutations already
 * refetch it (coverage depends on transactions).
 */
export function useRecommendationStatus(year: number, month: number) {
  return useQuery({
    queryKey: qk.recommendationStatus(year, month),
    queryFn: () => fetchRecommendationStatus(year, month),
  });
}

/**
 * A template change alters every derived result for it — the "missing" list and the
 * per-item status flags — so the whole `['recommendations', *]` prefix refetches
 * (spec §6.1 matrix). Prefix invalidation covers all periods. The templates are no
 * longer fetched as a separate list: `recommendation_status` already returns every
 * one, so a second query could only drift from it.
 */
function invalidateAfterRecommendedItemMutation(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ['recommendations'] });
}

export function useCreateRecommendedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecommendedItemInput) => createRecommendedItem(input),
    onSuccess: () => invalidateAfterRecommendedItemMutation(qc),
  });
}

export function useUpdateRecommendedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: RecommendedItemInput }) =>
      updateRecommendedItem(vars.id, vars.input),
    onSuccess: () => invalidateAfterRecommendedItemMutation(qc),
  });
}

export function useDeleteRecommendedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecommendedItem(id),
    onSuccess: () => invalidateAfterRecommendedItemMutation(qc),
  });
}
