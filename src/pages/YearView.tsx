import { YearPicker } from '@/components/YearPicker';
import { ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { YearSummaryTable } from '@/components/year/YearSummaryTable';
import { useYearSummary } from '@/hooks/useYearSummary';
import { useUiStore } from '@/store/ui';

/** 12-month overview: per-month income/expense/balance/invested (§4.4, FR-13). */
export function YearView() {
  const year = useUiStore((s) => s.selectedYear);
  const summaryQuery = useYearSummary(year);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Año</h1>
        <YearPicker />
      </div>

      {summaryQuery.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : summaryQuery.isError ? (
        <ErrorState
          message="No se pudo cargar el resumen del año"
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <YearSummaryTable rows={summaryQuery.data} />
      )}
    </div>
  );
}
