import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { ExerciseBlock } from '@/features/logging/components/exercise-block';
import { isPrescribed, totalSets } from '@/features/logging/types';
import { useSession } from '@/features/logging/use-session';
import { useProfile } from '@/features/profile/context';
import { colors, radius } from '@/theme';

/**
 * The active workout screen (tasks 7.1–7.5).
 *
 * Handles both kinds of session with one UI, because they differ only in
 * whether a prescription is present:
 *
 *   PRESCRIBED (7.1)  created by the AI; targets shown above each exercise,
 *                     exercises fixed.
 *   AD-HOC (7.2)      assembled by the user; no targets, exercises can be
 *                     added, reordered and removed (7.4).
 */
export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const {
    session,
    loading,
    error,
    busy,
    logSet,
    deleteSet,
    removeExercise,
    reorderExercises,
    finish,
  } = useSession(id ?? null);
  const [finishing, setFinishing] = useState(false);

  const unit = profile?.unitPreference ?? 'kg';

  if (loading) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <ActivityIndicator color={colors.brandRed} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <Text variant="h2">Session not found</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const prescribed = isPrescribed(session);
  const loggedSets = totalSets(session);

  function move(index: number, direction: -1 | 1) {
    if (!session) {
      return;
    }
    const ids = session.exercises.map((e) => e.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) {
      return;
    }
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderExercises(ids);
  }

  async function handleFinish() {
    setFinishing(true);
    await finish();
    setFinishing(false);
    router.replace('/(tabs)/train');
  }

  return (
    <KeyboardAvoidingView
      style={screenStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text variant="display">{session.name ?? (prescribed ? 'Your session' : 'Workout')}</Text>
          <Text variant="caption" color="textMuted">
            {prescribed ? "Prescribed by Nash's method" : 'Ad-hoc session'} ·{' '}
            {loggedSets === 1 ? '1 set' : `${loggedSets} sets`} logged
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {error}
            </Text>
          </View>
        ) : null}

        {session.exercises.map((exercise, index) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            unit={unit}
            disabled={busy}
            onLogSet={({ weight, reps, rpe }) =>
              logSet({
                sessionExerciseId: exercise.id,
                setNumber: exercise.sets.length + 1,
                weight,
                reps,
                rpe,
              })
            }
            onDeleteSet={deleteSet}
            onRemove={() => removeExercise(exercise.id)}
            // Reordering is offered on ad-hoc sessions only (task 7.4): the
            // order of a prescribed session is part of what Nash's rules
            // decided, so it is not the user's to shuffle.
            onMoveUp={!prescribed && index > 0 ? () => move(index, -1) : undefined}
            onMoveDown={
              !prescribed && index < session.exercises.length - 1 ? () => move(index, 1) : undefined
            }
          />
        ))}

        {!prescribed ? (
          <Pressable
            onPress={() => router.push({ pathname: '/session/add-exercise', params: { id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Text variant="label" color="brandRed">
              + Add an exercise
            </Text>
          </Pressable>
        ) : null}

        {session.exercises.length === 0 ? (
          <Text variant="caption" color="textMuted" style={styles.emptyHint}>
            Add the first exercise to start logging.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Finish workout"
          onPress={handleFinish}
          loading={finishing}
          // Saving an empty session would put a workout with no sets into
          // history, which is never what someone means.
          disabled={loggedSets === 0 || busy}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  errorBanner: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.error,
    padding: 12,
  },
  addButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addButtonPressed: {
    backgroundColor: colors.surface1,
  },
  emptyHint: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
