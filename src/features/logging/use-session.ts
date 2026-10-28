import { useCallback, useEffect, useState } from 'react';

import {
  addExerciseToSession,
  completeSession,
  deleteSet,
  fetchSession,
  logSet,
  removeExerciseFromSession,
  reorderSessionExercises,
} from '@/features/logging/queries';
import type { WorkoutSession } from '@/features/logging/types';

/**
 * Drives one in-progress session (tasks 7.1–7.5).
 *
 * Every mutation refetches the whole session rather than patching local state.
 * The session is a handful of rows and a workout is not latency-sensitive
 * between sets, so the simpler model wins: there is exactly one source of
 * truth and no chance of the screen and the database disagreeing about how
 * many sets were logged — which is the kind of drift someone only notices
 * after their workout is over.
 *
 * Epic 8 replaces this with a local-first store; the interface is shaped so
 * that swap does not reach the screens.
 */

type SessionState = {
  session: WorkoutSession | null;
  loading: boolean;
  error: string | null;
  /** True while a mutation is in flight — used to disable controls. */
  busy: boolean;
  logSet: (params: {
    sessionExerciseId: string;
    setNumber: number;
    weight: number;
    reps: number;
    rpe?: number | null;
  }) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  addExercise: (exerciseId: string) => Promise<void>;
  removeExercise: (sessionExerciseId: string) => Promise<void>;
  reorderExercises: (orderedIds: string[]) => Promise<void>;
  finish: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useSession(sessionId: string | null): SessionState {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      setSession(await fetchSession(sessionId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!sessionId) {
        if (active) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
      const next = await fetchSession(sessionId).catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load the session.');
        }
        return null;
      });
      if (active) {
        setSession(next);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  /**
   * Wraps a mutation: run it, refetch, surface any failure.
   *
   * Errors are surfaced rather than swallowed — a set the user believes they
   * logged but which never landed is the worst outcome in this whole feature.
   */
  const mutate = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await action();
        await load();
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  return {
    session,
    loading,
    error,
    busy,
    logSet: (params) => mutate(() => logSet(params)),
    deleteSet: (setId) => mutate(() => deleteSet(setId)),
    addExercise: (exerciseId) =>
      mutate(() => {
        if (!sessionId) {
          throw new Error('No active session.');
        }
        // Appended at the end; reordering is a separate action (task 7.4).
        const position = (session?.exercises.length ?? 0) + 1;
        return addExerciseToSession(sessionId, exerciseId, position);
      }),
    removeExercise: (id) => mutate(() => removeExerciseFromSession(id)),
    reorderExercises: (orderedIds) => mutate(() => reorderSessionExercises(orderedIds)),
    finish: () =>
      mutate(() => {
        if (!sessionId) {
          throw new Error('No active session.');
        }
        return completeSession(sessionId);
      }),
    refresh: load,
  };
}
