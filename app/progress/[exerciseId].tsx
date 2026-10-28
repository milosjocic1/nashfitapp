import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { fetchExerciseProgress } from '@/features/logging/queries';
import type { LoggedSet } from '@/features/logging/types';
import { useProfile } from '@/features/profile/context';
import { colors, radius } from '@/theme';

/**
 * Per-exercise progress over time (task 7.7).
 *
 * A table, not a chart. Weight alone is a misleading line — 100×5 and 80×12
 * are different kinds of hard — and a chart that ignores reps invites someone
 * to read a deload as decline. The numbers, newest last, let a lifter make
 * that judgement themselves, which is also how Nash's own audience thinks
 * about progression.
 *
 * Charting is a reasonable v2 addition once there is enough history for a
 * trend to mean anything.
 */
export default function ExerciseProgressScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();

  const [entries, setEntries] = useState<
    { sessionId: string; performedAt: string | null; sets: LoggedSet[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const unit = profile?.unitPreference ?? 'kg';

  useEffect(() => {
    let active = true;
    (async () => {
      if (!exerciseId) {
        return;
      }
      const next = await fetchExerciseProgress(exerciseId).catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load your progress.');
        }
        return [];
      });
      if (active) {
        setEntries(next);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [exerciseId]);

  if (loading) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <ActivityIndicator color={colors.brandRed} />
      </View>
    );
  }

  const allSets = entries.flatMap((entry) => entry.sets);
  const best = allSets.reduce<LoggedSet | null>(
    (top, set) => (top === null || set.weight > top.weight ? set : top),
    null,
  );

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <Text variant="display">Progress</Text>
        <Text variant="caption" color="textMuted">
          {entries.length === 1 ? '1 session' : `${entries.length} sessions`} recorded
        </Text>
        {error ? (
          <Text variant="caption" color="error">
            {error}
          </Text>
        ) : null}
      </View>

      {best ? (
        <View style={styles.bestCard}>
          <Text variant="caption" color="textMuted">
            Heaviest set
          </Text>
          <Text variant="numeric">
            {best.weight} {unit} × {best.reps}
          </Text>
        </View>
      ) : null}

      {entries.length === 0 ? (
        <Text variant="caption" color="textMuted" style={styles.centredText}>
          Nothing logged for this exercise yet.
        </Text>
      ) : null}

      {/* Oldest first: progression reads downward, the way a training log does. */}
      {entries.map((entry) => (
        <View key={entry.sessionId} style={styles.card}>
          <Text variant="caption" color="textSecondary">
            {entry.performedAt
              ? new Date(entry.performedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Date unknown'}
          </Text>

          <View style={styles.sets}>
            {entry.sets.map((set) => (
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
          </View>
        </View>
      ))}

      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centredText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  bestCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brandRed,
    padding: 16,
    gap: 4,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
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
