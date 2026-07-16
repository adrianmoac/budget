import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ContributionForm } from '@/components/investments/ContributionForm';
import { ContributionHistory } from '@/components/investments/ContributionHistory';
import { InvestmentForm } from '@/components/investments/InvestmentForm';
import { InvestmentList } from '@/components/investments/InvestmentList';
import { InvestmentsSummaryCard } from '@/components/investments/InvestmentsSummaryCard';
import { ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Investment } from '@/domain/types';
import { useDeleteInvestment, useInvestments } from '@/hooks/useInvestments';
import { toast } from '@/store/toast';

/** Manage investment vehicles, contributions, and market value (§4.7). */
export function Investments() {
  const investmentsQuery = useInvestments();
  const deleteMutation = useDeleteInvestment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>(undefined);
  const [contributingTo, setContributingTo] = useState<Investment | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [history, setHistory] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);

  const investments = investmentsQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(investment: Investment) {
    setEditing(investment);
    setFormOpen(true);
  }

  function openContribution(investment: Investment | null) {
    setContributingTo(investment);
    setContributeOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMutation.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        toast.success('Inversión eliminada');
      },
      onError: (err) => toast.error(AppError.fromUnknown(err).userMessage),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Inversiones</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openContribution(null)}
            disabled={investments.length === 0}
          >
            <Plus className="h-4 w-4" />
            Registrar aportación
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva inversión
          </Button>
        </div>
      </div>

      {investmentsQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : investmentsQuery.isError ? (
        <ErrorState
          message="No se pudieron cargar las inversiones"
          onRetry={() => void investmentsQuery.refetch()}
        />
      ) : (
        <>
          <InvestmentsSummaryCard investments={investments} loading={false} />
          <InvestmentList
            investments={investments}
            onAddContribution={openContribution}
            onViewHistory={setHistory}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </>
      )}

      <InvestmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        {...(editing ? { investment: editing } : {})}
      />

      <ContributionForm
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        investments={investments}
        {...(contributingTo ? { defaultInvestmentId: contributingTo.id } : {})}
      />

      {history ? (
        <ContributionHistory
          open={!!history}
          onOpenChange={(open) => {
            if (!open) setHistory(null);
          }}
          investment={history}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={`¿Eliminar "${deleting?.name ?? ''}"?`}
        description="Se eliminará el instrumento de inversión. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
