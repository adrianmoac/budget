import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { ALL_CATEGORIES, useUiStore } from '@/store/ui';

/**
 * Category facet for the month view (§4.3). Expenses only: income carries no
 * category (D11), so selecting one hides the income table rather than pretending
 * an income could match.
 */
export function CategoryFilter() {
  const active = useUiStore((s) => s.categoryFilter);
  const setFilter = useUiStore((s) => s.setCategoryFilter);
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  return (
    <Select value={active} onValueChange={setFilter} disabled={categoriesQuery.isPending}>
      <SelectTrigger className="w-48" aria-label="Filtro de categoría">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
