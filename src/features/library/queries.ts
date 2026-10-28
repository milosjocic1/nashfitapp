import { supabase } from '@/lib/supabase';
import type { ExerciseDetail, ExerciseSummary, MuscleGroupRole } from '@/features/library/types';

/**
 * Supabase queries for the exercise library (task 3.3).
 *
 * All of these require an authenticated session. Content tables grant SELECT
 * to `authenticated` only — `anon` has no privileges at all, per the PRD's
 * hard paywall. A signed-out caller gets a permission error, not an empty list.
 */

/**
 * Joins muscle groups and equipment in one round trip. Three separate queries
 * stitched together on the client would be slower and could tear if content
 * changed between them.
 */
const SUMMARY_SELECT = `
  id, name, slug, description, movement_pattern,
  exercise_muscle_groups ( role, muscle_groups ( id, name, slug ) ),
  exercise_equipment ( equipment ( id, name, slug ) )
` as const;

const DETAIL_SELECT = `${SUMMARY_SELECT}, form_cues, common_mistakes` as const;

/** The nested shape PostgREST returns, before flattening. */
type RawExercise = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  movement_pattern: string | null;
  exercise_muscle_groups: {
    role: MuscleGroupRole;
    muscle_groups: { id: string; name: string; slug: string | null } | null;
  }[];
  exercise_equipment: {
    equipment: { id: string; name: string; slug: string | null } | null;
  }[];
};

/**
 * Flattens PostgREST's nested join output into the flat shape screens consume.
 *
 * The `| null` on each joined row is PostgREST being cautious about its own
 * join semantics; the foreign keys are NOT NULL so it cannot actually happen.
 * Filtering rather than asserting keeps a malformed response from crashing a
 * screen.
 */
function toSummary(raw: RawExercise): ExerciseSummary {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    movementPattern: raw.movement_pattern,
    muscleGroups: raw.exercise_muscle_groups
      .filter((link) => link.muscle_groups !== null)
      .map((link) => ({
        id: link.muscle_groups!.id,
        name: link.muscle_groups!.name,
        slug: link.muscle_groups!.slug ?? '',
        role: link.role,
      }))
      // Primary first, so a list row can label itself without searching.
      .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1)),
    equipment: raw.exercise_equipment
      .filter((link) => link.equipment !== null)
      .map((link) => ({
        id: link.equipment!.id,
        name: link.equipment!.name,
        slug: link.equipment!.slug ?? '',
      })),
  };
}

/** Normalises a JSONB column that should hold an array of strings. */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * Every exercise, ordered by muscle group then name.
 *
 * The whole library is fetched at once rather than paged: it is around 36 rows
 * and is cached on-device for offline browse, so paging would add complexity
 * and remove the ability to filter without a connection.
 */
export async function fetchExercises(): Promise<ExerciseSummary[]> {
  const { data, error } = await supabase.from('exercises').select(SUMMARY_SELECT).order('name');

  if (error) {
    throw new Error(`Could not load exercises: ${error.message}`);
  }

  return (data as unknown as RawExercise[]).map(toSummary);
}

/**
 * One exercise with its coaching content, by slug.
 *
 * Slug rather than id because it is the stable, human-readable key the data
 * model intends for lookup and deep links.
 */
export async function fetchExerciseBySlug(slug: string): Promise<ExerciseDetail | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load exercise: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const raw = data as unknown as RawExercise & { form_cues: unknown; common_mistakes: unknown };

  return {
    ...toSummary(raw),
    formCues: toStringArray(raw.form_cues),
    commonMistakes: toStringArray(raw.common_mistakes),
  };
}

/**
 * The filter vocabularies (tasks 3.5, 3.6), in Nash's display order.
 *
 * Read from the database rather than hardcoded so adding a muscle group is a
 * migration, not an app release.
 */
export async function fetchFilterVocabularies() {
  const [muscleGroups, equipment] = await Promise.all([
    supabase.from('muscle_groups').select('id, name, slug').order('display_order'),
    supabase.from('equipment').select('id, name, slug').order('display_order'),
  ]);

  if (muscleGroups.error) {
    throw new Error(`Could not load muscle groups: ${muscleGroups.error.message}`);
  }
  if (equipment.error) {
    throw new Error(`Could not load equipment: ${equipment.error.message}`);
  }

  return {
    muscleGroups: muscleGroups.data.map((g) => ({ ...g, slug: g.slug ?? '' })),
    equipment: equipment.data.map((e) => ({ ...e, slug: e.slug ?? '' })),
  };
}
