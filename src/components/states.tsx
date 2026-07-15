import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground"
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p>{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
      <Inbox className="h-6 w-6" />
      <p>{title}</p>
      {action}
    </div>
  );
}
