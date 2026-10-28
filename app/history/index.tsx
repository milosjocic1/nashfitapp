import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { fetchSessionHistory } from '@/features/logging/queries';
import { isPrescribed, totalSets, type WorkoutSession } from '@/features/logging/types';
import { useProfile } from '@/features/profile/context';
import { colors, radius } from '@/theme';

/**
 * Past workouts (task 7.6).
 *
 * Each row summarises rather than enumerating: date, how it was created, the
 * exercises and the set count. Someone scanning their history is looking for
 * "when did I last do legs", not a full transcript — that is what tapping in
 * is for.
 */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const unit = profile?.unitPreference ?? 'kg';

  const load = useCallback(async () => {
    try {
      setSessions(await fetchSessionHistory());
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const next = await fetchSessionHistory().catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : 'Could not load your history.');
        }
        return [];
      });
      if (active) {
        setSessions(next);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <ActivityIndicator color={colors.brandRed} />
      </View>
    );
  }

  return (
    <View style={screenStyles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        contentContainerStyle={sessions.length === 0 ? styles.emptyContent : styles.listContent}
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Text variant="display">History</Text>
            <Text variant="caption" color="textMuted">
              {sessions.length === 1 ? '1 workout' : `${sessions.length} workouts`}
            </Text>
            {error ? (
              <Text variant="caption" color="error">
                {error}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <HistoryRow session={item} unit={unit} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="h2">No workouts yet</Text>
            <Text variant="caption" color="textMuted" style={styles.centredText}>
              Finished sessions appear here.
            </Text>
            <Button label="Back to training" variant="secondary" onPress={() => router.back()} />
          </View>
        }
        onRefresh={load}
        refreshing={false}
      />
    </View>
  );
}

function HistoryRow({ session, unit }: { session: WorkoutSession; unit: string }) {
  const when = session.performedAt ?? session.createdAt;
  const date = new Date(when).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Heaviest set is the one number people look for when scanning back.
  const heaviest = session.exercises
    .flatMap((exercise) => exercise.sets)
    .reduce<
      number | null
    >((max, set) => (max === null || set.weight > max ? set.weight : max), null);

  return (
    <Pressable
      onPress={() => router.push(`/history/${session.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text variant="h2">{session.name ?? date}</Text>
        {isPrescribed(session) ? (
          <Text variant="caption" color="brandRed">
            Plan
          </Text>
        ) : null}
      </View>

      <Text variant="caption" color="textMuted" numberOfLines={2}>
        {session.exercises.map((exercise) => exercise.exerciseName).join(' · ') ||
          'No exercises recorded'}
      </Text>

      <Text variant="caption" color="textSecondary">
        {session.name ? `${date}  ·  ` : ''}
        {totalSets(session) === 1 ? '1 set' : `${totalSets(session)} sets`}
        {heaviest !== null ? `  ·  top ${heaviest} ${unit}` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  gap: {
    height: 10,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardPressed: {
    backgroundColor: colors.surface2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centredText: {
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
