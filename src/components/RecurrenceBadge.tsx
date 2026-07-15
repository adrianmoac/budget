import type { Recurrence } from '@/domain/types';
import { cn } from '@/lib/utils';

/** Small facet badge for the recurrent/variable label (FR-7, §7.6). */
export function RecurrenceBadge({ recurrence }: { recurrence: Recurrence }) {
  const isRecurrent = recurrence === 'recurrent';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        isRecurrent
          ? 'bg-secondary text-secondary-foreground'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {isRecurrent ? 'Recurrente' : 'Variable'}
    </span>
  );
}
