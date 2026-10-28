import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { primaryMuscleGroup, type ExerciseSummary } from '@/features/library/types';
import { colors } from '@/theme';

type ExerciseRowProps = {
  exercise: ExerciseSummary;
  onPress: (exercise: ExerciseSummary) => void;
};

/**
 * A row in the library list (task 3.4).
 *
 * **Text only, deliberately.** The brand guidelines describe rows as
 * "thumbnail + serif name + sans metadata", but no exercise images exist yet —
 * `exercise_media` is empty. A placeholder tile would make every row look
 * broken until Nash delivers. The layout leaves a natural left slot, so
 * thumbnails drop in later without a redesign.
 *
 * Metadata is primary muscle group + equipment and nothing else. Movement
 * pattern and secondary groups are real data, but at arm's length mid-workout
 * a third line of grey text costs more than it tells.
 */
export function ExerciseRow({ exercise, onPress }: ExerciseRowProps) {
  const primary = primaryMuscleGroup(exercise);
  const equipment = exercise.equipment.map((item) => item.name).join(' · ');

  // "Chest · Dumbbell · Bench" — group first, since that is how the library is
  // organised and how someone scanning expects to orient.
  const metadata = [primary?.name, equipment].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => onPress(exercise)}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}. ${metadata}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.content}>
        {/* Serif for the name: the "authored" surface, per the type scale. */}
        <Text variant="h2" numberOfLines={2}>
          {exercise.name}
        </Text>
        {metadata ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {metadata}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    // No card, no chevron, no divider drawn here. A 36-row list of cards is
    // heavy; separation comes from the list's own hairline separators and from
    // generous vertical rhythm.
    backgroundColor: 'transparent',
  },
  rowPressed: {
    backgroundColor: colors.surface1,
  },
  content: {
    gap: 4,
  },
});
