import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { ExerciseRow } from '@/features/library/components/exercise-row';
import { FilterRow } from '@/features/library/components/filter-row';
import { SearchField } from '@/features/library/components/search-field';
import {
  applyFilters,
  countsByEquipment,
  countsByMuscleGroup,
  EMPTY_FILTERS,
  hasActiveFilters,
  type LibraryFilters,
} from '@/features/library/filter';
import { useLibrary } from '@/features/library/use-library';
import { colors } from '@/theme';

/**
 * Exercise library browse screen (tasks 3.4–3.7).
 *
 * Filtering and search run against the cached list, so everything here keeps
 * working on a gym connection that has dropped. The only thing that needs the
 * network is the background refresh.
 */
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { exercises, muscleGroups, equipment, loading, refreshing, error, refresh } = useLibrary();
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS);

  const visible = useMemo(() => applyFilters(exercises, filters), [exercises, filters]);
  const muscleCounts = useMemo(() => countsByMuscleGroup(exercises, filters), [exercises, filters]);
  const equipmentCounts = useMemo(
    () => countsByEquipment(exercises, filters),
    [exercises, filters],
  );

  const filtersActive = hasActiveFilters(filters);

  // Nothing cached and nothing fetched yet — the only state that warrants a
  // spinner. With a warm cache this never shows.
  if (loading) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <ActivityIndicator color={colors.brandRed} />
      </View>
    );
  }

  if (error && exercises.length === 0) {
    return (
      <View style={[screenStyles.screen, styles.centred]}>
        <Text variant="h2">Could not load the library</Text>
        <Text variant="caption" color="textMuted" style={styles.centredText}>
          {error}
        </Text>
        <Button label="Try again" variant="secondary" onPress={refresh} style={styles.retry} />
      </View>
    );
  }

  return (
    <View style={screenStyles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(exercise) => exercise.id}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            // Detail screen is task 4.3; nothing to navigate to yet.
            onPress={() => {}}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={visible.length === 0 ? styles.emptyContent : undefined}
        // The filter chips scroll away with the list rather than sticking.
        // Mid-workout the list is what matters, and a permanently pinned
        // 160pt header eats most of a phone screen.
        ListHeaderComponent={
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <View style={styles.titleRow}>
              <Text variant="display">Library</Text>
              <Text variant="caption" color="textMuted">
                {visible.length} {visible.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>

            <View style={styles.searchWrap}>
              <SearchField
                value={filters.search}
                onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
                placeholder="Search exercises"
              />
            </View>

            <FilterRow
              options={muscleGroups}
              selected={filters.muscleGroup}
              onSelect={(muscleGroup) => setFilters((f) => ({ ...f, muscleGroup }))}
              counts={muscleCounts}
              accessibilityLabel="Filter by muscle group"
            />

            <FilterRow
              options={equipment}
              selected={filters.equipment}
              onSelect={(equipmentSlug) => setFilters((f) => ({ ...f, equipment: equipmentSlug }))}
              counts={equipmentCounts}
              accessibilityLabel="Filter by equipment"
              variant="secondary"
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="h2">No exercises match</Text>
            <Text variant="caption" color="textMuted" style={styles.centredText}>
              Try a different muscle group or piece of equipment.
            </Text>
            <Button
              label="Clear filters"
              variant="secondary"
              onPress={() => setFilters(EMPTY_FILTERS)}
              style={styles.retry}
            />
          </View>
        }
        ListFooterComponent={
          filtersActive && visible.length > 0 ? (
            <View style={styles.footer}>
              <Button
                label="Clear filters"
                variant="secondary"
                onPress={() => setFilters(EMPTY_FILTERS)}
              />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.textSecondary}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 20,
    paddingBottom: 12,
  },
  titleRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchWrap: {
    paddingHorizontal: 20,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  centredText: {
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    minWidth: 180,
  },
  emptyContent: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
});
