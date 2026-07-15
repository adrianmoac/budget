import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RecommendedForm } from '@/components/recommended/RecommendedForm';
import { RecommendedList } from '@/components/recommended/RecommendedList';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecommendedItem } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useDeleteRecommendedItem, useRecommendedItems } from '@/hooks/useRecommendations';
import { toast } from '@/store/toast';

/** Manage recommendation templates (§4.8). Results feed the dashboard banner. */
export function Recommended() {
  const itemsQuery = useRecommendedItems();
  const categoriesQuery = useCategories();
  const deleteMutation = useDeleteRecommendedItem();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecommendedItem | undefined>(undefined);
  const [deleting, setDeleting] = useState<RecommendedItem | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.name);
    return map;
  }, [categoriesQuery.data]);
  const categories = categoriesQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(item: RecommendedItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success('Recomendación eliminada');
      },
      onError: (err) => toast.error(AppError.fromUnknown(err).userMessage),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Recomendados</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva recomendación
        </Button>
      </div>

      {itemsQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : itemsQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar las recomendaciones"
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : (
        <RecommendedList
          items={itemsQuery.data}
          categoryNameById={categoryNameById}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      <RecommendedForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        {...(editing ? { item: editing } : {})}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="¿Eliminar recomendación?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
