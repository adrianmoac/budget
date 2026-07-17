import { useMemo, useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EntryForm } from '@/components/EntryForm';
import { MonthPicker } from '@/components/MonthPicker';
import { QuickAddButton } from '@/components/QuickAddButton';
import { CategoryFilter } from '@/components/month/CategoryFilter';
import { PeriodTotalsBar } from '@/components/month/PeriodTotalsBar';
import { RecurrenceFilter } from '@/components/month/RecurrenceFilter';
import { TransactionTable } from '@/components/month/TransactionTable';
import { ErrorState } from '@/components/states';
import type { Transaction } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useDebts } from '@/hooks/useDebts';
import { useInvestedThisMonth } from '@/hooks/useInvestedThisMonth';
import { useDeleteTransaction, useMonthTransactions } from '@/hooks/useTransactions';
import { toast } from '@/store/toast';
import { ALL_CATEGORIES, useUiStore } from '@/store/ui';

/** Monthly expenses & incomes in separate tables + period totals (§4.3). */
export function MonthView() {
  const year = useUiStore((s) => s.selectedYear);
  const month = useUiStore((s) => s.selectedMonth);
  const recurrenceFilter = useUiStore((s) => s.recurrenceFilter);
  const categoryFilter = useUiStore((s) => s.categoryFilter);

  const txQuery = useMonthTransactions(year, month);
  const categoriesQuery = useCategories();
  const debtsQuery = useDebts();
  const investedQuery = useInvestedThisMonth(year, month);
  const deleteMutation = useDeleteTransaction();

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.name);
    return map;
  }, [categoriesQuery.data]);

  const debtNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of debtsQuery.data ?? []) map.set(d.id, d.name);
    return map;
  }, [debtsQuery.data]);

  // A category filter is expenses-only: income has no category (D11), so while one
  // is active the income table is hidden rather than shown unfiltered beside a
  // filtered expense list (which would make "balance" meaningless).
  const byCategory = categoryFilter !== ALL_CATEGORIES;

  const { income, expense, incomeCents, expenseCents } = useMemo(() => {
    const rows = (txQuery.data ?? []).filter(
      (t) => recurrenceFilter === 'all' || t.recurrence === recurrenceFilter,
    );
    const inc = byCategory ? [] : rows.filter((t) => t.type === 'income');
    const exp = rows.filter(
      (t) => t.type === 'expense' && (!byCategory || t.category_id === categoryFilter),
    );
    return {
      income: inc,
      expense: exp,
      incomeCents: inc.reduce((s, t) => s + t.amount_cents, 0),
      expenseCents: exp.reduce((s, t) => s + t.amount_cents, 0),
    };
  }, [txQuery.data, recurrenceFilter, categoryFilter, byCategory]);

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
            expensesOnly={byCategory}
          />

          <div className="flex flex-wrap items-center justify-end gap-3">
            <CategoryFilter />
            <RecurrenceFilter />
          </div>

          {byCategory ? (
            <p className="text-sm text-muted-foreground" role="status">
              Mostrando sólo gastos de{' '}
              <span className="font-medium">
                {categoryNameById.get(categoryFilter) ?? 'la categoría'}
              </span>
              . Los ingresos no tienen categoría, así que quedan fuera de este filtro.
            </p>
          ) : null}

          <div className={byCategory ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-2'}>
            {byCategory ? null : (
              <TransactionTable
                kind="income"
                transactions={income}
                categoryNameById={categoryNameById}
                debtNameById={debtNameById}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            )}
            <TransactionTable
              kind="expense"
              transactions={expense}
              categoryNameById={categoryNameById}
              debtNameById={debtNameById}
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
