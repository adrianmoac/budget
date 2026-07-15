import { Check, History, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { AppError } from '@/api/errors';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { computeInterest } from '@/domain/investments';
import { formatMXN, fromCentavos, toCentavos } from '@/domain/money';
import type { Investment } from '@/domain/types';
import { useUpdateMarketValue } from '@/hooks/useInvestments';
import { toast } from '@/store/toast';

interface InvestmentListProps {
  investments: Investment[];
  onAddContribution: (investment: Investment) => void;
  onViewHistory: (investment: Investment) => void;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
}

function formatPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/** Vehicle table with inline market-value edit and per-vehicle interest (§4.7). */
export function InvestmentList({
  investments,
  onAddContribution,
  onViewHistory,
  onEdit,
  onDelete,
}: InvestmentListProps) {
  if (investments.length === 0) {
    return <EmptyState title="Sin inversiones" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Aportado
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Valor de mercado
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Rendimiento
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <InvestmentRow
                  key={inv.id}
                  investment={inv}
                  onAddContribution={onAddContribution}
                  onViewHistory={onViewHistory}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvestmentRow({
  investment,
  onAddContribution,
  onViewHistory,
  onEdit,
  onDelete,
}: {
  investment: Investment;
  onAddContribution: (investment: Investment) => void;
  onViewHistory: (investment: Investment) => void;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pesos, setPesos] = useState(String(fromCentavos(investment.market_value_cents)));
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateMarketValue();

  const interest = computeInterest(
    investment.market_value_cents,
    investment.contributed_total_cents,
  );
  // A non-zero contributed total means at least one contribution exists, so the
  // ON DELETE RESTRICT FK would block deletion — disable it with a hint.
  const hasContributions = investment.contributed_total_cents > 0;

  function startEdit() {
    setPesos(String(fromCentavos(investment.market_value_cents)));
    setError(null);
    setEditing(true);
  }

  function save() {
    let cents: number;
    try {
      cents = toCentavos(Number(pesos)); // rejects NaN/Infinity/negative → market value ≥ 0
    } catch {
      setError('Valor inválido');
      return;
    }
    mutation.mutate(
      { id: investment.id, marketValueCents: cents },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Valor de mercado actualizado');
        },
        onError: (err) => setError(AppError.fromUnknown(err).userMessage),
      },
    );
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2 font-medium">{investment.name}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        {formatMXN(investment.contributed_total_cents)}
      </td>
      <td className="px-4 py-2 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pesos}
              onChange={(e) => setPesos(e.target.value)}
              className="h-8 w-28"
              aria-label={`Valor de mercado de ${investment.name}`}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={save}
              disabled={mutation.isPending}
              aria-label="Guardar"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setEditing(false)}
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <span className="tabular-nums">
              {formatMXN(investment.market_value_cents)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={startEdit}
              aria-label={`Editar valor de mercado de ${investment.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {error ? <span className="sr-only">{error}</span> : null}
      </td>
      <td
        className={`px-4 py-2 text-right tabular-nums ${
          interest.interestCents >= 0 ? 'text-success' : 'text-destructive'
        }`}
      >
        {formatMXN(interest.interestCents)}
        {interest.percent === null ? (
          <span
            className="ml-1 cursor-help text-muted-foreground"
            title="Sin inversiones aún"
          >
            (—)
          </span>
        ) : (
          <span className="ml-1">({formatPercent(interest.percent)})</span>
        )}
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onAddContribution(investment)}
            aria-label={`Registrar aportación a ${investment.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onViewHistory(investment)}
            aria-label={`Ver aportaciones de ${investment.name}`}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onEdit(investment)}
            aria-label={`Editar ${investment.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive"
            disabled={hasContributions}
            onClick={() => onDelete(investment)}
            aria-label={`Eliminar ${investment.name}`}
            title={
              hasContributions
                ? 'Elimina primero sus aportaciones'
                : `Eliminar ${investment.name}`
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
