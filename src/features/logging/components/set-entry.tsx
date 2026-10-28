import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { validateReps, validateRpe, validateWeight } from '@/features/logging/validation';
import { colors, layout, radius, typography } from '@/theme';

type SetEntryProps = {
  setNumber: number;
  unit: string;
  /** Pre-filled from the previous set, or the prescription on the first. */
  initialWeight: string;
  initialReps: string;
  disabled?: boolean;
  onLog: (params: { weight: number; reps: number; rpe: number | null }) => void;
};

/**
 * The row that logs one set (tasks 7.1–7.3).
 *
 * Numeric keyboards, tabular figures, and large touch targets — this is used
 * between sets with a resting heart rate of 150 and possibly chalky hands.
 *
 * Fields are pre-filled from the previous set, because sets repeat and
 * retyping the same numbers is the main friction in logging. RPE is
 * deliberately *not* pre-filled: it is a judgement about the set just
 * performed, and carrying it forward invites accepting a stale number.
 */
export function SetEntry({
  setNumber,
  unit,
  initialWeight,
  initialReps,
  disabled,
  onLog,
}: SetEntryProps) {
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState('');
  const [error, setError] = useState<string>();

  function handleLog() {
    const w = validateWeight(weight);
    const r = validateReps(reps);
    const e = validateRpe(rpe);

    const firstError = w.error ?? r.error ?? e.error;
    if (firstError) {
      setError(firstError);
      return;
    }

    setError(undefined);
    onLog({ weight: w.value!, reps: r.value!, rpe: e.value ?? null });

    // Weight and reps stay for the next set; RPE clears, since it describes
    // the set just logged.
    setRpe('');
  }

  return (
    <View style={styles.container}>
      <View style={styles.fields}>
        <Field
          label={`Weight (${unit})`}
          value={weight}
          onChangeText={setWeight}
          // decimal-pad: plates come in 2.5s and half-kg increments exist.
          keyboardType="decimal-pad"
          editable={!disabled}
        />
        <Field
          label="Reps"
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          editable={!disabled}
        />
        <Field
          label="RPE"
          value={rpe}
          onChangeText={setRpe}
          keyboardType="decimal-pad"
          placeholder="—"
          editable={!disabled}
        />
      </View>

      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={`Log set ${setNumber}`} onPress={handleLog} disabled={disabled} />
    </View>
  );
}

function Field({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        selectTextOnFocus
        accessibilityLabel={label}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  fields: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  input: {
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.surface2,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    // Tabular figures so the columns do not jitter as digits change (§3).
    ...typography.numeric,
  },
});
