import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { formatPrescription, isPrescribed, totalSets } from '@/features/logging/types';
import { useSession } from '@/features/logging/use-session';
import { useProfile } from '@/features/profile/context';
import { colors, radius } from '@/theme';

/**
 * A completed workout (task 7.6).
 *
 * Read-only, and it shows **both sides of the split**: what was prescribed and
 * what was actually done, side by side. That comparison is the whole point of
 * the prescribe-then-log loop — and eventually the input to closed-loop
 * adjustment, which v1 supports structurally without automating.
 */
export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { session, loading } = useSession(id ?? null);

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
        <Text variant="h2">Workout not found</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const when = session.performedAt ?? session.createdAt;

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <Text variant="display">
          {new Date(when).toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        <Text variant="caption" color="textMuted">
          {isPrescribed(session) ? "Prescribed by Nash's method" : 'Ad-hoc session'} ·{' '}
          {totalSets(session) === 1 ? '1 set' : `${totalSets(session)} sets`}
        </Text>
      </View>

      {session.exercises.map((exercise) => {
        const prescription = formatPrescription(exercise);

        return (
          <View key={exercise.id} style={styles.card}>
            <Text variant="h2">{exercise.exerciseName}</Text>

            {prescription ? (
              <Text variant="caption" color="brandRed">
                Prescribed {prescription}
                {exercise.prescribedLoad !== null ? ` ${unit}` : ''}
              </Text>
            ) : null}

            <View style={styles.sets}>
              {exercise.sets.map((set) => (
                <View key={set.id} style={styles.setRow}>
                  <Text variant="caption" color="textMuted">
                    Set {set.setNumber}
                  </Text>
                  <Text variant="label">
                    {set.weight} {unit} × {set.reps}
                    {set.rpe !== null ? `  ·  RPE ${set.rpe}` : ''}
                  </Text>
                </View>
              ))}
              {exercise.sets.length === 0 ? (
                <Text variant="caption" color="textMuted">
                  No sets logged.
                </Text>
              ) : null}
            </View>

            <Button
              label="See progress"
              variant="secondary"
              onPress={() => router.push(`/progress/${exercise.exerciseId}`)}
            />
          </View>
        );
      })}

      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
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
