import { useQuery } from '@tanstack/react-query';
import { fetchYearSummary } from '@/api/yearSummary';
import { qk } from '@/domain/queryKeys';

/** Per-month aggregates for the year view (§4.4). Invalidated by any transaction/
 * debt-payment/contribution mutation in the year (spec §6.1 matrix). */
export function useYearSummary(year: number) {
  return useQuery({
    queryKey: qk.yearSummary(year),
    queryFn: () => fetchYearSummary(year),
  });
}
