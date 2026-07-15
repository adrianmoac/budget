import { CreditCard } from 'lucide-react';
import { ErrorState } from '@/components/states';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonthYearMX } from '@/domain/date';
import { clampDueDay } from '@/domain/debts';
import { formatMXN } from '@/domain/money';
import { useDebts } from '@/hooks/useDebts';

/**
 * FR-19: debts pending for the month. Active debts (still owing months) with their
 * minimum payment and due day, clamped to the current month's length (D7). Read
 * from the debts list; the dashboard totals are untouched.
 */
export function PendingDebtsList() {
  const { data, isPending, isError, refetch } = useDebts('active');
  const { year, month } = currentMonthYearMX();

  const pending = (data ?? []).filter((d) => d.remaining_months > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>Deudas pendientes del mes</CardDescription>
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            message="No se pudieron cargar las deudas"
            onRetry={() => void refetch()}
          />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin deudas pendientes</p>
        ) : (
          <ul className="divide-y">
            {pending.map((debt) => (
              <li key={debt.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{debt.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence el día {clampDueDay(year, month, debt.due_day)} ·{' '}
                    {debt.remaining_months} meses restantes
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatMXN(debt.minimum_payment_cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
