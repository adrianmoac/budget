import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AppError } from '@/api/errors';
import type { RecommendedItemInput } from '@/api/recommendations';
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
import { fromCentavos, toCentavos } from '@/domain/money';
import {
  recommendedItemFormSchema,
  type RecommendedItemFormInput,
} from '@/domain/schemas';
import type { Category, RecommendedItem } from '@/domain/types';
import {
  useCreateRecommendedItem,
  useUpdateRecommendedItem,
} from '@/hooks/useRecommendations';
import { toast } from '@/store/toast';

// Radix Select forbids an empty-string item value, so "no category" uses a sentinel
// that maps to '' (→ undefined → null) on the form field.
const NO_CATEGORY = '__none__';

interface RecommendedFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** When provided, the form edits this item; otherwise it creates one. */
  item?: RecommendedItem;
}

function toDefaults(item?: RecommendedItem): RecommendedItemFormInput {
  if (item) {
    return {
      type: item.type,
      category_id: item.category_id ?? '',
      description: item.description,
      expectedPesos:
        item.expected_amount_cents === null
          ? Number.NaN
          : fromCentavos(item.expected_amount_cents),
      window_start: item.window_start,
      window_end: item.window_end ?? '',
      repeat_mode: item.repeat_mode,
    };
  }
  return {
    type: 'expense',
    category_id: '',
    description: '',
    expectedPesos: Number.NaN,
    window_start: todayISOMX(),
    window_end: '',
    // A new recommendation defaults to a one-off. Only the form default changes —
    // the recommended_items.repeat_mode column keeps its 'monthly' default, which is
    // the backward-compatible value for rows written before the column existed.
    repeat_mode: 'none',
  };
}

/** Create/edit a recommendation template (§4.8). */
export function RecommendedForm({
  open,
  onOpenChange,
  categories,
  item,
}: RecommendedFormProps) {
  const isEdit = !!item;
  const createMutation = useCreateRecommendedItem();
  const updateMutation = useUpdateRecommendedItem();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecommendedItemFormInput>({
    resolver: zodResolver(recommendedItemFormSchema),
    defaultValues: toDefaults(item),
  });

  const type = watch('type');
  const repeatMode = watch('repeat_mode');
  const isOneOff = repeatMode === 'none';

  useEffect(() => {
    if (open) reset(toDefaults(item));
  }, [open, item, reset]);

  async function onSubmit(values: RecommendedItemFormInput) {
    let expectedCents: number | null = null;
    if (values.expectedPesos !== undefined) {
      try {
        expectedCents = toCentavos(values.expectedPesos);
      } catch {
        setError('expectedPesos', { message: 'Monto inválido' });
        return;
      }
    }

    const payload: RecommendedItemInput = {
      type: values.type,
      // Income items are matched by description, not category (0024), so they
      // never carry one.
      category_id: values.type === 'income' ? null : (values.category_id ?? null),
      description: values.description,
      expected_amount_cents: expectedCents,
      window_start: values.window_start,
      // A one-off has no end bound — storing null is what keeps it non-expiring
      // and due until covered (0027), with no special case in the status query.
      window_end: values.repeat_mode === 'none' ? null : (values.window_end ?? null),
      repeat_mode: values.repeat_mode,
    };

    try {
      if (item) {
        await updateMutation.mutateAsync({ id: item.id, input: payload });
        toast.success('Recomendación actualizada');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Recomendación creada');
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
          <DialogTitle>
            {isEdit ? 'Editar recomendación' : 'Nueva recomendación'}
          </DialogTitle>
          <DialogDescription>
            Define un movimiento esperado y su ventana de recomendación.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="space-y-4"
          noValidate
        >
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
              <Label htmlFor="repeat_mode">Repetir</Label>
              <Controller
                control={control}
                name="repeat_mode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="repeat_mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Cada mes</SelectItem>
                      <SelectItem value="yearly">Cada año</SelectItem>
                      <SelectItem value="none">Una vez</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Categoría is organisational only — matching is by description for both
              types (0029). Income carries no category at all (0022), so it is hidden
              for income rather than shown as a field that does nothing. */}
          {type === 'income' ? null : (
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoría (sólo para organizar)</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? field.value : NO_CATEGORY}
                    onValueChange={(v) => field.onChange(v === NO_CATEGORY ? '' : v)}
                  >
                    <SelectTrigger id="category_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

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
            ) : (
              <p className="text-sm text-muted-foreground">
                Debe coincidir con la descripción del movimiento para marcarla como
                registrada. No distingue mayúsculas ni espacios.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedPesos">Monto esperado (opcional)</Label>
            <MoneyInput
              id="expectedPesos"
              aria-invalid={!!errors.expectedPesos}
              {...register('expectedPesos', { valueAsNumber: true })}
            />
            {errors.expectedPesos ? (
              <p className="text-sm text-destructive">{errors.expectedPesos.message}</p>
            ) : null}
          </div>

          {/* A one-off has no range: it runs from its date until something covers
              it, so the end field is hidden and stored as null (0026/0027). */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="window_start">
                {isOneOff ? 'Fecha' : 'Inicio de ventana'}
              </Label>
              <Input
                id="window_start"
                type="date"
                aria-invalid={!!errors.window_start}
                {...register('window_start')}
              />
              {errors.window_start ? (
                <p className="text-sm text-destructive">{errors.window_start.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isOneOff
                    ? 'Se recomienda desde este mes hasta que la registres.'
                    : 'Sólo cuentan el mes y el año; el día no afecta la recomendación.'}
                </p>
              )}
            </div>
            {isOneOff ? null : (
              <div className="space-y-2">
                <Label htmlFor="window_end">Fin de ventana (opcional)</Label>
                <Input
                  id="window_end"
                  type="date"
                  aria-invalid={!!errors.window_end}
                  {...register('window_end')}
                />
                {errors.window_end ? (
                  <p className="text-sm text-destructive">{errors.window_end.message}</p>
                ) : null}
              </div>
            )}
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
