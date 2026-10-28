import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { SetEntry } from '@/features/logging/components/set-entry';
import {
  formatPrescription,
  hasPrescription,
  type SessionExercise,
} from '@/features/logging/types';
import { suggestNextSet } from '@/features/logging/validation';
import { colors, radius } from '@/theme';

type ExerciseBlockProps = {
  exercise: SessionExercise;
  unit: string;
  disabled?: boolean;
  onLogSet: (params: { weight: number; reps: number; rpe: number | null }) => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

/**
 * One exercise within an active session (tasks 7.1–7.4).
 *
 * Shows the prescription above the logged sets, deliberately — the whole point
 * of the prescribe-then-log loop is that the user can see what Nash asked for
 * while recording what they actually managed. Ad-hoc exercises show no
 * prescription row at all rather than a row of dashes, which would imply one
 * exists.
 */
export function ExerciseBlock({
  exercise,
  unit,
  disabled,
  onLogSet,
  onDeleteSet,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseBlockProps) {
  const prescription = formatPrescription(exercise);
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const suggestion = suggestNextSet({
    previousSet: lastSet ? { weight: lastSet.weight, reps: lastSet.reps } : undefined,
    prescribedLoad: exercise.prescribedLoad,
    prescribedReps: exercise.prescribedReps,
  });

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text variant="h2">{exercise.exerciseName}</Text>
          {prescription ? (
            <Text variant="caption" color="brandRed">
              Target {prescription}
              {exercise.prescribedLoad !== null ? ` ${unit}` : ''}
            </Text>
          ) : null}
          {exercise.prescribedNotes ? (
            <Text variant="caption" color="textMuted">
              {exercise.prescribedNotes}
            </Text>
          ) : null}
        </View>

        <View style={styles.controls}>
          {onMoveUp ? (
            <IconButton label="↑" accessibilityLabel="Move up" onPress={onMoveUp} />
          ) : null}
          {onMoveDown ? (
            <IconButton label="↓" accessibilityLabel="Move down" onPress={onMoveDown} />
          ) : null}
          <IconButton label="✕" accessibilityLabel="Remove exercise" onPress={onRemove} />
        </View>
      </View>

      {exercise.sets.length > 0 ? (
        <View style={styles.sets}>
          {exercise.sets.map((set) => (
            <Pressable
              key={set.id}
              onLongPress={() => onDeleteSet(set.id)}
              accessibilityRole="button"
              accessibilityLabel={`Set ${set.setNumber}, ${set.weight} ${unit} for ${set.reps} reps. Long press to delete.`}
              style={styles.setRow}
            >
              <Text variant="caption" color="textMuted">
                Set {set.setNumber}
              </Text>
              <Text variant="label">
                {set.weight} {unit} × {set.reps}
                {set.rpe !== null ? `  ·  RPE ${set.rpe}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <SetEntry
        setNumber={exercise.sets.length + 1}
        unit={unit}
        initialWeight={suggestion.weight}
        initialReps={suggestion.reps}
        disabled={disabled}
        onLog={onLogSet}
      />

      {hasPrescription(exercise) && exercise.prescribedSets !== null ? (
        <Text variant="caption" color="textMuted">
          {exercise.sets.length} of {exercise.prescribedSets} sets logged
        </Text>
      ) : null}
    </View>
  );
}

function IconButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
    >
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  controls: {
    flexDirection: 'row',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
  },
  iconButtonPressed: {
    backgroundColor: colors.surface2,
  },
  sets: {
    gap: 2,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    backgroundColor: colors.surface0,
  },
});
