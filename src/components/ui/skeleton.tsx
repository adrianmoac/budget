import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Loading placeholder. Fixed dimensions avoid layout shift (spec §4 global states). */
function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
