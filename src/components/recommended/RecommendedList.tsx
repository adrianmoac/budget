import { Pencil, Trash2 } from 'lucide-react';
import type { RecommendationStatus } from '@/api/recommendations';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import { repeatLabel, windowLabel } from '@/domain/recommendations';
import type { RecommendedItem } from '@/domain/types';

interface RecommendedListProps {
  /** Status rows straight from `recommendation_status` — the flags drive Estado. */
  rows: RecommendationStatus[];
  categoryNameById: Map<string, string>;
  onEdit: (item: RecommendedItem) => void;
  onDelete: (item: RecommendedItem) => void;
  /** Rendered as a card header — set when the page shows more than one list. */
  title?: string;
  emptyLabel?: string;
}

/**
 * Human-readable state for a row. Coverage wins over expiry when both hold: that it
 * was registered (and when) is more useful than that its window has since closed.
 */
function statusLabel(row: RecommendationStatus): string {
  if (row.is_covered) {
    return row.covered_on ? `Registrada el ${formatDateMX(row.covered_on)}` : 'Registrada';
  }
  if (row.is_expired) return 'Vencida';
  return 'Pendiente';
}

/** Recommendation templates with edit/delete actions (§4.8). */
export function RecommendedList({
  rows,
  categoryNameById,
  onEdit,
  onDelete,
  title,
  emptyLabel = 'Sin recomendaciones',
}: RecommendedListProps) {
  const header = title ? (
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
  ) : null;

  if (rows.length === 0) {
    return title ? (
      <Card>
        {header}
        <CardContent>
          <EmptyState title={emptyLabel} />
        </CardContent>
      </Card>
    ) : (
      <EmptyState title={emptyLabel} />
    );
  }

  return (
    <Card>
      {header}
      <CardContent className="p-0">
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Descripción
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Categoría
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Monto esperado
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Ventana
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const item = row.item;
                return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {item.description || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </td>
                  <td className="px-4 py-2">
                    {item.category_id
                      ? (categoryNameById.get(item.category_id) ?? '—')
                      : <span className="text-muted-foreground">Sin categoría</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {item.expected_amount_cents === null
                      ? '—'
                      : formatMXN(item.expected_amount_cents)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {repeatLabel(item.repeat_mode)}
                      </span>
                      <span>{windowLabel(item)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {statusLabel(row)}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onEdit(item)}
                        aria-label={`Editar ${item.description || 'recomendación'}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(item)}
                        aria-label={`Eliminar ${item.description || 'recomendación'}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
