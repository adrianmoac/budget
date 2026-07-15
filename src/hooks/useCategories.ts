import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  renameCategory,
} from '@/api/categories';
import { qk } from '@/domain/queryKeys';

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: fetchCategories,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCategory(name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; name: string }) => renameCategory(vars.id, vars.name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.categories() }),
  });
}

/**
 * `delete_category` reassigns dependents to Otros, so every cache that resolves a
 * category — the list, the (period-scoped) transaction tables, and the derived
 * recommendations — must refetch (spec §6.1 matrix). Prefix invalidation covers
 * all period keys. Totals are untouched (amounts unchanged), so not invalidated.
 */
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.categories() });
      void qc.invalidateQueries({ queryKey: ['transactions'] });
      void qc.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
