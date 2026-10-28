import * as Crypto from 'expo-crypto';

import { supabase } from '@/lib/supabase';
import type { LoggedSet, SessionExercise, WorkoutSession } from '@/features/logging/types';

/**
 * Session logging reads and writes (Epic 7).
 *
 * **Every id here is generated on the client**, never by the database. The
 * schema deliberately has no `gen_random_uuid()` default on `sessions`,
 * `session_exercises` or `sets`, so an omitted id fails loudly rather than the
 * server quietly minting one. That is what makes offline logging possible
 * (Epic 8): a row written with no connection already has its final identity,
 * so syncing later is an insert, not a reconciliation.
 */

/** Client-generated UUID. The only id source for logging tables. */
export function newId(): string {
  return Crypto.randomUUID();
}

const SESSION_SELECT = `
  id, plan_id, created_by, name, status, performed_at, created_at,
  session_exercises (
    id, exercise_id, position,
    prescribed_sets, prescribed_reps, prescribed_load, prescribed_notes,
    exercises ( name, slug ),
    sets ( id, set_number, weight, reps, rpe, logged_at )
  )
` as const;

type RawSession = {
  id: string;
  plan_id: string | null;
  created_by: WorkoutSession['createdBy'];
  name: string | null;
  status: WorkoutSession['status'];
  performed_at: string | null;
  created_at: string;
  session_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    prescribed_sets: number | null;
    prescribed_reps: number | null;
    prescribed_load: number | null;
    prescribed_notes: string | null;
    exercises: { name: string; slug: string } | null;
    sets: {
      id: string;
      set_number: number;
      weight: number;
      reps: number;
      rpe: number | null;
      logged_at: string;
    }[];
  }[];
};

function toSession(raw: RawSession): WorkoutSession {
  return {
    id: raw.id,
    planId: raw.plan_id,
    createdBy: raw.created_by,
    name: raw.name,
    status: raw.status,
    performedAt: raw.performed_at,
    createdAt: raw.created_at,
    exercises: raw.session_exercises
      .map<SessionExercise>((row) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        exerciseName: row.exercises?.name ?? 'Unknown exercise',
        exerciseSlug: row.exercises?.slug ?? '',
        position: row.position,
        prescribedSets: row.prescribed_sets,
        prescribedReps: row.prescribed_reps,
        prescribedLoad: row.prescribed_load,
        prescribedNotes: row.prescribed_notes,
        sets: row.sets
          .map<LoggedSet>((set) => ({
            id: set.id,
            setNumber: set.set_number,
            weight: Number(set.weight),
            reps: set.reps,
            rpe: set.rpe === null ? null : Number(set.rpe),
            loggedAt: set.logged_at,
          }))
          .sort((a, b) => a.setNumber - b.setNumber),
      }))
      // Ordering is app-enforced: no unique constraint on position, because
      // reordering against a non-deferrable one requires awkward shuffling.
      .sort((a, b) => a.position - b.position),
  };
}

/** One session with its exercises and logged sets. */
export async function fetchSession(sessionId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the session: ${error.message}`);
  }
  return data ? toSession(data as unknown as RawSession) : null;
}

/**
 * Completed sessions, newest first (task 7.6).
 *
 * `performed_at` falls back to `created_at` for ordering, because a prescribed
 * session is created by the AI before it is performed and carries no
 * `performed_at` until the user trains it.
 */
export async function fetchSessionHistory(limit = 50): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .eq('status', 'completed')
    .order('performed_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not load your history: ${error.message}`);
  }
  return (data as unknown as RawSession[]).map(toSession);
}

/**
 * An unfinished session, if one exists (task 8.4's resume, used here so a
 * closed app does not strand a workout).
 */
