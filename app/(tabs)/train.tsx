import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { fetchInProgressSession, startAdHocSession } from '@/features/logging/queries';
import { totalSets, type WorkoutSession } from '@/features/logging/types';
import { colors, radius } from '@/theme';

/**
 * The training tab — the entry point to logging (tasks 7.1, 7.2, 7.5).
 *
 * Resuming comes first, deliberately. A workout interrupted by a phone call or
 * a closed app is the normal case, not the exception, and burying the resume
 * behind "start a workout" is how someone ends up with two half-sessions.
 *
 * Prescribed sessions (task 7.1) will appear here once plan generation exists
 * (Phase 6). Until then the screen says so rather than pretending.
 */
export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const [inProgress, setInProgress] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();

  // Refetched on focus rather than mount: returning from a finished session
  // must not leave a stale "resume" card pointing at it.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const session = await fetchInProgressSession().catch((caught: unknown) => {
          if (active) {
            setError(caught instanceof Error ? caught.message : 'Could not load your sessions.');
          }
          return null;
        });
        if (active) {
          setInProgress(session);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleStart() {
    setStarting(true);
    setError(undefined);
    try {
      const id = await startAdHocSession(null);
      router.push(`/session/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start a session.');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <ActivityIndicator color={colors.brandRed} />
      </View>
    );
  }

  return (
    <ScrollView
      style={screenStyles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Text variant="display">Train</Text>

      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {inProgress ? (
        <View style={styles.card}>
          <Text variant="h2">Workout in progress</Text>
          <Text variant="caption" color="textMuted">
            {totalSets(inProgress) === 1 ? '1 set' : `${totalSets(inProgress)} sets`} logged so far.
          </Text>
          <Button
            label="Resume workout"
            onPress={() => router.push(`/session/${inProgress.id}`)}
            style={styles.cardButton}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text variant="h2">Start a workout</Text>
          <Text variant="caption" color="textMuted">
            Build a session from the library as you go.
          </Text>
          <Button
            label="Start a workout"
            onPress={handleStart}
            loading={starting}
            style={styles.cardButton}
          />
        </View>
      )}

      {/* Honest about what is not here yet, rather than an empty space the
          user has to interpret. Phase 6 fills this. */}
      <View style={styles.pendingCard}>
        <Text variant="h2" color="textSecondary">
          Your plan
        </Text>
        <Text variant="caption" color="textMuted">
          Nash-generated sessions will appear here once plan generation is live.
        </Text>
      </View>

      <Button label="Workout history" variant="secondary" onPress={() => router.push('/history')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardButton: {
    marginTop: 10,
  },
  pendingCard: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
    gap: 6,
  },
});
