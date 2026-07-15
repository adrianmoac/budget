import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { monthLabelES } from '@/domain/date';
import { useUiStore } from '@/store/ui';

/** Month/year stepper bound to the UI store (spec §6.2). */
export function MonthPicker() {
  const year = useUiStore((s) => s.selectedYear);
  const month = useUiStore((s) => s.selectedMonth);
  const setPeriod = useUiStore((s) => s.setPeriod);

  function shift(delta: number) {
    // month is 1..12; convert to 0-based index arithmetic then back.
    const index = (year * 12 + (month - 1) + delta);
    const nextYear = Math.floor(index / 12);
    const nextMonth = (index % 12) + 1;
    setPeriod(nextYear, nextMonth);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => shift(-1)}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[9rem] text-center text-sm font-medium" aria-live="polite">
        {monthLabelES(month)} {year}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => shift(1)}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
