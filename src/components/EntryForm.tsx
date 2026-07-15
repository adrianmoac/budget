import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AppError } from '@/api/errors';
import type { TransactionInput } from '@/api/transactions';
import { DebtSelect } from '@/components/DebtSelect';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { todayISOMX } from '@/domain/date';
import { hasCoveringPaymentInMonth } from '@/domain/debts';
import { toCentavos } from '@/domain/money';
import { entryFormSchema, type EntryFormInput } from '@/domain/schemas';
import type { Transaction } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useDebtPayments, useDebts, useRecordDebtPayment } from '@/hooks/useDebts';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { toast } from '@/store/toast';

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form edits this transaction; otherwise it creates one. */
  transaction?: Transaction;
}

function toDefaults(transaction?: Transaction): EntryFormInput {
  if (transaction) {
    return {
      type: transaction.type,
      amountPesos: transaction.amount_cents / 100,
      tx_date: transaction.tx_date,
      description: transaction.description,
      category_id: transaction.category_id,
      recurrence: transaction.recurrence,
    };
  }
  return {
    type: 'expense',
    amountPesos: Number.NaN,
    tx_date: todayISOMX(),
    description: '',
    category_id: '',
    recurrence: 'variable',
  };
}

/**
 * Shared create/edit transaction modal (§4.9). When the selected category is the
 * debt kind (create only), the form swaps in a DebtSelect, prefills the amount with
 * the debt's minimum payment (FR-6), warns on a duplicate covering payment this
 * month (D6), and submits through the `record_debt_payment` RPC instead of a plain
 * insert (§3.2). Debt-payment transactions have no plain-edit path, so the debt
 * kind is excluded from the dropdown while editing.
 */
export function EntryForm({ open, onOpenChange, transaction }: EntryFormProps) {
  const isEdit = !!transaction;
  const categoriesQuery = useCategories();
  const debtsQuery = useDebts('active');
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const recordPaymentMutation = useRecordDebtPayment();

  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [debtError, setDebtError] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormInput>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: toDefaults(transaction),
  });

  // Reset field values whenever the modal opens (create vs. a specific edit).
  useEffect(() => {
    if (open) {
      reset(toDefaults(transaction));
      setSelectedDebtId('');
      setDebtError(false);
    }
  }, [open, transaction, reset]);

  const categories = categoriesQuery.data ?? [];
  const activeDebts = debtsQuery.data ?? [];

  // The debt kind is selectable only when creating (§4.9).
  const selectableCategories = categories.filter((c) => !isEdit || c.kind !== 'debt');

  const categoryId = watch('category_id');
  const txDate = watch('tx_date');
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const debtMode = !isEdit && selectedCategory?.kind === 'debt';

  const paymentsQuery = useDebtPayments(
    debtMode && selectedDebtId ? selectedDebtId : undefined,
  );
  const duplicateWarning =
    debtMode && hasCoveringPaymentInMonth(paymentsQuery.data ?? [], txDate ?? '');

  function handleDebtChange(debtId: string) {
    setSelectedDebtId(debtId);
    setDebtError(false);
    const debt = activeDebts.find((d) => d.id === debtId);
    if (debt) setValue('amountPesos', debt.minimum_payment_cents / 100);
  }

  async function onSubmit(values: EntryFormInput) {
    let amountCents: number;
    try {
      amountCents = toCentavos(values.amountPesos);
    } catch {
      setError('amountPesos', { message: 'Monto inválido' });
      return;
    }

    // Debt branch: route to the atomic RPC (§3.2) rather than a plain insert.
    if (debtMode) {
      if (!selectedDebtId) {
        setDebtError(true);
        return;
      }
      try {
        await recordPaymentMutation.mutateAsync({
          debt_id: selectedDebtId,
          amount_cents: amountCents,
          date: values.tx_date,
          description: values.description,
        });
        toast.success('Pago de deuda registrado');
        onOpenChange(false);
      } catch (err) {
        setError('root', { message: AppError.fromUnknown(err).userMessage });
      }
      return;
    }

    const input: TransactionInput = {
      type: values.type,
      amount_cents: amountCents,
      tx_date: values.tx_date,
      description: values.description,
      category_id: values.category_id,
      recurrence: values.recurrence,
    };

    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, input });
        toast.success('Movimiento actualizado');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Movimiento agregado');
      }
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: AppError.fromUnknown(err).userMessage });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          <DialogDescription>
            Registra un gasto o ingreso. Los montos se guardan en centavos.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
          {/* Type is fixed to expense for debt payments (set by the RPC). */}
          {debtMode ? (
            <div className="space-y-2">
              <Label htmlFor="amountPesos">Monto</Label>
              <MoneyInput
                id="amountPesos"
                aria-invalid={!!errors.amountPesos}
                {...register('amountPesos', { valueAsNumber: true })}
              />
              {errors.amountPesos ? (
                <p className="text-sm text-destructive">{errors.amountPesos.message}</p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Gasto</SelectItem>
                        <SelectItem value="income">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amountPesos">Monto</Label>
                <MoneyInput
                  id="amountPesos"
                  aria-invalid={!!errors.amountPesos}
                  {...register('amountPesos', { valueAsNumber: true })}
                />
                {errors.amountPesos ? (
                  <p className="text-sm text-destructive">{errors.amountPesos.message}</p>
                ) : null}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  // Omit `value` entirely (not undefined) when unselected so the
                  // placeholder shows — exactOptionalPropertyTypes forbids value={undefined}.
                  {...(field.value ? { value: field.value } : {})}
                  onValueChange={field.onChange}
                  disabled={categoriesQuery.isPending}
                >
                  <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id ? (
              <p className="text-sm text-destructive">{errors.category_id.message}</p>
            ) : null}
          </div>

          {/* Debt branch: pick which debt this payment applies to (FR-6, §4.9). */}
          {debtMode ? (
            <div className="space-y-2">
              <Label htmlFor="debt_id">Deuda</Label>
              <DebtSelect
                id="debt_id"
                debts={activeDebts}
                {...(selectedDebtId ? { value: selectedDebtId } : {})}
                onValueChange={handleDebtChange}
                invalid={debtError}
              />
              {debtError ? (
                <p className="text-sm text-destructive">Selecciona una deuda</p>
              ) : null}
              {duplicateWarning ? (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Ya existe un pago que cubre el mínimo este mes. Puedes continuar de
                  todas formas.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tx_date">Fecha</Label>
              <Input
                id="tx_date"
                type="date"
                aria-invalid={!!errors.tx_date}
                {...register('tx_date')}
              />
              {errors.tx_date ? (
                <p className="text-sm text-destructive">{errors.tx_date.message}</p>
              ) : null}
            </div>
            {/* Recurrence is fixed to recurrent for debt payments (set by the RPC). */}
            {debtMode ? null : (
              <div className="space-y-2">
                <Label htmlFor="recurrence">Frecuencia</Label>
                <Controller
                  control={control}
                  name="recurrence"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="recurrence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="variable">Variable</SelectItem>
                        <SelectItem value="recurrent">Recurrente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              maxLength={280}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          {errors.root ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
