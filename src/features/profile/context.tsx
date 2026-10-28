import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/context';
import {
  fetchProfile,
  hasLoggedSets,
  savePlanInputs,
  saveUnitPreference,
} from '@/features/profile/queries';
import {
  isOnboardingComplete,
  type PlanInputs,
  type Profile,
  type UnitPreference,
} from '@/features/profile/types';

/**
 * The signed-in user's profile, app-wide (tasks 5.1–5.4).
 *
 * Routing depends on this: a signed-in user who has not completed onboarding
 * belongs in the onboarding flow, not the app. `loading` therefore matters as
 * much as the data — routing on an unknown profile would flash onboarding at
 * someone who finished it months ago.
 *
 * **State is keyed by user id and derived during render**, rather than cleared
 * from an effect on sign-out. Two reasons: React 19 rejects synchronous
 * setState inside an effect as a cascading render, and more importantly,
 * deriving makes it impossible for one user's profile to be briefly visible to
 * the next person on a shared device — the stale value cannot survive a change
 * of id, because it is never read when the ids disagree.
 */

type LoadedProfile = { userId: string; profile: Profile | null };

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onboardingComplete: boolean;
  /** Saves the four plan inputs. Used by onboarding and re-onboarding. */
  savePlanInputs: (inputs: PlanInputs) => Promise<void>;
  /** Saves a display-only preference. Never affects plan generation. */
  saveUnitPreference: (unit: UnitPreference) => Promise<void>;
  /**
   * True once any set is logged, at which point `unit_preference` is locked
   * (task 7.8). Weights are stored unconverted, so switching units afterwards
   * would silently rewrite the meaning of existing history.
   */
  unitLocked: boolean;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session, initialising: authInitialising } = useAuth();
  const userId = session?.user.id ?? null;

  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Defaults to locked: see hasLoggedSets() for why this fails closed.
  const [unitLocked, setUnitLocked] = useState(true);

  // Derived, not stored: a profile belonging to a different user id is simply
  // not read.
  const matches = !!userId && loaded?.userId === userId;
  const profile = matches ? (loaded?.profile ?? null) : null;
  const loading = authInitialising || (!!userId && !matches);

  const fetchFor = useCallback(async (id: string) => {
    try {
      const next = await fetchProfile();
      setLoaded({ userId: id, profile: next });
      setError(null);
    } catch (caught) {
      // Record the attempt so `loading` resolves; otherwise the app would sit
      // on a blank screen forever after one failed fetch.
      setLoaded({ userId: id, profile: null });
      setError(caught instanceof Error ? caught.message : 'Could not load your profile.');
    }
  }, []);

  useEffect(() => {
    if (authInitialising || !userId || matches) {
      return;
    }

    let active = true;
    (async () => {
      const next = await fetchProfile().catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load your profile.');
        }
        return null;
      });

      const locked = await hasLoggedSets().catch(() => true);

      if (active) {
        setLoaded({ userId, profile: next });
        setUnitLocked(locked);
      }
    })();

    return () => {
      active = false;
    };
  }, [authInitialising, userId, matches]);

  const handleSavePlanInputs = useCallback(
    async (inputs: PlanInputs) => {
      if (!userId) {
        return;
      }
      // The returned row is used directly rather than refetching: it is the
      // authoritative post-write state, and a refetch would let routing
      // briefly see the old, incomplete profile.
      setLoaded({ userId, profile: await savePlanInputs(inputs) });
    },
    [userId],
  );

  const handleSaveUnitPreference = useCallback(
    async (unit: UnitPreference) => {
      if (!userId) {
        return;
      }
      setLoaded({ userId, profile: await saveUnitPreference(unit) });
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (userId) {
      await fetchFor(userId);
    }
  }, [userId, fetchFor]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        onboardingComplete: isOnboardingComplete(profile),
        unitLocked,
        savePlanInputs: handleSavePlanInputs,
        saveUnitPreference: handleSaveUnitPreference,
        refresh,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileState {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return context;
}
