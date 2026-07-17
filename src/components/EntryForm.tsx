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
import { currentMonthYearMX, todayISOMX } from '@/domain/date';
import { hasCoveringPaymentInMonth } from '@/domain/debts';
import { formatMXN, toCentavos } from '@/domain/money';
import { entryFormSchema, type EntryFormInput } from '@/domain/schemas';
import type { Transaction } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useDebtPayments, useDebts, useRecordDebtPayment } from '@/hooks/useDebts';
import { useMissingRecommendations } from '@/hooks/useRecommendations';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { toast } from '@/store/toast';

// Radix Select forbids an empty-string value, so the "fill from a recommendation"
// affordance uses a named sentinel. It is never stored — picking a recommendation
// resolves it to that item's real category.
const FROM_RECOMMENDATION = '__from_recommendation__';

/** Seed values for a *new* entry (e.g. completing a recommendation). Ignored on edit. */
export interface EntryPrefill {
  type?: Transaction['type'];
  amountPesos?: number;
  description?: string;
  category_id?: string;
}

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form edits this transaction; otherwise it creates one. */
  transaction?: Transaction;
  /** Seeds a new entry. Used when a recommendation has no expected amount, so the
   *  user only has to supply the one field we cannot know. */
  prefill?: EntryPrefill;
}

function toDefaults(transaction?: Transaction, prefill?: EntryPrefill): EntryFormInput {
  if (transaction) {
    return {
      type: transaction.type,
      amountPesos: transaction.amount_cents / 100,
      tx_date: transaction.tx_date,
      description: transaction.description,
      // Income rows carry no category (0022); '' is the unselected-Select sentinel.
      category_id: transaction.category_id ?? '',
      recurrence: transaction.recurrence,
    };
  }
  return {
    type: prefill?.type ?? 'expense',
    amountPesos: prefill?.amountPesos ?? Number.NaN,
    tx_date: todayISOMX(),
    description: prefill?.description ?? '',
    category_id: prefill?.category_id ?? '',
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
export function EntryForm({
  open,
  onOpenChange,
  transaction,
  prefill,
}: EntryFormProps) {
  const isEdit = !!transaction;
  const categoriesQuery = useCategories();
  const debtsQuery = useDebts('active');
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const recordPaymentMutation = useRecordDebtPayment();
  const { year: recYear, month: recMonth } = currentMonthYearMX();
  const pendingRecsQuery = useMissingRecommendations(recYear, recMonth);

  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [debtError, setDebtError] = useState(false);
  // True while the category Select holds the "from a recommendation" sentinel. It
  // is not a real category, so it cannot live in `category_id` (a uuid) — picking a
  // recommendation resolves it to that item's own category and clears this.
  const [fromRecommendation, setFromRecommendation] = useState(false);

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
    defaultValues: toDefaults(transaction, prefill),
  });

  // Reset field values whenever the modal opens (create vs. a specific edit).
  useEffect(() => {
    if (open) {
      reset(toDefaults(transaction, prefill));
      setSelectedDebtId('');
      setDebtError(false);
      setFromRecommendation(false);
    }
  }, [open, transaction, prefill, reset]);

  const categories = categoriesQuery.data ?? [];
  const activeDebts = debtsQuery.data ?? [];
  // Only expense recommendations are reachable here: the category field — which
  // hosts the sentinel — is hidden for income (D11).
  const pendingExpenseRecs = (pendingRecsQuery.data ?? []).filter(
    (r) => r.type === 'expense',
  );

  // The debt kind is selectable only when creating (§4.9).
  const selectableCategories = categories.filter((c) => !isEdit || c.kind !== 'debt');

  const categoryId = watch('category_id');
  const txDate = watch('tx_date');
  const type = watch('type');
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const debtMode = !isEdit && selectedCategory?.kind === 'debt';
  // Income carries no category (0022), so the field is hidden entirely for it.
  const showCategory = type !== 'income';

  // Switching to income drops any category already picked, so a subsequent switch
  // back to expense re-opens an empty select rather than a silently retained value
  // — and the submitted payload can never violate transactions_category_by_type.
  useEffect(() => {
    if (type === 'income' && categoryId) setValue('category_id', '');
  }, [type, categoryId, setValue]);

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

  /**
   * Resolve a chosen recommendation into a plain expense: copy its description (the
   * match key, so the saved row clears the item) and expected amount, and adopt its
   * own category — falling back to Otros, since an expense MUST carry one (D11) and
   * a recommendation's category is optional. The sentinel then clears, so the
   * category Select shows the real category that will be saved.
   */
  function handleRecommendationChange(recId: string) {
    const rec = pendingExpenseRecs.find((r) => r.id === recId);
    if (!rec) return;
    const otrosId = categories.find((c) => c.kind === 'otros')?.id ?? '';
    setValue('category_id', rec.category_id ?? otrosId);
    setValue('description', rec.description);
    if (rec.expected_amount_cents !== null) {
      setValue('amountPesos', rec.expected_amount_cents / 100);
    }
    setFromRecommendation(false);
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
      // Income stores no category; the DB CHECK rejects anything else (0022).
      category_id: values.type === 'income' ? null : values.category_id,
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {/* Categoría: expenses only — an income has no category (0022). */}
          {showCategory ? (
          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  // Omit `value` entirely (not undefined) when unselected so the
                  // placeholder shows — exactOptionalPropertyTypes forbids value={undefined}.
                  {...(fromRecommendation
                    ? { value: FROM_RECOMMENDATION }
                    : field.value
                      ? { value: field.value }
                      : {})}
                  onValueChange={(v) => {
                    if (v === FROM_RECOMMENDATION) {
                      setFromRecommendation(true);
                      field.onChange('');
                      return;
                    }
                    setFromRecommendation(false);
                    field.onChange(v);
                  }}
                  disabled={categoriesQuery.isPending}
                >
                  <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Not a category — an affordance for filling the form from a
                        pending recommendation, mirroring the debt branch. */}
                    {!isEdit && pendingExpenseRecs.length > 0 ? (
                      <SelectItem value={FROM_RECOMMENDATION}>
                        Desde una recomendación…
                      </SelectItem>
                    ) : null}
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
          ) : null}

          {/* Recommendation branch: pick a pending item to fill the form from. */}
          {showCategory && fromRecommendation ? (
            <div className="space-y-2">
              <Label htmlFor="recommendation_id">Recomendación pendiente</Label>
              <Select onValueChange={handleRecommendationChange}>
                <SelectTrigger id="recommendation_id">
                  <SelectValue placeholder="Selecciona una recomendación" />
                </SelectTrigger>
                <SelectContent>
                  {pendingExpenseRecs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.description}
                      {r.expected_amount_cents !== null
                        ? ` · ${formatMXN(r.expected_amount_cents)}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Copia su descripción y monto, y toma su categoría (o Otros si no tiene).
              </p>
            </div>
          ) : null}

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
