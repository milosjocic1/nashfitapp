import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

export type ExperienceLevel = Enums['experience_level'];
export type Sex = Enums['sex'];
export type UnitPreference = Enums['unit_preference'];

/**
 * The user's profile row (tasks 5.1–5.3).
 *
 * The split below is the whole point of this module and is enforced by the
 * data model, the onboarding template and CLAUDE.md alike:
 *
 *   PLAN INPUTS   age, experienceLevel, sex, trainingDaysPerWeek
 *                 → drive plan generation. Changing one means a new plan.
 *
 *   PREFERENCES   unitPreference (and anything added later)
 *                 → display only. Changing one must NEVER regenerate a plan.
 *
 * Mixing them is the specific failure the docs warn about: a user switching
 * kg to lb should not silently get a different training programme.
 */
export type Profile = {
  id: string;
  displayName: string | null;

  // Plan inputs — nullable until onboarding completes.
  age: number | null;
  experienceLevel: ExperienceLevel | null;
  sex: Sex | null;
  trainingDaysPerWeek: number | null;

  // Preference — always set, defaults to 'kg' in the schema.
  unitPreference: UnitPreference;
};

/** The four plan inputs, once all are known. */
export type PlanInputs = {
  age: number;
  experienceLevel: ExperienceLevel;
  sex: Sex;
  trainingDaysPerWeek: number;
};

/**
 * Onboarding is complete when all four plan inputs are present.
 *
 * Derived rather than stored as a flag: a separate boolean can disagree with
 * the data it describes, and then nothing tells you which is right.
 */
export function isOnboardingComplete(profile: Profile | null): boolean {
  return (
    !!profile &&
    profile.age !== null &&
    profile.experienceLevel !== null &&
    profile.sex !== null &&
    profile.trainingDaysPerWeek !== null
  );
}

/** Narrows a completed profile to its plan inputs, or null if incomplete. */
export function toPlanInputs(profile: Profile | null): PlanInputs | null {
  if (!isOnboardingComplete(profile) || !profile) {
    return null;
  }
  return {
    age: profile.age!,
    experienceLevel: profile.experienceLevel!,
    sex: profile.sex!,
    trainingDaysPerWeek: profile.trainingDaysPerWeek!,
  };
}
