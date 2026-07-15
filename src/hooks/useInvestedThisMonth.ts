import { useQuery } from '@tanstack/react-query';
import { fetchInvestedCentsInMonth } from '@/api/contributions';
import { qk } from '@/domain/queryKeys';

/** Total invested in the given month, for the period totals bar. */
export function useInvestedThisMonth(year: number, month: number) {
  return useQuery({
    queryKey: qk.investedThisMonth(year, month),
    queryFn: () => fetchInvestedCentsInMonth(year, month),
  });
}
