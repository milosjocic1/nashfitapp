/**
 * Set-entry validation (tasks 7.1–7.3).
 *
 * Entered one-handed, mid-workout, often on a phone propped against something.
 * The bar for rejecting input is therefore high: better to accept an odd value
 * than to block someone mid-set over a rule that only catches typos. These
 * exist to stop nonsense reaching the database, not to police training.
 */

/** Generous ceiling — well past any real lift, including loaded machines. */
export const MAX_WEIGHT = 1000;
export const MAX_REPS = 200;

/** RPE as Nash's audience uses it: 1–10, half points allowed. */
export const MIN_RPE = 1;
export const MAX_RPE = 10;

export type FieldResult = { value?: number; error?: string };

/**
 * Weight, in whatever unit the user has locked (task 7.8). Never converted.
 *
 * Zero is accepted deliberately: bodyweight exercises are logged as 0, and
 * rejecting it would make pull-ups unloggable.
 */
export function validateWeight(raw: string): FieldResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: 'Enter a weight.' };
  }

  // Decimals allowed — 2.5kg plates and 0.5 increments are normal. A comma is
  // accepted because European keyboards offer it as the decimal separator.
  const normalised = trimmed.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) {
    return { error: 'Enter a number.' };
  }

  const value = Number(normalised);
  if (value > MAX_WEIGHT) {
    return { error: `That looks too high — maximum ${MAX_WEIGHT}.` };
  }

  return { value };
}

export function validateReps(raw: string): FieldResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: 'Enter your reps.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { error: 'Enter a whole number.' };
  }

  const value = Number(trimmed);
  if (value < 1) {
    return { error: 'At least one rep.' };
  }
  if (value > MAX_REPS) {
    return { error: `That looks too high — maximum ${MAX_REPS}.` };
  }

  return { value };
}

/**
 * RPE is optional (task 7.3), so an empty value is valid and yields undefined
 * rather than an error — the caller stores null.
 */
export function validateRpe(raw: string): FieldResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  const normalised = trimmed.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) {
    return { error: 'Enter a number between 1 and 10.' };
  }

  const value = Number(normalised);
  if (value < MIN_RPE || value > MAX_RPE) {
    return { error: `RPE runs from ${MIN_RPE} to ${MAX_RPE}.` };
  }
  // Half points only. 7.25 is not a thing anyone means.
  if (value * 2 !== Math.round(value * 2)) {
    return { error: 'Use whole or half points, e.g. 8 or 8.5.' };
  }

  return { value };
}

/**
 * Suggests what to pre-fill the next set with.
 *
 * Carries the previous set's weight and reps forward, because sets are usually
 * repeated and retyping the same numbers five times is the main friction in
 * logging. Falls back to the prescription on the first set of a prescribed
 * exercise — which is exactly what the AI told the user to do.
 *
 * RPE is deliberately not carried forward: it is a judgement about the set
 * just performed, and pre-filling it invites someone to accept a stale number
 * without thinking.
 */
export function suggestNextSet(params: {
  previousSet?: { weight: number; reps: number };
  prescribedLoad?: number | null;
  prescribedReps?: number | null;
}): { weight: string; reps: string } {
  if (params.previousSet) {
    return {
      weight: String(params.previousSet.weight),
      reps: String(params.previousSet.reps),
    };
  }

  return {
    weight: params.prescribedLoad != null ? String(params.prescribedLoad) : '',
    reps: params.prescribedReps != null ? String(params.prescribedReps) : '',
  };
}
