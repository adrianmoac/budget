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
import { categoryFormSchema, type CategoryFormInput } from '@/domain/schemas';
import type { Category } from '@/domain/types';
import { useCreateCategory, useRenameCategory } from '@/hooks/useCategories';
import { toast } from '@/store/toast';

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form renames this category; otherwise it creates one. */
  category?: Category;
}

/** Create/rename a category (§4.5). Name is validated then persisted via table ops. */
export function CategoryForm({ open, onOpenChange, category }: CategoryFormProps) {
  const isEdit = !!category;
  const createMutation = useCreateCategory();
  const renameMutation = useRenameCategory();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: category?.name ?? '' },
  });

  useEffect(() => {
    if (open) reset({ name: category?.name ?? '' });
  }, [open, category, reset]);

  async function onSubmit(values: CategoryFormInput) {
    try {
      if (category) {
        await renameMutation.mutateAsync({ id: category.id, name: values.name });
        toast.success('Categoría actualizada');
      } else {
        await createMutation.mutateAsync(values.name);
        toast.success('Categoría creada');
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
          <DialogTitle>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Cambia el nombre de la categoría.'
              : 'Crea una categoría para clasificar tus movimientos.'}
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
              maxLength={64}
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
