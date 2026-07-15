import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/store/toast';

const variantClasses: Record<string, string> = {
  default: 'border-border bg-card text-card-foreground',
  success: 'border-success/40 bg-success text-success-foreground',
  error: 'border-destructive/40 bg-destructive text-destructive-foreground',
};

/** Global toast region. Rendered once in AppLayout. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start justify-between gap-3 rounded-md border p-4 shadow-lg',
            variantClasses[t.variant],
          )}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description ? <p className="text-sm opacity-90">{t.description}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="opacity-70 transition-opacity hover:opacity-100"
            aria-label="Cerrar notificación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
