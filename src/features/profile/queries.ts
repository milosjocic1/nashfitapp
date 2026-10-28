import { supabase } from '@/lib/supabase';
import type { PlanInputs, Profile, UnitPreference } from '@/features/profile/types';

/**
 * Reads and writes the signed-in user's profile row (tasks 5.1, 5.3, 5.4).
 *
 * RLS scopes every one of these to the caller's own row, so none of them take
 * a user id — passing one would be both redundant and a way to introduce a bug
 * where the client thinks it can address someone else's profile.
 */

const COLUMNS =
  'id, display_name, age, experience_level, sex, training_days_per_week, unit_preference';

type Row = {
  id: string;
  display_name: string | null;
  age: number | null;
  experience_level: Profile['experienceLevel'];
  sex: Profile['sex'];
  training_days_per_week: number | null;
  unit_preference: UnitPreference;
};

function toProfile(row: Row): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    age: row.age,
    experienceLevel: row.experience_level,
    sex: row.sex,
    trainingDaysPerWeek: row.training_days_per_week,
    unitPreference: row.unit_preference,
  };
}

/**
 * The caller's profile.
 *
 * Returns null if the row does not exist yet — which should not happen, since
 * the `handle_new_user` trigger creates it on sign-up, but a null is easier to
 * recover from than a thrown error if that trigger ever fails.
 */
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('users').select(COLUMNS).maybeSingle();

  if (error) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }

  return data ? toProfile(data as Row) : null;
}

/**
 * Saves the four plan inputs (task 5.1), and on a later edit, re-onboarding
 * (task 5.4).
 *
 * Writes all four together rather than one per step: a half-saved profile is a
 * state nothing else in the app understands, and `isOnboardingComplete` would
 * report true the moment the last field happened to land.
 *
 * Note what this does NOT touch: `unit_preference`. Plan inputs and
 * preferences are written by separate functions so a change to one can never
 * accidentally carry the other.
 */
export async function savePlanInputs(inputs: PlanInputs): Promise<Profile> {
  const { data, error } = await supabase
    .from('users')
    .update({
      age: inputs.age,
      experience_level: inputs.experienceLevel,
      sex: inputs.sex,
      training_days_per_week: inputs.trainingDaysPerWeek,
    })
    // RLS limits this to the caller's row, but PostgREST needs a filter to
    // issue an UPDATE at all.
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .select(COLUMNS)
    .single();

  if (error) {
    // The database CHECK constraints mirror the client validation, so this
    // catches anything that slipped past it — a stale build, say.
    throw new Error(`Could not save your details: ${error.message}`);
  }

  return toProfile(data as Row);
}

/**
 * Whether the user has logged any set (task 7.8).
 *
 * Calls a `security definer` function rather than counting rows client-side:
 * the answer needs no data, only a boolean, and this keeps the query scoped
 * server-side.
 */
export async function hasLoggedSets(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_logged_sets');
  if (error) {
    // Fail closed: if we cannot tell, assume locked. Wrongly allowing a change
    // silently rewrites the meaning of every past set; wrongly blocking one is
    // merely annoying and recoverable.
    return true;
  }
  return data === true;
}

/**
 * Saves a display-only preference (task 5.3).
 *
 * Deliberately separate from `savePlanInputs`. The data model is explicit that
 * unit preference "must never trigger regeneration", and the cleanest way to
 * guarantee that is for the write path not to touch plan inputs at all.
 */
export async function saveUnitPreference(unit: UnitPreference): Promise<Profile> {
  const { data, error } = await supabase
    .from('users')
    .update({ unit_preference: unit })
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .select(COLUMNS)
    .single();

  if (error) {
    throw new Error(`Could not save your preference: ${error.message}`);
  }

  return toProfile(data as Row);
}
