import { useQuery } from '@tanstack/react-query';
import { fetchTotals } from '@/api/totals';
import { qk } from '@/domain/queryKeys';

/**
 * Authoritative dashboard totals. `staleTime: 0` so the balance always refetches
 * after a mutation invalidates it (spec §6.4).
 */
export function useTotals() {
  return useQuery({
    queryKey: qk.totals(),
    queryFn: fetchTotals,
    staleTime: 0,
  });
}
