import { useMemo, useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EntryForm } from '@/components/EntryForm';
import { MonthPicker } from '@/components/MonthPicker';
import { QuickAddButton } from '@/components/QuickAddButton';
import { PeriodTotalsBar } from '@/components/month/PeriodTotalsBar';
import { RecurrenceFilter } from '@/components/month/RecurrenceFilter';
import { TransactionTable } from '@/components/month/TransactionTable';
import { ErrorState } from '@/components/states';
import type { Transaction } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useInvestedThisMonth } from '@/hooks/useInvestedThisMonth';
import { useDeleteTransaction, useMonthTransactions } from '@/hooks/useTransactions';
import { toast } from '@/store/toast';
import { useUiStore } from '@/store/ui';

/** Monthly expenses & incomes in separate tables + period totals (§4.3). */
export function MonthView() {
  const year = useUiStore((s) => s.selectedYear);
  const month = useUiStore((s) => s.selectedMonth);
  const recurrenceFilter = useUiStore((s) => s.recurrenceFilter);

  const txQuery = useMonthTransactions(year, month);
  const categoriesQuery = useCategories();
  const investedQuery = useInvestedThisMonth(year, month);
  const deleteMutation = useDeleteTransaction();

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.name);
    return map;
  }, [categoriesQuery.data]);

  const { income, expense, incomeCents, expenseCents } = useMemo(() => {
    const rows = (txQuery.data ?? []).filter(
      (t) => recurrenceFilter === 'all' || t.recurrence === recurrenceFilter,
    );
    const inc = rows.filter((t) => t.type === 'income');
    const exp = rows.filter((t) => t.type === 'expense');
    return {
      income: inc,
      expense: exp,
      incomeCents: inc.reduce((s, t) => s + t.amount_cents, 0),
      expenseCents: exp.reduce((s, t) => s + t.amount_cents, 0),
    };
  }, [txQuery.data, recurrenceFilter]);

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success('Movimiento eliminado');
      },
      onError: (err) => {
        toast.error(AppError.fromUnknown(err).userMessage);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mes</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker />
          <QuickAddButton />
        </div>
      </div>

      {txQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar los movimientos"
          onRetry={() => void txQuery.refetch()}
        />
      ) : (
        <>
          <PeriodTotalsBar
            incomeCents={incomeCents}
            expenseCents={expenseCents}
            balanceCents={incomeCents - expenseCents}
            investedCents={investedQuery.data ?? 0}
            loading={txQuery.isPending || investedQuery.isPending}
          />

          <div className="flex justify-end">
            <RecurrenceFilter />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TransactionTable
              kind="income"
              transactions={income}
              categoryNameById={categoryNameById}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
            <TransactionTable
              kind="expense"
              transactions={expense}
              categoryNameById={categoryNameById}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          </div>
        </>
      )}

      {/* Edit modal — mounted only when a transaction is selected. */}
      {editing ? (
        <EntryForm
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          transaction={editing}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar movimiento?"
        description="Esta acción no se puede deshacer. El saldo se ajustará automáticamente."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
