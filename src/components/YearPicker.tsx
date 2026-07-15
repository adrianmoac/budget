import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';

/** Year stepper bound to the UI store (spec §6.2). Drives the year view. */
export function YearPicker() {
  const year = useUiStore((s) => s.selectedYear);
  const setSelectedYear = useUiStore((s) => s.setSelectedYear);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setSelectedYear(year - 1)}
        aria-label="Año anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[4rem] text-center text-sm font-medium" aria-live="polite">
        {year}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setSelectedYear(year + 1)}
        aria-label="Año siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
