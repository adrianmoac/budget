import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RecommendedForm } from '@/components/recommended/RecommendedForm';
import { RecommendedList } from '@/components/recommended/RecommendedList';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonthYearMX } from '@/domain/date';
import type { RecommendedItem } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import {
  useDeleteRecommendedItem,
  useRecommendationStatus,
} from '@/hooks/useRecommendations';
import { toast } from '@/store/toast';

/** Manage recommendation templates (§4.8). Results feed the dashboard banner. */
export function Recommended() {
  // "This month" is literal here — the page has no period picker, and coverage is
  // always judged against the current month (§4.8).
  const { month, year } = currentMonthYearMX();
  const statusQuery = useRecommendationStatus(year, month);
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

  // Past = the window closed before this month, OR it is already registered this
  // month. Read from the explicit flags, never inferred from absence in the
  // "missing" list: an item can be none of due/covered/expired — a yearly item
  // outside its anniversary month is simply not due, and belongs in Pendientes.
  const { pending, past } = useMemo(() => {
    const rows = statusQuery.data ?? [];
    return {
      pending: rows.filter((r) => !(r.is_expired || r.is_covered)),
      past: rows.filter((r) => r.is_expired || r.is_covered),
    };
  }, [statusQuery.data]);

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

      {statusQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : statusQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar las recomendaciones"
          onRetry={() => void statusQuery.refetch()}
        />
      ) : (
        <>
          <RecommendedList
            title="Pendientes"
            emptyLabel="Nada pendiente este mes"
            rows={pending}
            categoryNameById={categoryNameById}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
          <RecommendedList
            title="Ya registradas o vencidas"
            emptyLabel="Nada registrado ni vencido"
            rows={past}
            categoryNameById={categoryNameById}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </>
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
