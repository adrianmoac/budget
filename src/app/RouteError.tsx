import { useRouteError } from 'react-router-dom';
import { AppError } from '@/api/errors';
import { Button } from '@/components/ui/button';

/** Route-level error boundary (spec §10.5). Maps errors to a friendly message. */
export function RouteError() {
  const error = useRouteError();
  const message = AppError.fromUnknown(error).userMessage;
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button onClick={() => window.location.reload()}>Recargar</Button>
    </div>
  );
}
