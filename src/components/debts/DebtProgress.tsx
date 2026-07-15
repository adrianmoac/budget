import type { Debt } from '@/domain/types';

interface DebtProgressProps {
  debt: Debt;
}

/**
 * Compact months-paid progress (§4.6). Paid months = total − remaining; a slim
 * bar plus an `X / Y meses` label. Purely presentational.
 */
export function DebtProgress({ debt }: DebtProgressProps) {
  const paid = debt.total_months - debt.remaining_months;
  const pct = debt.total_months > 0 ? (paid / debt.total_months) * 100 : 0;

  return (
    <div className="min-w-32 space-y-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={paid}
        aria-valuemin={0}
        aria-valuemax={debt.total_months}
        aria-label="Meses pagados"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {paid} / {debt.total_months} meses
      </p>
    </div>
  );
}
