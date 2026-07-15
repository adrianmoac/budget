import { QuickAddButton } from '@/components/QuickAddButton';
import { InvestedSummaryCard } from '@/components/dashboard/InvestedSummaryCard';
import { LiquidCashCard } from '@/components/dashboard/LiquidCashCard';

/**
 * Dashboard (§4.2). Phase 2 surface: liquid cash + investment summary read from
 * saved totals, plus quick-add. Pending debts (FR-19) and the recommendation
 * banner arrive in Phases 4 and 6.
 */
export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Resumen</h1>
        <QuickAddButton />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <LiquidCashCard />
        <InvestedSummaryCard />
      </div>
    </div>
  );
}
