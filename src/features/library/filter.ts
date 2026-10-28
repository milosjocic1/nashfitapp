import type { ExerciseSummary } from '@/features/library/types';

/**
 * Filtering and search for the library (tasks 3.5, 3.6, 3.7).
 *
 * Pure functions over the cached list rather than server queries, for two
 * reasons: the whole catalogue is small enough to hold in memory, and
 * filtering must keep working on a gym connection that has dropped. A filter
 * that needs the network is a filter that fails exactly when it is needed.
 */

export type LibraryFilters = {
  /** Muscle group slug, or null for all. */
  muscleGroup: string | null;
  /** Equipment slug, or null for all. */
  equipment: string | null;
  /** Free-text search over the exercise name. */
  search: string;
};

export const EMPTY_FILTERS: LibraryFilters = {
  muscleGroup: null,
  equipment: null,
  search: '',
};

/**
 * Normalises for comparison: lower-cased, accents stripped, collapsed spaces.
 *
 * Accent stripping matters for a European audience typing on a phone keyboard
 * where "Scott" and "Scött" should both match.
 */
function normalise(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Matches an exercise against a muscle group.
 *
 * Matches **primary and secondary** roles deliberately. Someone filtering to
 * "Biceps" wants everything that trains biceps, and rows are labelled with
 * their primary group so the distinction stays visible.
 */
function matchesMuscleGroup(exercise: ExerciseSummary, slug: string): boolean {
  return exercise.muscleGroups.some((group) => group.slug === slug);
}

function matchesEquipment(exercise: ExerciseSummary, slug: string): boolean {
  return exercise.equipment.some((item) => item.slug === slug);
}

/**
 * Search is over the name only.
 *
 * Not the description: those currently say "Also performed with a barbell",
 * so searching "barbell" would return machine exercises whose text merely
 * mentions one — surprising, and wrong.
 */
function matchesSearch(exercise: ExerciseSummary, query: string): boolean {
  return normalise(exercise.name).includes(query);
}

/**
 * Applies all three filters. They combine with AND: chest + dumbbell returns
 * only chest exercises using dumbbells.
 */
export function applyFilters(
  exercises: ExerciseSummary[],
  filters: LibraryFilters,
): ExerciseSummary[] {
  const query = normalise(filters.search);

  return exercises.filter((exercise) => {
    if (filters.muscleGroup && !matchesMuscleGroup(exercise, filters.muscleGroup)) {
      return false;
    }
    if (filters.equipment && !matchesEquipment(exercise, filters.equipment)) {
      return false;
    }
    if (query && !matchesSearch(exercise, query)) {
      return false;
    }
    return true;
  });
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return !!filters.muscleGroup || !!filters.equipment || filters.search.trim().length > 0;
}

/**
 * Counts how many exercises each muscle group would yield under the *other*
 * active filters.
 *
 * Lets the filter UI dim options that would return nothing, so a user does not
 * tap "Calves" with a dumbbell filter active and get an empty screen with no
 * explanation.
 */
export function countsByMuscleGroup(
  exercises: ExerciseSummary[],
  filters: LibraryFilters,
): Record<string, number> {
  const withoutMuscleFilter = applyFilters(exercises, { ...filters, muscleGroup: null });
  const counts: Record<string, number> = {};

  for (const exercise of withoutMuscleFilter) {
    for (const group of exercise.muscleGroups) {
      counts[group.slug] = (counts[group.slug] ?? 0) + 1;
    }
  }

  return counts;
}

export function countsByEquipment(
  exercises: ExerciseSummary[],
  filters: LibraryFilters,
): Record<string, number> {
  const withoutEquipmentFilter = applyFilters(exercises, { ...filters, equipment: null });
  const counts: Record<string, number> = {};

  for (const exercise of withoutEquipmentFilter) {
    for (const item of exercise.equipment) {
      counts[item.slug] = (counts[item.slug] ?? 0) + 1;
    }
  }

  return counts;
}
