import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { colors, radius, typography } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

/**
 * Search input for the library (task 3.7).
 *
 * Distinct from the form `TextField`: no label and no reserved message line,
 * because a search box needs neither and both would add vertical weight at the
 * top of a scrolling list.
 *
 * The clear button only appears once there is something to clear — a
 * permanently visible affordance that does nothing most of the time is just
 * noise.
 */
export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.container}>
      <IconSymbol name="magnifyingglass" size={18} color={colors.textMuted} />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        // iOS only: a native clear button would sit alongside ours.
        clearButtonMode="never"
        accessibilityLabel="Search exercises"
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          // Generous hit area around a small glyph — this is tapped mid-workout.
          hitSlop={12}
        >
          <IconSymbol name="xmark.circle.fill" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    ...typography.label,
    // Height is owned by the container; letting the input set its own adds
    // platform-inconsistent padding.
    padding: 0,
  },
});
