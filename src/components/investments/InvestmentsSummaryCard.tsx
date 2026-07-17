import { TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { computeInterest } from '@/domain/investments';
import { formatMXN } from '@/domain/money';
import type { Investment } from '@/domain/types';

interface InvestmentsSummaryCardProps {
  investments: Investment[];
  loading: boolean;
}

function formatPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Headline totals above the vehicle table (§4.7): market value as the primary
 * figure, total invested and `totalInterestMoney` as supporting lines.
 *
 * Deliberately read-only and vehicle-list-free — the table directly below already
 * renders every vehicle with an editable market value.
 *
 * Both grand totals are summed from the vehicle rows: market value has no saved
 * total, and total invested is summed too so the headline always agrees with the
 * "Aportado" column in the table below. That departs from §7.7 (which sourced it
 * from the trigger-maintained `totals` row) — a read-side choice only; the client
 * still never writes either column. Mirrors InvestedSummaryCard on the dashboard.
 */
export function InvestmentsSummaryCard({
  investments,
  loading,
}: InvestmentsSummaryCardProps) {
  const totalMarketValue = investments.reduce(
    (sum, inv) => sum + inv.market_value_cents,
    0,
  );
  const totalInvested = investments.reduce(
    (sum, inv) => sum + inv.contributed_total_cents,
    0,
  );
  const interest = computeInterest(totalMarketValue, totalInvested);
  const pending = loading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>Valor de mercado</CardDescription>
          <CardTitle className="text-3xl">
            {pending ? <Skeleton className="h-9 w-40" /> : formatMXN(totalMarketValue)}
          </CardTitle>
        </div>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {pending ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total invertido</span>
              <span className="font-medium">{formatMXN(totalInvested)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rendimiento</span>
              <span
                className={
                  interest.interestCents >= 0 ? 'text-success' : 'text-destructive'
                }
              >
                {formatMXN(interest.interestCents)}
                {interest.percent === null ? (
                  <span
                    className="ml-1 cursor-help text-muted-foreground"
                    title="Sin inversiones aún"
                  >
                    (—)
                  </span>
                ) : (
                  <span className="ml-1">({formatPercent(interest.percent)})</span>
                )}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
