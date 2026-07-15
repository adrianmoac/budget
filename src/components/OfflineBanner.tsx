import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Online-only app: surface a persistent banner when the network drops so users
 * understand why data operations fail (architecture §15, spec §4).
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
    >
      <WifiOff className="h-4 w-4" />
      Sin conexión — se requiere internet
    </div>
  );
}
