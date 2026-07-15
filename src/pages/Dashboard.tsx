import { QuickAddButton } from '@/components/QuickAddButton';
import { InvestedSummaryCard } from '@/components/dashboard/InvestedSummaryCard';
import { LiquidCashCard } from '@/components/dashboard/LiquidCashCard';
import { PendingDebtsList } from '@/components/dashboard/PendingDebtsList';

/**
 * Dashboard (§4.2). Liquid cash + investment summary read from saved totals, plus
 * pending debts for the month (FR-19) and quick-add. The recommendation banner
 * arrives in Phase 6.
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
      <PendingDebtsList />
    </div>
  );
}
