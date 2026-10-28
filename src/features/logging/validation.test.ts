import {
  MAX_REPS,
  MAX_WEIGHT,
  suggestNextSet,
  validateReps,
  validateRpe,
  validateWeight,
} from '@/features/logging/validation';
import {
  formatPrescription,
  hasPrescription,
  totalSets,
  type SessionExercise,
  type WorkoutSession,
} from '@/features/logging/types';

/**
 * Set entry is the one path in the app that writes a user's own training data,
 * and the one most likely to be used with cold hands in a hurry. These tests
 * pin the cases that would otherwise be discovered in a gym.
 */

describe('validateWeight', () => {
  it('accepts whole and decimal weights', () => {
    expect(validateWeight('100')).toEqual({ value: 100 });
    expect(validateWeight('82.5')).toEqual({ value: 82.5 });
  });

  it('accepts a comma as the decimal separator', () => {
    // European keyboards offer a comma; rejecting it would be baffling.
    expect(validateWeight('82,5')).toEqual({ value: 82.5 });
  });

  it('accepts zero, so bodyweight exercises can be logged', () => {
    // Pull-ups would otherwise be unloggable.
    expect(validateWeight('0')).toEqual({ value: 0 });
  });

  it('rejects non-numeric input', () => {
    expect(validateWeight('heavy').error).toBeDefined();
    expect(validateWeight('100kg').error).toBeDefined();
    expect(validateWeight('').error).toBeDefined();
  });

  it('rejects an implausible weight', () => {
    expect(validateWeight(String(MAX_WEIGHT + 1)).error).toBeDefined();
    expect(validateWeight(String(MAX_WEIGHT)).value).toBe(MAX_WEIGHT);
  });
});

describe('validateReps', () => {
  it('accepts a whole number of reps', () => {
    expect(validateReps('8')).toEqual({ value: 8 });
  });

  it('rejects zero and fractional reps', () => {
    expect(validateReps('0').error).toBeDefined();
    expect(validateReps('8.5').error).toBeDefined();
  });

  it('rejects an implausible count', () => {
    expect(validateReps(String(MAX_REPS + 1)).error).toBeDefined();
  });
});

describe('validateRpe', () => {
  it('treats an empty value as valid and absent', () => {
    // RPE is optional (task 7.3) — blank is not an error, it is "not recorded".
    expect(validateRpe('')).toEqual({});
    expect(validateRpe('   ')).toEqual({});
  });

  it('accepts whole and half points', () => {
    expect(validateRpe('8')).toEqual({ value: 8 });
    expect(validateRpe('8.5')).toEqual({ value: 8.5 });
  });

  it('rejects finer increments than half points', () => {
    expect(validateRpe('8.25').error).toBeDefined();
  });

  it('rejects values outside 1–10', () => {
    expect(validateRpe('0').error).toBeDefined();
    expect(validateRpe('11').error).toBeDefined();
  });
});

describe('suggestNextSet', () => {
  it('carries the previous set forward', () => {
    // Retyping the same numbers five times is the main friction in logging.
    expect(suggestNextSet({ previousSet: { weight: 80, reps: 8 } })).toEqual({
      weight: '80',
      reps: '8',
    });
  });

  it('falls back to the prescription on the first set', () => {
    expect(suggestNextSet({ prescribedLoad: 80, prescribedReps: 8 })).toEqual({
      weight: '80',
      reps: '8',
    });
  });

  it('prefers the previous set over the prescription', () => {
    // What you actually did last beats what you were told to do, because the
    // user has already deviated or confirmed it.
    expect(
      suggestNextSet({
        previousSet: { weight: 75, reps: 10 },
        prescribedLoad: 80,
        prescribedReps: 8,
      }),
    ).toEqual({ weight: '75', reps: '10' });
  });

  it('suggests nothing for an ad-hoc first set', () => {
    expect(suggestNextSet({})).toEqual({ weight: '', reps: '' });
  });
});

describe('prescription vs actual', () => {
  const exercise = (over: Partial<SessionExercise> = {}): SessionExercise => ({
    id: 'se-1',
    exerciseId: 'e-1',
    exerciseName: 'Flat Dumbbell Press',
    exerciseSlug: 'flat-dumbbell-press',
    position: 1,
    prescribedSets: null,
    prescribedReps: null,
    prescribedLoad: null,
    prescribedNotes: null,
    sets: [],
    ...over,
  });

  it('treats an ad-hoc exercise as having no prescription', () => {
    expect(hasPrescription(exercise())).toBe(false);
  });

  it('detects a prescription even when load is absent', () => {
    // "3 × 8" with no target weight is a valid prescription.
    expect(hasPrescription(exercise({ prescribedSets: 3, prescribedReps: 8 }))).toBe(true);
  });

  it('formats a prescription with and without a load', () => {
    expect(formatPrescription(exercise({ prescribedSets: 3, prescribedReps: 8 }))).toBe('3 × 8');
    expect(
      formatPrescription(exercise({ prescribedSets: 3, prescribedReps: 8, prescribedLoad: 80 })),
    ).toBe('3 × 8 @ 80');
  });

  it('returns null rather than a placeholder for an ad-hoc exercise', () => {
    // Rendering "— × —" on an ad-hoc session would imply a prescription exists.
    expect(formatPrescription(exercise())).toBeNull();
  });

  it('counts logged sets across a whole session', () => {
    const session = {
      exercises: [
        exercise({
          sets: [{ id: 's1', setNumber: 1, weight: 80, reps: 8, rpe: null, loggedAt: '' }],
        }),
        exercise({
          sets: [
            { id: 's2', setNumber: 1, weight: 40, reps: 10, rpe: 8, loggedAt: '' },
            { id: 's3', setNumber: 2, weight: 40, reps: 9, rpe: null, loggedAt: '' },
          ],
        }),
      ],
    } as WorkoutSession;

    expect(totalSets(session)).toBe(3);
  });
});
