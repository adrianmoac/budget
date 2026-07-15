import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '@/api/categories';
import { qk } from '@/domain/queryKeys';

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: fetchCategories,
  });
}
