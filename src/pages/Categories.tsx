import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CategoryForm } from '@/components/categories/CategoryForm';
import { CategoryList } from '@/components/categories/CategoryList';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category } from '@/domain/types';
import { useCategories, useDeleteCategory } from '@/hooks/useCategories';
import { toast } from '@/store/toast';

/** Manage categories: create/rename via table ops, delete via RPC (§4.5). */
export function Categories() {
  const categoriesQuery = useCategories();
  const deleteMutation = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);
  const [deleting, setDeleting] = useState<Category | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: (result) => {
        setDeleting(null);
        toast.success(
          'Categoría eliminada',
          `${result.reassigned_transactions} movimiento(s) pasaron a Otros`,
        );
      },
      onError: (err) => {
        toast.error(AppError.fromUnknown(err).userMessage);
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      {categoriesQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : categoriesQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar las categorías"
          onRetry={() => void categoriesQuery.refetch()}
        />
      ) : (
        <CategoryList
          categories={categoriesQuery.data}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        {...(editing ? { category: editing } : {})}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`¿Eliminar "${deleting?.name ?? ''}"?`}
        description="Los movimientos y recomendaciones de esta categoría pasarán a Otros. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
