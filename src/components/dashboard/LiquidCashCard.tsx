import { Wallet } from 'lucide-react';
import { ErrorState } from '@/components/states';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMXN } from '@/domain/money';
import { useTotals } from '@/hooks/useTotals';

/** FR-16: liquid cash on hand, read from the saved denormalized total. */
export function LiquidCashCard() {
  const { data, isPending, isError, refetch } = useTotals();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription>Efectivo disponible</CardDescription>
          <CardTitle className="text-3xl" data-testid="liquid-cash">
            {isPending ? (
              <Skeleton className="h-9 w-40" />
            ) : isError ? (
              '—'
            ) : (
              formatMXN(data.liquid_cash_cents)
            )}
          </CardTitle>
        </div>
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState message="No se pudo cargar el saldo" onRetry={() => void refetch()} />
        ) : (
          <p className="text-xs text-muted-foreground">Ingresos − gastos (histórico)</p>
        )}
      </CardContent>
    </Card>
  );
}
