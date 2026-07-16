import { Check, Pencil, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { computeInterest } from '@/domain/investments';
import { formatMXN, fromCentavos, toCentavos } from '@/domain/money';
import type { Investment } from '@/domain/types';
import { useInvestments, useUpdateMarketValue } from '@/hooks/useInvestments';
import { useTotals } from '@/hooks/useTotals';
import { toast } from '@/store/toast';

function formatPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * FR-17/18: total invested per vehicle + grand total, market value, and
 * `totalInterestMoney` in amount and %. Interest % is hidden (not zero) when
 * nothing is invested, with an explanatory tooltip (AC-Interest-zero).
 */
export function InvestedSummaryCard() {
  const investmentsQuery = useInvestments();
  const totalsQuery = useTotals();

  if (investmentsQuery.isError || totalsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            message="No se pudieron cargar las inversiones"
            onRetry={() => {
              void investmentsQuery.refetch();
              void totalsQuery.refetch();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  const investments = investmentsQuery.data;
  const totals = totalsQuery.data;
  const loading = investmentsQuery.isPending || totalsQuery.isPending;

  const totalMarketValue =
    investments?.reduce((sum, inv) => sum + inv.market_value_cents, 0) ?? 0;
  const totalInvested = totals?.total_invested_cents ?? 0;
  const interest = computeInterest(totalMarketValue, totalInvested);

  return (
    <Card>
      {/* Market value is the headline figure; total invested is the smaller
          supporting line beneath it. */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>Valor de mercado</CardDescription>
          <CardTitle className="text-3xl">
            {loading ? <Skeleton className="h-9 w-40" /> : formatMXN(totalMarketValue)}
          </CardTitle>
        </div>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
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

            <ul className="divide-y border-t pt-2">
              {investments?.map((inv) => <VehicleRow key={inv.id} investment={inv} />)}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleRow({ investment }: { investment: Investment }) {
  const [editing, setEditing] = useState(false);
  const [pesos, setPesos] = useState(String(fromCentavos(investment.market_value_cents)));
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateMarketValue();
  const vehicleInterest = computeInterest(
    investment.market_value_cents,
    investment.contributed_total_cents,
  );

  function startEdit() {
    setPesos(String(fromCentavos(investment.market_value_cents)));
    setError(null);
    setEditing(true);
  }

  function save() {
    const value = Number(pesos);
    let cents: number;
    try {
      cents = toCentavos(value); // rejects NaN/Infinity/negative → market value ≥ 0
    } catch {
      setError('Valor inválido');
      return;
    }
    mutation.mutate(
      { id: investment.id, marketValueCents: cents },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Valor de mercado actualizado');
        },
        onError: (err) => setError(AppError.fromUnknown(err).userMessage),
      },
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{investment.name}</p>
        <p className="text-xs text-muted-foreground">
          Aportado {formatMXN(investment.contributed_total_cents)}
          {vehicleInterest.percent !== null ? (
            <span
              className={
                vehicleInterest.interestCents >= 0
                  ? 'ml-1 text-success'
                  : 'ml-1 text-destructive'
              }
            >
              ({formatPercent(vehicleInterest.percent)})
            </span>
          ) : null}
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={pesos}
            onChange={(e) => setPesos(e.target.value)}
            // Enter commits, Escape backs out. The input is not inside a form, so
            // Enter has no default submit behaviour to prevent.
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              else if (e.key === 'Escape') setEditing(false);
            }}
            className="h-8 w-28"
            aria-label={`Valor de mercado de ${investment.name}`}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={save}
            disabled={mutation.isPending}
            aria-label="Guardar"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setEditing(false)}
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="font-medium">{formatMXN(investment.market_value_cents)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={startEdit}
            aria-label={`Editar valor de mercado de ${investment.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {error ? <span className="sr-only">{error}</span> : null}
    </li>
  );
}
