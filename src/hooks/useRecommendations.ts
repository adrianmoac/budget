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
  listRecommendedItems,
  updateRecommendedItem,
  type RecommendedItemInput,
} from '@/api/recommendations';
import { qk } from '@/domain/queryKeys';

/** All recommendation templates (the /recommended CRUD list, §4.8). */
export function useRecommendedItems() {
  return useQuery({
    queryKey: qk.recommendedItems(),
    queryFn: listRecommendedItems,
  });
}

/** Recommendations "missing" this period — feeds the banner + dashboard (§4.2, §4.8). */
export function useMissingRecommendations(year: number, month: number) {
  return useQuery({
    queryKey: qk.recommendations(year, month),
    queryFn: () => fetchMissingRecommendations(year, month),
  });
}

/**
 * A template change alters both the CRUD list and every derived "missing" result,
 * so both refetch (spec §6.1 matrix: recommended-item CRUD → `['recommendations', *]`,
 * plus the app-specific templates list). Prefix invalidation covers all periods.
 */
function invalidateAfterRecommendedItemMutation(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: qk.recommendedItems() });
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
