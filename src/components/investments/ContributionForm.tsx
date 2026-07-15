import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { todayISOMX } from '@/domain/date';
import { toCentavos } from '@/domain/money';
import { contributionFormSchema, type ContributionFormInput } from '@/domain/schemas';
import type { Investment } from '@/domain/types';
import { useCreateContribution } from '@/hooks/useContributions';
import { toast } from '@/store/toast';

interface ContributionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investments: Investment[];
  /** Pre-selected vehicle when opened from a specific row. */
  defaultInvestmentId?: string;
}

function toDefaults(defaultInvestmentId?: string): ContributionFormInput {
  return {
    investment_id: defaultInvestmentId ?? '',
    amountPesos: Number.NaN,
    contrib_date: todayISOMX(),
  };
}

/**
 * Record a contribution against a vehicle (§4.7): vehicle + amount + date. Invested
 * totals update via triggers; liquid cash is never touched (D2).
 */
export function ContributionForm({
  open,
  onOpenChange,
  investments,
  defaultInvestmentId,
}: ContributionFormProps) {
  const createMutation = useCreateContribution();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContributionFormInput>({
    resolver: zodResolver(contributionFormSchema),
    defaultValues: toDefaults(defaultInvestmentId),
  });

  useEffect(() => {
    if (open) reset(toDefaults(defaultInvestmentId));
  }, [open, defaultInvestmentId, reset]);

  async function onSubmit(values: ContributionFormInput) {
    let amountCents: number;
    try {
      amountCents = toCentavos(values.amountPesos);
    } catch {
      setError('amountPesos', { message: 'Monto inválido' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        investment_id: values.investment_id,
        amount_cents: amountCents,
        contrib_date: values.contrib_date,
      });
      toast.success('Aportación registrada');
      onOpenChange(false);
    } catch (err) {
      setError('root', { message: AppError.fromUnknown(err).userMessage });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar aportación</DialogTitle>
          <DialogDescription>
            Suma dinero a un instrumento de inversión.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="investment_id">Inversión</Label>
            <Controller
              control={control}
              name="investment_id"
              render={({ field }) => (
                <Select
                  // Omit `value` entirely when unselected so the placeholder shows
                  // (exactOptionalPropertyTypes forbids value={undefined}).
                  {...(field.value ? { value: field.value } : {})}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="investment_id" aria-invalid={!!errors.investment_id}>
                    <SelectValue placeholder="Selecciona una inversión" />
                  </SelectTrigger>
                  <SelectContent>
                    {investments.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.investment_id ? (
              <p className="text-sm text-destructive">{errors.investment_id.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="contrib_date">Fecha</Label>
              <Input
                id="contrib_date"
                type="date"
                aria-invalid={!!errors.contrib_date}
                {...register('contrib_date')}
              />
              {errors.contrib_date ? (
                <p className="text-sm text-destructive">{errors.contrib_date.message}</p>
              ) : null}
            </div>
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
