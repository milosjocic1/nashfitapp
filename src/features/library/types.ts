import type { Database } from '@/types/database';

/**
 * Shapes the exercise library is consumed in (task 3.3).
 *
 * Derived from the generated `Database` type rather than hand-written, so a
 * migration that renames a column breaks the build instead of producing
 * `undefined` on a screen.
 */

type Tables = Database['public']['Tables'];
export type MuscleGroupRole = Database['public']['Enums']['muscle_group_role'];

/**
 * `slug` is nullable on the reference tables — the data model calls it
 * optional there — but every row is seeded with one, and the mappers in
 * queries.ts normalise a missing slug to ''. These types state that guarantee
 * so callers (filtering, routing) don't each have to re-handle a null that
 * cannot reach them.
 */
export type MuscleGroupRef = Pick<Tables['muscle_groups']['Row'], 'id' | 'name'> & {
  slug: string;
};
export type EquipmentRef = Pick<Tables['equipment']['Row'], 'id' | 'name'> & { slug: string };

export type MuscleGroupLink = MuscleGroupRef & { role: MuscleGroupRole };

/**
 * What the browse list (3.4) and the filters (3.5, 3.6) need.
 *
 * Muscle groups and equipment are included rather than fetched per row,
 * because filtering happens on the cached list on-device — a filter that round
 * trips to the server would be useless in a gym with no signal, and the whole
 * library is small enough to hold in memory.
 */
export type ExerciseSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  movementPattern: string | null;
  muscleGroups: MuscleGroupLink[];
  equipment: EquipmentRef[];
};

/**
 * Adds the coaching content, which only the detail screen (4.3) shows.
 *
 * Kept separate from the summary so the cached list stays small: cues and
 * common mistakes are the bulk of an exercise's bytes and are never needed
 * while browsing.
 */
export type ExerciseDetail = ExerciseSummary & {
  formCues: string[];
  commonMistakes: string[];
};

/** Convenience: the primary muscle group, which is what a list row labels. */
export function primaryMuscleGroup(exercise: ExerciseSummary): MuscleGroupRef | undefined {
  return exercise.muscleGroups.find((group) => group.role === 'primary');
}
