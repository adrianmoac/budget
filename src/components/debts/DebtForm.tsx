import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { DebtInput } from '@/api/debts';
import { AppError } from '@/api/errors';
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
import { todayISOMX } from '@/domain/date';
import { toCentavos } from '@/domain/money';
import { debtFormSchema, type DebtFormInput } from '@/domain/schemas';
import type { Debt } from '@/domain/types';
import { useCreateDebt, useUpdateDebt } from '@/hooks/useDebts';
import { toast } from '@/store/toast';

interface DebtFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form edits this debt; otherwise it creates one. */
  debt?: Debt;
}

function toDefaults(debt?: Debt): DebtFormInput {
  if (debt) {
    return {
      name: debt.name,
      total_months: debt.total_months,
      remaining_months: debt.remaining_months,
      minimumPesos: debt.minimum_payment_cents / 100,
      due_day: debt.due_day,
      start_date: debt.start_date,
    };
  }
  return {
    name: '',
    total_months: Number.NaN,
    // Hidden on create; overridden with total_months on submit (a new debt starts
    // with every month remaining). Kept 0 so the ≤ total_months refine passes.
    remaining_months: 0,
    minimumPesos: Number.NaN,
    due_day: Number.NaN,
    start_date: todayISOMX(),
  };
}

/** Create/edit a debt (§4.6). `remaining_months` is editable only when editing (D4). */
export function DebtForm({ open, onOpenChange, debt }: DebtFormProps) {
  const isEdit = !!debt;
  const createMutation = useCreateDebt();
  const updateMutation = useUpdateDebt();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormInput>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: toDefaults(debt),
  });

  useEffect(() => {
    if (open) reset(toDefaults(debt));
  }, [open, debt, reset]);

  async function onSubmit(values: DebtFormInput) {
    let minimumCents: number;
    try {
      minimumCents = toCentavos(values.minimumPesos);
    } catch {
      setError('minimumPesos', { message: 'Monto inválido' });
      return;
    }

    const base = {
      name: values.name,
      total_months: values.total_months,
      minimum_payment_cents: minimumCents,
      due_day: values.due_day,
      start_date: values.start_date,
    };

    try {
      if (debt) {
        const patch: Partial<DebtInput> = {
          ...base,
          remaining_months: values.remaining_months,
        };
        await updateMutation.mutateAsync({ id: debt.id, patch });
        toast.success('Deuda actualizada');
      } else {
        await createMutation.mutateAsync({
          ...base,
          remaining_months: values.total_months,
        });
        toast.success('Deuda creada');
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
          <DialogTitle>{isEdit ? 'Editar deuda' : 'Nueva deuda'}</DialogTitle>
          <DialogDescription>
            Define el plazo, el pago mínimo mensual y el día de vencimiento.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              maxLength={120}
              autoFocus
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_months">Meses totales</Label>
              <Input
                id="total_months"
                type="number"
                min={1}
                aria-invalid={!!errors.total_months}
                {...register('total_months', { valueAsNumber: true })}
              />
              {errors.total_months ? (
                <p className="text-sm text-destructive">{errors.total_months.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumPesos">Pago mínimo</Label>
              <MoneyInput
                id="minimumPesos"
                aria-invalid={!!errors.minimumPesos}
                {...register('minimumPesos', { valueAsNumber: true })}
              />
              {errors.minimumPesos ? (
                <p className="text-sm text-destructive">{errors.minimumPesos.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_day">Día de vencimiento</Label>
              <Input
                id="due_day"
                type="number"
                min={1}
                max={31}
                aria-invalid={!!errors.due_day}
                {...register('due_day', { valueAsNumber: true })}
              />
              {errors.due_day ? (
                <p className="text-sm text-destructive">{errors.due_day.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de inicio</Label>
              <Input
                id="start_date"
                type="date"
                aria-invalid={!!errors.start_date}
                {...register('start_date')}
              />
              {errors.start_date ? (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              ) : null}
            </div>
          </div>

          {isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="remaining_months">Meses restantes</Label>
              <Input
                id="remaining_months"
                type="number"
                min={0}
                max={debt?.total_months}
                aria-invalid={!!errors.remaining_months}
                {...register('remaining_months', { valueAsNumber: true })}
              />
              {errors.remaining_months ? (
                <p className="text-sm text-destructive">
                  {errors.remaining_months.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Ajuste manual, entre 0 y el total de meses.
                </p>
              )}
            </div>
          ) : null}

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
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
