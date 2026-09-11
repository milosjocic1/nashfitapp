import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { identifyUser, resetUser } from '@/lib/analytics';
import { clearMonitoringUser, setMonitoringUser } from '@/lib/monitoring';
import { supabase } from '@/lib/supabase';

/**
 * Auth state for the whole app (tasks 1.6, 1.7).
 *
 * One subscription to Supabase's auth events, exposed through context, so no
 * screen has to poll or hold its own copy of the session.
 *
 * `initialising` matters for routing: on a cold start, reading the session out
 * of encrypted storage is asynchronous. Until it resolves we genuinely do not
 * know whether the user is signed in, and routing on that unknown is what
 * causes the sign-in screen to flash before the app appears for a user who was
 * already authenticated.
 */

type AuthState = {
  session: Session | null;
  /** True until the stored session has been read. Neither signed in nor out. */
  initialising: boolean;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    let active = true;

    // Restores a session from the encrypted store on cold start (task 1.6).
    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      setSession(data.session);
      setInitialising(false);
    });

    // Covers sign-in, sign-out, token refresh and expiry alike. Identities are
    // set here rather than at the sign-in call site so they stay correct when a
    // session ends without anyone tapping "sign out".
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setInitialising(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      // Only the auth id reaches either service — never email or name.
      identifyUser(userId);
      setMonitoringUser(userId);
    } else {
      resetUser();
      clearMonitoringUser();
    }
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({ session, initialising, isSignedIn: !!session }),
    [session, initialising],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
