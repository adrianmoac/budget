import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMXN } from '@/domain/money';
import { cn } from '@/lib/utils';

interface PeriodTotalsBarProps {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  investedCents: number;
  loading?: boolean;
}

/** FR-14/15: period totals — income, expense, balance, invested this month. */
export function PeriodTotalsBar({
  incomeCents,
  expenseCents,
  balanceCents,
  investedCents,
  loading = false,
}: PeriodTotalsBarProps) {
  const stats: { label: string; value: number; tone?: 'income' | 'expense' | 'balance' }[] =
    [
      { label: 'Ingresos', value: incomeCents, tone: 'income' },
      { label: 'Gastos', value: expenseCents, tone: 'expense' },
      { label: 'Balance', value: balanceCents, tone: 'balance' },
      { label: 'Invertido', value: investedCents },
    ];

  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="space-y-1">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p
                className={cn(
                  'text-lg font-semibold',
                  s.tone === 'income' && 'text-success',
                  s.tone === 'expense' && 'text-destructive',
                  s.tone === 'balance' &&
                    (s.value >= 0 ? 'text-foreground' : 'text-destructive'),
                )}
              >
                {formatMXN(s.value)}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
