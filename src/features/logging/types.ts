import type { Database } from '@/types/database';

/**
 * Session logging (Epic 7).
 *
 * The central distinction, which the data model and CLAUDE.md both insist on:
 *
 *   PRESCRIBED  what the AI, applying Nash's rules, told you to do.
 *               Lives on `session_exercises.prescribed_*`. Null for ad-hoc.
 *
 *   ACTUAL      what you did. Lives in `sets`.
 *
 * They are never merged into one value. A session can carry both, and the gap
 * between them is the signal the closed adaptive loop will eventually read.
 */

type Enums = Database['public']['Enums'];

export type SessionStatus = Enums['session_status'];
export type SessionCreator = Enums['session_creator'];

/** One logged set — actual performance. */
export type LoggedSet = {
  id: string;
  setNumber: number;
  /** Stored exactly as entered, in the user's unit. Never converted. */
  weight: number;
  reps: number;
  /** Optional (task 7.3). */
  rpe: number | null;
  loggedAt: string;
};

/** An exercise within a session, carrying both sides of the split. */
export type SessionExercise = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  position: number;

  /** Written by the AI. All null for an ad-hoc session. */
  prescribedSets: number | null;
  prescribedReps: number | null;
  prescribedLoad: number | null;
  prescribedNotes: string | null;

  /** What the user actually did. */
  sets: LoggedSet[];
};

export type WorkoutSession = {
  id: string;
  planId: string | null;
  /** 'agent' means AI-prescribed, 'user' means assembled by hand. */
  createdBy: SessionCreator;
  name: string | null;
  status: SessionStatus;
  performedAt: string | null;
  createdAt: string;
  exercises: SessionExercise[];
};

/** True when the AI prescribed this session rather than the user building it. */
export function isPrescribed(session: WorkoutSession): boolean {
  return session.createdBy === 'agent';
}

/**
 * Whether an exercise carries a prescription to log against.
 *
 * Checked per exercise rather than per session: the data model allows a
 * prescribed session to contain an exercise without targets, and the logging
 * UI should show the prescription only where one exists rather than rendering
 * "— × —".
 */
export function hasPrescription(exercise: SessionExercise): boolean {
  return exercise.prescribedSets !== null || exercise.prescribedReps !== null;
}

/** Total sets logged across a session — used by history rows. */
export function totalSets(session: WorkoutSession): number {
  return session.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);
}

/**
 * Formats a prescription as Nash would write it: "3 × 8 @ 80".
 *
 * The unit is deliberately omitted — callers append the user's own, since
 * weights are stored unconverted and the display unit is theirs.
 */
export function formatPrescription(exercise: SessionExercise): string | null {
  if (!hasPrescription(exercise)) {
    return null;
  }
  const sets = exercise.prescribedSets ?? '—';
  const reps = exercise.prescribedReps ?? '—';
  const load = exercise.prescribedLoad;
  return load !== null ? `${sets} × ${reps} @ ${load}` : `${sets} × ${reps}`;
}
