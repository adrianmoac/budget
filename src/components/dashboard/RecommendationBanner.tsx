import { Check, Lightbulb, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppError } from '@/api/errors';
import type { TransactionInput } from '@/api/transactions';
import { EntryForm, type EntryPrefill } from '@/components/EntryForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { currentMonthYearMX, todayISOMX } from '@/domain/date';
import { formatMXN } from '@/domain/money';
import type { Category, RecommendedItem } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { useMissingRecommendations } from '@/hooks/useRecommendations';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { toast } from '@/store/toast';

/**
 * An expense MUST carry a category (D11) but a recommendation's category is
 * optional, so a category-less expense item falls back to Otros — the category that
 * exists for exactly this. Income never carries one.
 */
function categoryForEntry(item: RecommendedItem, categories: Category[]): string | null {
  if (item.type === 'income') return null;
  return item.category_id ?? categories.find((c) => c.kind === 'otros')?.id ?? null;
}

/**
 * FR-23: surface recommended movements missing for the current month (§4.2, §4.8).
 * Reads the derived `missing_recommendations` for the current month; the card is
 * absent when nothing is missing and disappears once a matching transaction is added
 * (the mutation invalidates `['recommendations']`).
 *
 * "Completada" registers the movement in one click. It only ever fills in what the
 * user would have typed: the item's own description (the match key — which is
 * precisely what then clears the item, D3) and its expected amount, dated today.
 * When the item has no expected amount there is nothing to invent, so it opens the
 * prefilled EntryForm and asks for that one unknown field instead.
 */
export function RecommendationBanner() {
  const { year, month } = currentMonthYearMX();
  const { data, isSuccess } = useMissingRecommendations(year, month);
  const categoriesQuery = useCategories();
  const createMutation = useCreateTransaction();
  const [entryOpen, setEntryOpen] = useState(false);
  const [prefill, setPrefill] = useState<EntryPrefill | undefined>(undefined);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  // Only render once loaded and there is at least one missing recommendation.
  if (!isSuccess || data.length === 0) return null;

  function label(item: RecommendedItem): string {
    if (item.description) return item.description;
    if (item.category_id) return categoryNameById.get(item.category_id) ?? 'Movimiento';
    return item.type === 'income' ? 'Ingreso' : 'Gasto';
  }

  function openPrefilled(item: RecommendedItem) {
    const categoryId = categoryForEntry(item, categories);
    setPrefill({
      type: item.type,
      description: item.description,
      ...(categoryId ? { category_id: categoryId } : {}),
    });
    setEntryOpen(true);
  }

  function complete(item: RecommendedItem) {
    // Nothing to invent without an amount — ask for it in the form instead.
    if (item.expected_amount_cents === null) {
      openPrefilled(item);
      return;
    }
    const categoryId = categoryForEntry(item, categories);
    // Otros is seeded for every user, so this is unreachable; fall back to the form
    // rather than submit a payload the category-by-type CHECK would reject.
    if (item.type === 'expense' && !categoryId) {
      openPrefilled(item);
      return;
    }

    const input: TransactionInput = {
      type: item.type,
      amount_cents: item.expected_amount_cents,
      tx_date: todayISOMX(),
      description: item.description,
      category_id: categoryId,
      // A repeating item is by definition an expected, recurring movement; a
      // one-off is not.
      recurrence: item.repeat_mode === 'none' ? 'variable' : 'recurrent',
    };

    setCompletingId(item.id);
    createMutation.mutate(input, {
      onSuccess: () => toast.success(`${label(item)} registrada`),
      onError: (err) => toast.error(AppError.fromUnknown(err).userMessage),
      onSettled: () => setCompletingId(null),
    });
  }

  return (
    <>
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Lightbulb className="h-4 w-4" />
            Movimientos sugeridos este mes
          </CardDescription>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrefill(undefined);
              setEntryOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-amber-200 dark:divide-amber-900">
            {data.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="font-medium">
                  {label(item)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {item.expected_amount_cents !== null ? (
                    <span className="tabular-nums text-muted-foreground">
                      {formatMXN(item.expected_amount_cents)}
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={completingId === item.id}
                    onClick={() => complete(item)}
                    aria-label={`Marcar ${label(item)} como completada`}
                  >
                    {completingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Completada
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {entryOpen ? (
        <EntryForm
          open={entryOpen}
          onOpenChange={setEntryOpen}
          {...(prefill ? { prefill } : {})}
        />
      ) : null}
    </>
  );
}