export async function fetchInProgressSession(): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not check for an unfinished session: ${error.message}`);
  }
  return data ? toSession(data as unknown as RawSession) : null;
}

/**
 * Starts an ad-hoc session (task 7.2).
 *
 * `created_by` is always 'user' here — the RLS insert policy enforces it too,
 * so a client cannot pass off a hand-built workout as Nash-generated.
 */
export async function startAdHocSession(name: string | null): Promise<string> {
  const id = newId();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { error } = await supabase.from('sessions').insert({
    id,
    user_id: userId!,
    created_by: 'user',
    name,
    status: 'in_progress',
  });

  if (error) {
    throw new Error(`Could not start the session: ${error.message}`);
  }
  return id;
}

/** Adds an exercise to a session (tasks 7.2, 7.4). */
export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  position: number,
): Promise<string> {
  const id = newId();

  const { error } = await supabase.from('session_exercises').insert({
    id,
    session_id: sessionId,
    exercise_id: exerciseId,
    position,
    // Explicitly null: an ad-hoc session has no prescription, and leaving
    // these unset is what keeps prescribed and actual distinguishable.
    prescribed_sets: null,
    prescribed_reps: null,
    prescribed_load: null,
    prescribed_notes: null,
  });

  if (error) {
    throw new Error(`Could not add the exercise: ${error.message}`);
  }
  return id;
}

export async function removeExerciseFromSession(sessionExerciseId: string): Promise<void> {
  // Logged sets cascade with it — deliberate, since removing an exercise you
  // did not do should not leave its sets orphaned in your history.
  const { error } = await supabase.from('session_exercises').delete().eq('id', sessionExerciseId);

  if (error) {
    throw new Error(`Could not remove the exercise: ${error.message}`);
  }
}

/** Persists a reordering (task 7.4). */
export async function reorderSessionExercises(orderedIds: string[]): Promise<void> {
  // Sequential rather than a single statement: PostgREST has no multi-row
  // update-with-different-values, and the lists here are a handful of rows.
  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from('session_exercises')
      .update({ position: index + 1 })
      .eq('id', id);

    if (error) {
      throw new Error(`Could not reorder the exercises: ${error.message}`);
    }
  }
}

/** Logs one actual set (tasks 7.1, 7.2, 7.3). */
export async function logSet(params: {
  sessionExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
}): Promise<string> {
  const id = newId();

  const { error } = await supabase.from('sets').insert({
    id,
    session_exercise_id: params.sessionExerciseId,
    set_number: params.setNumber,
    // Stored as entered. No conversion — the user's unit is locked once the
    // first set lands (task 7.8).
    weight: params.weight,
    reps: params.reps,
    rpe: params.rpe ?? null,
  });

  if (error) {
    throw new Error(`Could not log the set: ${error.message}`);
  }
  return id;
}

export async function deleteSet(setId: string): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', setId);
  if (error) {
    throw new Error(`Could not delete the set: ${error.message}`);
  }
}

/** Marks a session complete and stamps when it happened (task 7.5). */
export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'completed',
      // Set on completion rather than creation: a prescribed session exists
      // before it is performed, and `performed_at` means the workout, not the
      // row.
      performed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Could not save the session: ${error.message}`);
  }
}

/**
 * Every logged set for one exercise, across all sessions (task 7.7).
 *
 * Ordered oldest first, which is the direction a progress view reads.
 */
export async function fetchExerciseProgress(
  exerciseId: string,
): Promise<{ sessionId: string; performedAt: string | null; sets: LoggedSet[] }[]> {
  const { data, error } = await supabase
    .from('session_exercises')
    .select(
      `id, session_id,
       sessions!inner ( performed_at, status ),
       sets ( id, set_number, weight, reps, rpe, logged_at )`,
    )
    .eq('exercise_id', exerciseId)
    .eq('sessions.status', 'completed');

  if (error) {
    throw new Error(`Could not load your progress: ${error.message}`);
  }

  type ProgressRow = {
    session_id: string;
    sessions: { performed_at: string | null } | null;
    sets: {
      id: string;
      set_number: number;
      weight: number;
      reps: number;
      rpe: number | null;
      logged_at: string;
    }[];
  };

  return (data as unknown as ProgressRow[])
    .filter((row) => row.sets.length > 0)
    .map((row) => ({
      sessionId: row.session_id,
      performedAt: row.sessions?.performed_at ?? null,
      sets: row.sets
        .map<LoggedSet>((set) => ({
          id: set.id,
          setNumber: set.set_number,
          weight: Number(set.weight),
          reps: set.reps,
          rpe: set.rpe === null ? null : Number(set.rpe),
          loggedAt: set.logged_at,
        }))
        .sort((a, b) => a.setNumber - b.setNumber),
    }))
    .sort((a, b) => (a.performedAt ?? '').localeCompare(b.performedAt ?? ''));
}
