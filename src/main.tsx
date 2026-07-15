import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { AppProviders } from '@/app/AppProviders';
import '@/index.css';

// Register the service worker (precache app shell; NetworkOnly for Supabase API).
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
