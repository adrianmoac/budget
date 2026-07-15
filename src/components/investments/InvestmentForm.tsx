import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { AppError } from '@/api/errors';
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
import { investmentFormSchema, type InvestmentFormInput } from '@/domain/schemas';
import type { Investment } from '@/domain/types';
import { useCreateInvestment, useRenameInvestment } from '@/hooks/useInvestments';
import { toast } from '@/store/toast';

interface InvestmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form renames this vehicle; otherwise it creates one. */
  investment?: Investment;
}

/** Create/rename an investment vehicle (§4.7). Persisted via plain table ops. */
export function InvestmentForm({ open, onOpenChange, investment }: InvestmentFormProps) {
  const isEdit = !!investment;
  const createMutation = useCreateInvestment();
  const renameMutation = useRenameInvestment();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormInput>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: { name: investment?.name ?? '' },
  });

  useEffect(() => {
    if (open) reset({ name: investment?.name ?? '' });
  }, [open, investment, reset]);

  async function onSubmit(values: InvestmentFormInput) {
    try {
      if (investment) {
        await renameMutation.mutateAsync({ id: investment.id, name: values.name });
        toast.success('Inversión actualizada');
      } else {
        await createMutation.mutateAsync(values.name);
        toast.success('Inversión creada');
      }
      onOpenChange(false);
    } catch (err) {
      const appError = AppError.fromUnknown(err);
      // Name collisions belong on the field; everything else is a form-level error.
      if (appError.code === 'name_conflict') {
        setError('name', { message: appError.userMessage });
      } else {
        setError('root', { message: appError.userMessage });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cambia el nombre del instrumento de inversión.'
              : 'Crea un instrumento de inversión (p. ej. GBM, Cetes).'}
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
              maxLength={80}
              autoFocus
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
