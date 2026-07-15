import { Archive, CreditCard, Pencil } from 'lucide-react';
import { DebtProgress } from '@/components/debts/DebtProgress';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMXN } from '@/domain/money';
import type { Debt, DebtStatus } from '@/domain/types';

interface DebtListProps {
  debts: Debt[];
  onEdit: (debt: Debt) => void;
  onRecordPayment: (debt: Debt) => void;
  onArchive: (debt: Debt) => void;
}

const STATUS_LABEL: Record<DebtStatus, string> = {
  active: 'Activa',
  paid: 'Pagada',
  archived: 'Archivada',
};

/** Debt table with per-row progress and actions (§4.6). */
export function DebtList({ debts, onEdit, onRecordPayment, onArchive }: DebtListProps) {
  if (debts.length === 0) {
    return <EmptyState title="Sin deudas" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Progreso
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Vence
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Pago mínimo
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => (
                <tr key={debt.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{debt.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {STATUS_LABEL[debt.status]}
                  </td>
                  <td className="px-4 py-2">
                    <DebtProgress debt={debt} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    Día {debt.due_day}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMXN(debt.minimum_payment_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={debt.status !== 'active'}
                        onClick={() => onRecordPayment(debt)}
                        aria-label={`Registrar pago de ${debt.name}`}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={debt.status === 'archived'}
                        onClick={() => onEdit(debt)}
                        aria-label={`Editar ${debt.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        disabled={debt.status === 'archived'}
                        onClick={() => onArchive(debt)}
                        aria-label={`Archivar ${debt.name}`}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
