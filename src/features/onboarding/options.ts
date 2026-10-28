import type { ExperienceLevel, Sex } from '@/features/profile/types';

/**
 * The onboarding vocabulary (tasks 5.1, 5.2, 5.5).
 *
 * Everything here traces to docs/nashfit-user-info-gathering-template.md. Only
 * four things are asked, and each exists because a rule in Nash's Principles
 * Document keys off it — the template's design rule is that a question which
 * does not change a rule does not belong.
 *
 * Deliberately NOT asked: goal (the plan follows Nash's default objective — a
 * brand stance), equipment, injuries and training history.
 */

/**
 * Experience bands with the helper text task 5.2 requires.
 *
 * The template is explicit that people misjudge their own level, and that the
 * bands must match the ones the Principles Document uses — otherwise the input
 * does not map cleanly onto the rules it feeds.
 */
export const EXPERIENCE_OPTIONS: {
  value: ExperienceLevel;
  label: string;
  helper: string;
}[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    helper: 'Under a year of consistent training, or returning after a long break.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    helper: 'One to three years training consistently. Comfortable with the main lifts.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    helper: 'Three or more years of consistent, structured training.',
  },
];

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

/**
 * Training days per week.
 *
 * The template is firm that only values the Principles Document has rules for
 * should be offered: "If Nash doesn't support 2-day or 7-day, don't offer
 * them." 3–6 is what the template lists, and the database CHECK constraint
 * mirrors it.
 *
 * **Revisit when the Principles Document exists** — it is the authority, and
 * this list currently reflects the template's assumption rather than his
 * actual split table.
 */
export const TRAINING_DAY_OPTIONS = [3, 4, 5, 6] as const;

/** From the template's "sensible range"; the DB CHECK constraint matches. */
export const MIN_AGE = 16;
export const MAX_AGE = 90;

export function validateAge(raw: string): { value?: number; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: 'Enter your age.' };
  }
  // Reject anything non-numeric rather than letting parseInt salvage "32kg".
  if (!/^\d+$/.test(trimmed)) {
    return { error: 'Enter your age in years.' };
  }

  const value = Number(trimmed);
  if (value < MIN_AGE || value > MAX_AGE) {
    return { error: `Age must be between ${MIN_AGE} and ${MAX_AGE}.` };
  }

  return { value };
}
