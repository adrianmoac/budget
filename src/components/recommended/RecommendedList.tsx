import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import type { RecommendedItem } from '@/domain/types';

interface RecommendedListProps {
  items: RecommendedItem[];
  categoryNameById: Map<string, string>;
  onEdit: (item: RecommendedItem) => void;
  onDelete: (item: RecommendedItem) => void;
}

function windowLabel(item: RecommendedItem): string {
  const start = formatDateMX(item.window_start);
  return item.window_end ? `${start} – ${formatDateMX(item.window_end)}` : `Desde ${start}`;
}

/** Recommendation templates with edit/delete actions (§4.8). */
export function RecommendedList({
  items,
  categoryNameById,
  onEdit,
  onDelete,
}: RecommendedListProps) {
  if (items.length === 0) {
    return <EmptyState title="Sin recomendaciones" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
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
                  <td className="px-4 py-2 text-muted-foreground">{windowLabel(item)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
