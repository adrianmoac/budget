import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DebtForm } from '@/components/debts/DebtForm';
import { DebtList } from '@/components/debts/DebtList';
import { PaymentDialog } from '@/components/debts/PaymentDialog';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Debt, DebtStatus } from '@/domain/types';
import { useArchiveDebt, useDebts } from '@/hooks/useDebts';
import { toast } from '@/store/toast';

type StatusFilter = DebtStatus | 'all';

/** Manage debts: CRUD, manual remaining-months override, and payments (§4.6). */
export function Debts() {
  const [filter, setFilter] = useState<StatusFilter>('active');
  const debtsQuery = useDebts(filter === 'all' ? undefined : filter);
  const archiveMutation = useArchiveDebt();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | undefined>(undefined);
  const [paying, setPaying] = useState<Debt | null>(null);
  const [archiving, setArchiving] = useState<Debt | null>(null);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditing(debt);
    setFormOpen(true);
  }

  function confirmArchive() {
    if (!archiving) return;
    archiveMutation.mutate(archiving.id, {
      onSuccess: () => {
        setArchiving(null);
        toast.success('Deuda archivada');
      },
      onError: (err) => toast.error(AppError.fromUnknown(err).userMessage),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Deudas</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-sm text-muted-foreground">
              Estado
            </Label>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as StatusFilter)}
            >
              <SelectTrigger id="status-filter" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva deuda
          </Button>
        </div>
      </div>

      {debtsQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : debtsQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar las deudas"
          onRetry={() => void debtsQuery.refetch()}
        />
      ) : (
        <DebtList
          debts={debtsQuery.data}
          onEdit={openEdit}
          onRecordPayment={setPaying}
          onArchive={setArchiving}
        />
      )}

      <DebtForm
        open={formOpen}
        onOpenChange={setFormOpen}
        {...(editing ? { debt: editing } : {})}
      />

      {paying ? (
        <PaymentDialog
          open={!!paying}
          onOpenChange={(open) => {
            if (!open) setPaying(null);
          }}
          debt={paying}
        />
      ) : null}

      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        title={`¿Archivar "${archiving?.name ?? ''}"?`}
        description="La deuda se ocultará de la lista activa, pero su historial de pagos se conserva."
        confirmLabel="Archivar"
        destructive
        pending={archiveMutation.isPending}
        onConfirm={confirmArchive}
      />
    </div>
  );
}
