import { useCallback, useEffect, useState } from 'react';

import { isStale, readCachedLibrary, writeCachedLibrary } from '@/features/library/cache';
import { fetchExercises, fetchFilterVocabularies } from '@/features/library/queries';
import type { EquipmentRef, ExerciseSummary, MuscleGroupRef } from '@/features/library/types';

/**
 * The exercise library, cache-first (task 3.3).
 *
 * Stale-while-revalidate: cached content renders immediately, then a refresh
 * runs in the background and updates in place. The alternative — spinner until
 * the network answers — is exactly wrong for this app, which is used standing
 * in a gym on a weak connection.
 *
 * `error` is only surfaced when there is nothing to show. A failed background
 * refresh over good cached data is not worth interrupting someone mid-workout.
 */

type LibraryState = {
  exercises: ExerciseSummary[];
  muscleGroups: MuscleGroupRef[];
  equipment: EquipmentRef[];
  /** True only while there is nothing to display yet. */
  loading: boolean;
  /** True during a background refresh over existing content. */
  refreshing: boolean;
  /** Set only when loading failed and no cache was available. */
  error: string | null;
  refresh: () => Promise<void>;
};

export function useLibrary(): LibraryState {
  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupRef[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const load = useCallback(async (isBackgroundRefresh: boolean) => {
    if (isBackgroundRefresh) {
      setRefreshing(true);
    }

    try {
      const [fetched, vocabularies] = await Promise.all([
        fetchExercises(),
        fetchFilterVocabularies(),
      ]);

      setExercises(fetched);
      setMuscleGroups(vocabularies.muscleGroups);
      setEquipment(vocabularies.equipment);
      setHasContent(true);
      setError(null);

      await writeCachedLibrary({
        exercises: fetched,
        muscleGroups: vocabularies.muscleGroups,
        equipment: vocabularies.equipment,
      });
    } catch (caught) {
      // Only an error the user can see if we have nothing else to show.
      setError((previous) =>
        isBackgroundRefresh
          ? previous
          : caught instanceof Error
            ? caught.message
            : 'Could not load the exercise library.',
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const cached = await readCachedLibrary();

      if (cached && active) {
        setExercises(cached.exercises);
        setMuscleGroups(cached.muscleGroups);
        setEquipment(cached.equipment);
        setHasContent(true);
        setLoading(false);

        // Fresh cache: skip the network entirely. The catalogue changes when
        // Nash films something, not hourly.
        if (!isStale(cached)) {
          return;
        }
      }

      if (active) {
        await load(!!cached);
      }
    })();

    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(() => load(hasContent), [load, hasContent]);

  return { exercises, muscleGroups, equipment, loading, refreshing, error, refresh };
}
