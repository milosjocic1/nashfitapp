import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EquipmentRef, ExerciseSummary, MuscleGroupRef } from '@/features/library/types';

/**
 * On-device cache for the exercise library (task 3.3).
 *
 * AsyncStorage rather than SQLite: this is a small, read-only, wholesale-
 * replaced blob, not relational data to query. SQLite arrives in Phase 8 for
 * offline *writes*, where the conflict model actually needs it.
 *
 * Not encrypted, deliberately. The library is Nash's catalogue, identical for
 * every subscriber and already on their screen — it is not user data. Auth
 * tokens are the thing that needs encrypting, and they have their own store
 * (src/lib/secure-session-store.ts).
 */

type CachedLibrary = {
  exercises: ExerciseSummary[];
  muscleGroups: MuscleGroupRef[];
  equipment: EquipmentRef[];
  fetchedAt: number;
};

/**
 * Bump the version when the cached *shape* changes. A stale blob in the old
 * shape would otherwise deserialise into fields the screens expect and read as
 * undefined — the key changing makes it a clean miss instead.
 */
const CACHE_KEY = 'nashfit.library.v1';

/**
 * Considered fresh for a day. The catalogue changes when Nash films something,
 * which is not often, so refetching more aggressively would spend a gym user's
 * connection for nothing.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function readCachedLibrary(): Promise<CachedLibrary | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedLibrary;

    // Guard against a truncated or hand-edited blob: a cache is never worth a
    // crash, and a miss just means one fetch.
    if (!Array.isArray(parsed.exercises) || typeof parsed.fetchedAt !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedLibrary(value: Omit<CachedLibrary, 'fetchedAt'>): Promise<void> {
  try {
    const payload: CachedLibrary = { ...value, fetchedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // A failed cache write must not fail the screen — the data is already in
    // memory and the next launch simply refetches.
  }
}

export async function clearCachedLibrary(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing useful to do; the cache self-heals on the next write.
  }
}

export function isStale(cached: CachedLibrary, now: number = Date.now()): boolean {
  return now - cached.fetchedAt > MAX_AGE_MS;
}
