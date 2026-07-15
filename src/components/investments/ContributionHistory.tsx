import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import type { Investment } from '@/domain/types';
import { useContributions, useDeleteContribution } from '@/hooks/useContributions';
import { toast } from '@/store/toast';

interface ContributionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment;
}

/**
 * Contribution history for one vehicle (§4.7). Deleting a contribution reverses the
 * invested totals via triggers; a per-row inline confirm avoids a nested dialog.
 */
export function ContributionHistory({
  open,
  onOpenChange,
  investment,
}: ContributionHistoryProps) {
  const contributionsQuery = useContributions(open ? investment.id : undefined);
  const deleteMutation = useDeleteContribution();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function confirmDelete(id: string) {
    deleteMutation.mutate(
      { id, investmentId: investment.id },
      {
        onSuccess: () => {
          setConfirmingId(null);
          toast.success('Aportación eliminada');
        },
        onError: (err) => toast.error(AppError.fromUnknown(err).userMessage),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aportaciones · {investment.name}</DialogTitle>
          <DialogDescription>
            Total aportado {formatMXN(investment.contributed_total_cents)}.
          </DialogDescription>
        </DialogHeader>

        {contributionsQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : contributionsQuery.isError ? (
          <ErrorState
            message="No se pudieron cargar las aportaciones"
            onRetry={() => void contributionsQuery.refetch()}
          />
        ) : contributionsQuery.data.length === 0 ? (
          <EmptyState title="Sin aportaciones" />
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {contributionsQuery.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <div className="text-sm">
                  <p className="font-medium tabular-nums">{formatMXN(c.amount_cents)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateMX(c.contrib_date)}
                  </p>
                </div>
                {confirmingId === c.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => confirmDelete(c.id)}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingId(null)}
                      disabled={deleteMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setConfirmingId(c.id)}
                    aria-label={`Eliminar aportación de ${formatMXN(c.amount_cents)}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
