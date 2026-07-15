import { Lightbulb, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntryForm } from '@/components/EntryForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { currentMonthYearMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import type { RecommendedItem } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useMissingRecommendations } from '@/hooks/useRecommendations';

/**
 * FR-23: surface recommended movements missing for the current month (§4.2, §4.8).
 * Reads the derived `missing_recommendations` for the current month; the card is
 * absent when nothing is missing and disappears once a matching-category transaction
 * is added (the mutation invalidates `['recommendations']`). "Add" opens the shared
 * EntryForm — the user classifies the movement, which is what clears the item (D3).
 */
export function RecommendationBanner() {
  const { year, month } = currentMonthYearMX();
  const { data, isSuccess } = useMissingRecommendations(year, month);
  const categoriesQuery = useCategories();
  const [entryOpen, setEntryOpen] = useState(false);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) map.set(c.id, c.name);
    return map;
  }, [categoriesQuery.data]);

  // Only render once loaded and there is at least one missing recommendation.
  if (!isSuccess || data.length === 0) return null;

  function label(item: RecommendedItem): string {
    if (item.description) return item.description;
    if (item.category_id) return categoryNameById.get(item.category_id) ?? 'Movimiento';
    return item.type === 'income' ? 'Ingreso' : 'Gasto';
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Lightbulb className="h-4 w-4" />
            Movimientos sugeridos este mes
          </CardDescription>
          <Button size="sm" variant="outline" onClick={() => setEntryOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-amber-200 dark:divide-amber-900">
            {data.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">
                  {label(item)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </span>
                {item.expected_amount_cents !== null ? (
                  <span className="tabular-nums text-muted-foreground">
                    {formatMXN(item.expected_amount_cents)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {entryOpen ? <EntryForm open={entryOpen} onOpenChange={setEntryOpen} /> : null}
    </>
  );
}
