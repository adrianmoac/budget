import * as React from 'react';
import { cn } from '@/lib/utils';

export type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode'
>;

/**
 * Pesos amount input. The UI edge works in pesos; conversion to integer centavos
 * happens on submit via `toCentavos` (money boundary discipline, architecture
 * §6). Displays a leading `$`; value is a decimal number of pesos.
 */
const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden="true"
      >
        $
      </span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };
