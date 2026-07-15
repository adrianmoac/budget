import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Debt } from '@/domain/types';

interface DebtSelectProps {
  id?: string;
  debts: Debt[];
  value?: string;
  onValueChange: (debtId: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}

/**
 * Shared debt picker (§5). Presentational: the caller supplies the (active) debts.
 * Used by the EntryForm debt branch to choose which debt a payment applies to.
 */
export function DebtSelect({
  id,
  debts,
  value,
  onValueChange,
  disabled,
  invalid,
}: DebtSelectProps) {
  return (
    <Select
      // Omit `value` entirely when unselected so the placeholder shows
      // (exactOptionalPropertyTypes forbids value={undefined}).
      {...(value ? { value } : {})}
      onValueChange={onValueChange}
      disabled={disabled ?? false}
    >
      <SelectTrigger id={id} aria-invalid={invalid}>
        <SelectValue placeholder="Selecciona una deuda" />
      </SelectTrigger>
      <SelectContent>
        {debts.map((debt) => (
          <SelectItem key={debt.id} value={debt.id}>
            {debt.name} · {debt.remaining_months}/{debt.total_months} meses
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
