import type { YearMonthSummary } from '@/api/yearSummary';
import { Card, CardContent } from '@/components/ui/card';
import { monthLabelES } from '@/domain/date';
import { formatMXN } from '@/domain/money';

interface YearSummaryTableProps {
  rows: YearMonthSummary[];
}

function balanceClass(cents: number): string {
  return cents >= 0 ? 'text-success' : 'text-destructive';
}

/** 12-month income/expense/balance/invested table with a totals footer (§4.4). */
export function YearSummaryTable({ rows }: YearSummaryTableProps) {
  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income_cents,
      expense: acc.expense + r.expense_cents,
      balance: acc.balance + r.balance_cents,
      invested: acc.invested + r.invested_cents,
    }),
    { income: 0, expense: 0, balance: 0, invested: 0 },
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Resumen por mes del año</caption>
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Mes
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Ingresos
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Gastos
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Balance
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Invertido
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-2 text-left font-medium">
                    {monthLabelES(r.month)}
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMXN(r.income_cents)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMXN(r.expense_cents)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${balanceClass(r.balance_cents)}`}
                  >
                    {formatMXN(r.balance_cents)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMXN(r.invested_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <th scope="row" className="px-4 py-2 text-left">
                  Total
                </th>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMXN(totals.income)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMXN(totals.expense)}
                </td>
                <td
                  className={`px-4 py-2 text-right tabular-nums ${balanceClass(totals.balance)}`}
                >
                  {formatMXN(totals.balance)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatMXN(totals.invested)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
