import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { ExerciseRow } from '@/features/library/components/exercise-row';
import { SearchField } from '@/features/library/components/search-field';
import { applyFilters, EMPTY_FILTERS } from '@/features/library/filter';
import { useLibrary } from '@/features/library/use-library';
import { addExerciseToSession, fetchSession } from '@/features/logging/queries';
import { colors } from '@/theme';

/**
 * Picks an exercise to add to an ad-hoc session (task 7.2).
 *
 * Reuses the library's cached list, search and row component rather than
 * duplicating them — which also means this keeps working with no connection,
 * the same as browsing.
 *
 * Search only, no filter chips: this is a focused "find the thing I am about
 * to do" interaction, and two rows of chips would be noise in a modal.
 */
export default function AddExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { exercises, loading } = useLibrary();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();

  const visible = useMemo(
    () => applyFilters(exercises, { ...EMPTY_FILTERS, search }),
    [exercises, search],
  );

  async function handleAdd(exerciseId: string) {
    if (!id || adding) {
      return;
    }
    setAdding(true);
    setError(undefined);
    try {
      // Position is derived from the current session rather than tracked in
      // local state, so adding from two places cannot produce a collision.
      const session = await fetchSession(id);
      await addExerciseToSession(id, exerciseId, (session?.exercises.length ?? 0) + 1);
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add the exercise.');
      setAdding(false);
    }
  }

  return (
    <View style={screenStyles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <Text variant="h1">Add an exercise</Text>
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search exercises" />
        {error ? (
          <Text variant="caption" color="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator color={colors.brandRed} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(exercise) => exercise.id}
          renderItem={({ item }) => (
            <ExerciseRow exercise={item} onPress={() => handleAdd(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.centred}>
              <Text variant="caption" color="textMuted">
                No exercises match that search.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  centred: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});
