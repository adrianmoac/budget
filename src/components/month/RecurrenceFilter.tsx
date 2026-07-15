import { Button } from '@/components/ui/button';
import { useUiStore, type RecurrenceFilter as Filter } from '@/store/ui';

const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'recurrent', label: 'Recurrentes' },
  { value: 'variable', label: 'Variables' },
];

/** Facet filter for the month tables (spec §4.3). */
export function RecurrenceFilter() {
  const active = useUiStore((s) => s.recurrenceFilter);
  const setFilter = useUiStore((s) => s.setRecurrenceFilter);

  return (
    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Filtro de frecuencia">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={active === o.value ? 'secondary' : 'ghost'}
          onClick={() => setFilter(o.value)}
          aria-pressed={active === o.value}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
