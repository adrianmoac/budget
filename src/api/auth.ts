import { AppError } from './errors';
import { supabase } from './supabaseClient';

/** Minimal session shape the app needs; avoids leaking supabase-js types upward. */
export interface AuthSession {
  userId: string;
  email: string | null;
}

export async function getSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw AppError.fromUnknown(error);
  const s = data.session;
  return s ? { userId: s.user.id, email: s.user.email ?? null } : null;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase returns a generic "Invalid login credentials" message.
    throw new AppError('invalid_credentials', 'Correo o contraseña incorrectos');
  }
  return { userId: data.user.id, email: data.user.email ?? null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw AppError.fromUnknown(error);
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function onAuthStateChange(cb: (session: AuthSession | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session ? { userId: session.user.id, email: session.user.email ?? null } : null);
  });
  return () => data.subscription.unsubscribe();
}
