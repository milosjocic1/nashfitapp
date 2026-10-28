import {
  applyFilters,
  countsByEquipment,
  countsByMuscleGroup,
  EMPTY_FILTERS,
  hasActiveFilters,
} from '@/features/library/filter';
import type { ExerciseSummary } from '@/features/library/types';

/**
 * Library filtering is pure logic over the cached catalogue, which makes it
 * cheap to test and easy to break silently — a filter that quietly returns the
 * wrong set looks like a content problem, not a code one.
 *
 * Fixtures mirror real seeded rows so the cases are the ones that actually
 * occur: multi-equipment exercises, secondary muscle groups, and names that
 * overlap.
 */

const exercise = (over: Partial<ExerciseSummary> & Pick<ExerciseSummary, 'name' | 'slug'>) =>
  ({
    id: over.slug,
    description: null,
    movementPattern: null,
    muscleGroups: [],
    equipment: [],
    ...over,
  }) as ExerciseSummary;

const mg = (slug: string, role: 'primary' | 'secondary' = 'primary') => ({
  id: slug,
  name: slug,
  slug,
  role,
});
const eq = (slug: string) => ({ id: slug, name: slug, slug });

const LIBRARY: ExerciseSummary[] = [
  exercise({
    name: 'Flat Dumbbell Press',
    slug: 'flat-dumbbell-press',
    muscleGroups: [mg('chest'), mg('triceps', 'secondary'), mg('shoulders', 'secondary')],
    equipment: [eq('dumbbell'), eq('bench')],
  }),
  exercise({
    name: 'Decline Machine Press',
    slug: 'decline-machine-press',
    muscleGroups: [mg('chest'), mg('triceps', 'secondary')],
    equipment: [eq('machine')],
  }),
  exercise({
    name: 'Barbell Curls',
    slug: 'barbell-curls',
    muscleGroups: [mg('biceps')],
    equipment: [eq('barbell')],
  }),
  exercise({
    name: 'Standing Calf Raises',
    slug: 'standing-calf-raises',
    muscleGroups: [mg('calves')],
    equipment: [eq('machine')],
  }),
];

describe('applyFilters', () => {
  it('returns everything when no filter is set', () => {
    expect(applyFilters(LIBRARY, EMPTY_FILTERS)).toHaveLength(4);
  });

  it('filters by muscle group', () => {
    const result = applyFilters(LIBRARY, { ...EMPTY_FILTERS, muscleGroup: 'chest' });
    expect(result.map((e) => e.slug)).toEqual(['flat-dumbbell-press', 'decline-machine-press']);
  });

  it('matches secondary muscle groups, not just primary', () => {
    // Someone filtering to "triceps" wants everything that trains triceps,
    // including presses where it is secondary work.
    const result = applyFilters(LIBRARY, { ...EMPTY_FILTERS, muscleGroup: 'triceps' });
    expect(result).toHaveLength(2);
  });

  it('filters by equipment, including exercises needing several pieces', () => {
    // Flat Dumbbell Press needs dumbbell AND bench; filtering by either finds it.
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, equipment: 'bench' })).toHaveLength(1);
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, equipment: 'dumbbell' })).toHaveLength(1);
  });

  it('combines filters with AND', () => {
    const result = applyFilters(LIBRARY, {
      ...EMPTY_FILTERS,
      muscleGroup: 'chest',
      equipment: 'machine',
    });
    expect(result.map((e) => e.slug)).toEqual(['decline-machine-press']);
  });

  it('returns an empty list when filters exclude everything', () => {
    const result = applyFilters(LIBRARY, {
      ...EMPTY_FILTERS,
      muscleGroup: 'calves',
      equipment: 'barbell',
    });
    expect(result).toEqual([]);
  });

  it('searches case-insensitively on partial names', () => {
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, search: 'CURL' })).toHaveLength(1);
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, search: 'press' })).toHaveLength(2);
  });

  it('ignores surrounding and repeated whitespace in a search', () => {
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, search: '  calf   raises ' })).toHaveLength(1);
  });

  it('ignores accents, so a phone keyboard cannot miss a match', () => {
    expect(applyFilters(LIBRARY, { ...EMPTY_FILTERS, search: 'dúmbbell' })).toHaveLength(1);
  });

  it('does not search descriptions', () => {
    // Descriptions say things like "Also performed with a barbell", so
    // searching "barbell" must not surface machine exercises.
    const withDescription = [
      exercise({
        name: 'Decline Machine Press',
        slug: 'decline-machine-press',
        description: 'Also performed with a barbell or dumbbells.',
      }),
    ];
    expect(applyFilters(withDescription, { ...EMPTY_FILTERS, search: 'barbell' })).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the empty filter set', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('treats whitespace-only search as inactive', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: '   ' })).toBe(false);
  });

  it('is true when any filter is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, muscleGroup: 'chest' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, equipment: 'barbell' })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: 'curl' })).toBe(true);
  });
});

describe('option counts', () => {
  it('counts muscle groups against the other active filters, not its own', () => {
    // With equipment=machine active, chest should count only the machine press.
    const counts = countsByMuscleGroup(LIBRARY, { ...EMPTY_FILTERS, equipment: 'machine' });
    expect(counts.chest).toBe(1);
    expect(counts.calves).toBe(1);
    expect(counts.biceps).toBeUndefined();
  });

  it('counts equipment against the other active filters', () => {
    const counts = countsByEquipment(LIBRARY, { ...EMPTY_FILTERS, muscleGroup: 'chest' });
    expect(counts.dumbbell).toBe(1);
    expect(counts.machine).toBe(1);
    expect(counts.barbell).toBeUndefined();
  });

  it('gives a zero-count option no entry, so the UI can dim it', () => {
    const counts = countsByEquipment(LIBRARY, { ...EMPTY_FILTERS, muscleGroup: 'calves' });
    expect(counts.barbell).toBeUndefined();
    expect(counts.machine).toBe(1);
  });
});
