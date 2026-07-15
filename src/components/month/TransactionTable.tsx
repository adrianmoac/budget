import { Pencil, Trash2 } from 'lucide-react';
import { RecurrenceBadge } from '@/components/RecurrenceBadge';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDateMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import type { Transaction, TxType } from '@/domain/types';

interface TransactionTableProps {
  kind: TxType;
  transactions: Transaction[];
  categoryNameById: Map<string, string>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

/** Income or expense table for the month view (FR-11: separate tables). */
export function TransactionTable({
  kind,
  transactions,
  categoryNameById,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const title = kind === 'income' ? 'Ingresos' : 'Gastos';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <EmptyState title="Sin movimientos este mes" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Descripción
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Monto
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                      {formatDateMX(tx.tx_date)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>{tx.description || '—'}</span>
                        <RecurrenceBadge recurrence={tx.recurrence} />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {categoryNameById.get(tx.category_id) ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      {formatMXN(tx.amount_cents)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => onEdit(tx)}
                          aria-label={`Editar movimiento ${tx.description || ''}`.trim()}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDelete(tx)}
                          aria-label={`Eliminar movimiento ${tx.description || ''}`.trim()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
