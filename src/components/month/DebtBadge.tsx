import { CreditCard } from 'lucide-react';

/** Names the debt a debt-category expense pays, in the month view (FR-12). */
export function DebtBadge({ debtName }: { debtName: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      <CreditCard className="h-3 w-3" />
      {debtName}
    </span>
  );
}
