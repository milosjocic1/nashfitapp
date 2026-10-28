import { MAX_AGE, MIN_AGE, TRAINING_DAY_OPTIONS, validateAge } from '@/features/onboarding/options';
import { isOnboardingComplete, toPlanInputs, type Profile } from '@/features/profile/types';

/**
 * Onboarding validation and the plan-input/preference split.
 *
 * The split is tested because it is a rule the specs state repeatedly and
 * which nothing else enforces at runtime: a preference must never look like a
 * plan input, or a user changing kg to lb could silently trigger a new
 * training programme.
 */

const profile = (over: Partial<Profile> = {}): Profile => ({
  id: 'user-1',
  displayName: null,
  age: 45,
  experienceLevel: 'intermediate',
  sex: 'male',
  trainingDaysPerWeek: 4,
  unitPreference: 'kg',
  ...over,
});

describe('validateAge', () => {
  it('accepts a plausible age', () => {
    expect(validateAge('45')).toEqual({ value: 45 });
  });

  it('accepts the exact boundaries', () => {
    expect(validateAge(String(MIN_AGE)).value).toBe(MIN_AGE);
    expect(validateAge(String(MAX_AGE)).value).toBe(MAX_AGE);
  });

  it('rejects just outside the boundaries', () => {
    expect(validateAge(String(MIN_AGE - 1)).error).toBeDefined();
    expect(validateAge(String(MAX_AGE + 1)).error).toBeDefined();
  });

  it('rejects an empty value', () => {
    expect(validateAge('').error).toBeDefined();
    expect(validateAge('   ').error).toBeDefined();
  });

  it('rejects anything non-numeric rather than salvaging a number from it', () => {
    // parseInt('32kg') is 32 — tolerating that would silently accept nonsense.
    expect(validateAge('32kg').error).toBeDefined();
    expect(validateAge('forty').error).toBeDefined();
    expect(validateAge('4.5').error).toBeDefined();
    expect(validateAge('-30').error).toBeDefined();
  });

  it('tolerates surrounding whitespace', () => {
    expect(validateAge('  45 ')).toEqual({ value: 45 });
  });
});

describe('training day options', () => {
  it('offers only values the Principles Document supports', () => {
    // Task 5.5 and the onboarding template: do not offer 2-day or 7-day
    // splits unless Nash has rules for them. The DB CHECK constraint mirrors
    // this, so widening here without a migration would fail server-side.
    expect([...TRAINING_DAY_OPTIONS]).toEqual([3, 4, 5, 6]);
  });
});

describe('isOnboardingComplete', () => {
  it('is true only when all four plan inputs are present', () => {
    expect(isOnboardingComplete(profile())).toBe(true);
  });

  it('is false when any single plan input is missing', () => {
    expect(isOnboardingComplete(profile({ age: null }))).toBe(false);
    expect(isOnboardingComplete(profile({ experienceLevel: null }))).toBe(false);
    expect(isOnboardingComplete(profile({ sex: null }))).toBe(false);
    expect(isOnboardingComplete(profile({ trainingDaysPerWeek: null }))).toBe(false);
  });

  it('is false with no profile at all', () => {
    expect(isOnboardingComplete(null)).toBe(false);
  });

  it('does NOT depend on unit preference', () => {
    // The critical case: unit preference is display-only. If it ever gated
    // onboarding it would have become a plan input by accident.
    expect(isOnboardingComplete(profile({ unitPreference: 'lb' }))).toBe(true);
  });
});

describe('toPlanInputs', () => {
  it('returns exactly the four plan inputs and nothing else', () => {
    const inputs = toPlanInputs(profile({ unitPreference: 'lb', displayName: 'Milos' }));

    // Equality, not a subset check: anything extra leaking in here would end
    // up in plans.input_snapshot and make a preference look like a plan input.
    expect(inputs).toEqual({
      age: 45,
      experienceLevel: 'intermediate',
      sex: 'male',
      trainingDaysPerWeek: 4,
    });
  });

  it('returns null when onboarding is incomplete', () => {
    expect(toPlanInputs(profile({ sex: null }))).toBeNull();
    expect(toPlanInputs(null)).toBeNull();
  });
});
