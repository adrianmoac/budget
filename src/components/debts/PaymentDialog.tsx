import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { hasCoveringPaymentInMonth } from '@/domain/debts';
import { formatMXN, toCentavos } from '@/domain/money';
import { paymentFormSchema, type PaymentFormInput } from '@/domain/schemas';
import type { Debt } from '@/domain/types';
import { useDebtPayments, useRecordDebtPayment } from '@/hooks/useDebts';
import { toast } from '@/store/toast';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt;
}

function toDefaults(debt: Debt): PaymentFormInput {
  return {
    amountPesos: debt.minimum_payment_cents / 100, // prefill = minimum (FR-6)
    date: todayISOMX(),
    description: `Pago ${debt.name}`,
  };
}

/**
 * Record a payment for a specific debt (§4.6). Amount is prefilled with the
 * minimum; a covering payment already recorded this month raises a non-blocking
 * warning (D6). Submitting routes through the atomic `record_debt_payment` RPC.
 */
export function PaymentDialog({ open, onOpenChange, debt }: PaymentDialogProps) {
  const recordMutation = useRecordDebtPayment();
  const paymentsQuery = useDebtPayments(open ? debt.id : undefined);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: toDefaults(debt),
  });

  useEffect(() => {
    if (open) reset(toDefaults(debt));
  }, [open, debt, reset]);

  const watchedDate = watch('date');
  const duplicateWarning = hasCoveringPaymentInMonth(
    paymentsQuery.data ?? [],
    watchedDate ?? '',
  );

  async function onSubmit(values: PaymentFormInput) {
    let amountCents: number;
    try {
      amountCents = toCentavos(values.amountPesos);
    } catch {
      setError('amountPesos', { message: 'Monto inválido' });
      return;
    }

    try {
      const result = await recordMutation.mutateAsync({
        debt_id: debt.id,
        amount_cents: amountCents,
        date: values.date,
        description: values.description,
      });
      toast.success(
        'Pago registrado',
        result.covered_minimum
          ? 'Cubre el mínimo — se descontó un mes'
          : 'No cubre el mínimo — no se descontó mes',
      );
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: AppError.fromUnknown(err).userMessage });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {debt.name} · mínimo {formatMXN(debt.minimum_payment_cents)}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
          {duplicateWarning ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Ya existe un pago que cubre el mínimo este mes. Puedes continuar de todas
              formas.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                aria-invalid={!!errors.date}
                {...register('date')}
              />
              {errors.date ? (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              ) : null}
            </div>
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
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
