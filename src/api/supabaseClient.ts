import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * The single supabase-js client. This is the ONLY module allowed to import
 * `@supabase/supabase-js` (enforced by ESLint `no-restricted-imports`); every
 * other layer talks to Supabase through the typed `api/` wrappers.
 *
 * Config validation fails fast (security-standards: "fail fast on missing
 * required values"). Only the public `anon` key ships to the browser — RLS is
 * the guard; the `service_role` key must never appear here.
 *
 * Session storage: Phase 0 uses supabase-js default persistence for a pure
 * static SPA (see docs — the httpOnly-cookie requirement is a Phase 7 hardening
 * item that requires host edge middleware, deferred by decision).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
