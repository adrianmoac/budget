import { QueryClient } from '@tanstack/react-query';
import { AppError } from '@/api/errors';

/**
 * Shared QueryClient. Default `staleTime` 30s; refetch-on-focus enabled (§6.4).
 * `['totals']` overrides staleTime to 0 at the hook level so the authoritative
 * balance is always fresh after a mutation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Do not retry auth failures; retry transient/network errors up to twice.
        if (error instanceof AppError && error.code === 'not_authenticated') return false;
        return failureCount < 2;
      },
    },
  },
});
