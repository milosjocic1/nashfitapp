import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/lib/env';
import { secureSessionStore } from '@/lib/secure-session-store';
import type { Database } from '@/types/database';

/**
 * The Supabase client (task 1.1).
 *
 * Typed with the generated `Database` type, so every query is checked against
 * the real schema — a renamed column or a wrong enum value is a compile error
 * rather than a runtime surprise. Regenerate with `npm run db:types` after any
 * migration.
 *
 * This client uses the **publishable key** and is subject to Row Level
 * Security. It can only ever see what the policies from task 0.6 allow. The
 * secret key, which bypasses RLS, exists only in Edge Functions.
 */
export const supabase = createClient<Database>(env.supabase.url, env.supabase.publishableKey, {
  auth: {
    // Encrypted at rest — see src/lib/secure-session-store.ts for why this is
    // not simply AsyncStorage or SecureStore.
    storage: secureSessionStore,

    // Keep the user signed in across app launches (task 1.6).
    persistSession: true,
    autoRefreshToken: true,

    // Web-only concern: there is no URL bar to read a session out of, and
    // leaving it on makes the client look for one on every start.
    detectSessionInUrl: false,
  },
});

/**
 * Refresh tokens only while the app is actually in the foreground.
 *
 * Supabase's auto-refresh runs on a timer. Left running in the background it
 * wakes to make network calls the user cannot benefit from, and on a phone in a
 * gym locker that is wasted battery and radio time. Stopping and restarting on
 * foreground gets the same result — a fresh token when the user returns —
 * without the background churn.
 *
 * Call once at app start.
 */
export function startSessionRefreshHandling(): () => void {
  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  return () => subscription.remove();
}
