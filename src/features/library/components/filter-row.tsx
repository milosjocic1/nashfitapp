import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, layout, radius } from '@/theme';

type Option = { id: string; name: string; slug: string };

type FilterRowProps = {
  options: Option[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
  /** Result count per option slug; an option with no entry is unavailable. */
  counts: Record<string, number>;
  accessibilityLabel: string;
  /** Quieter styling for the secondary filter, so one row leads. */
  variant?: 'primary' | 'secondary';
};

/**
 * Horizontally scrolling filter chips (tasks 3.5, 3.6).
 *
 * Two rows of chips rather than a bottom sheet: filtering is the main thing
 * people do here, and a sheet costs a tap plus a modal every time. Scrolling
 * chips keep the current selection visible, which a sheet cannot.
 *
 * Options that would return nothing under the *other* active filters are
 * dimmed and disabled rather than hidden — a filter list that reshuffles as
 * you use it is disorienting, and a visibly unavailable option still tells you
 * something.
 *
 * Only the primary row uses the brand red, per §5's one-accent-per-screen rule.
 * The secondary row marks selection with a border instead.
 */
export function FilterRow({
  options,
  selected,
  onSelect,
  counts,
  accessibilityLabel,
  variant = 'primary',
}: FilterRowProps) {
  const isPrimary = variant === 'primary';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={accessibilityLabel}
      keyboardShouldPersistTaps="handled"
    >
      <Chip
        label="All"
        active={selected === null}
        available
        isPrimary={isPrimary}
        onPress={() => onSelect(null)}
      />

      {options.map((option) => {
        const count = counts[option.slug] ?? 0;
        const isSelected = selected === option.slug;

        return (
          <Chip
            key={option.id}
            label={option.name}
            active={isSelected}
            // A selected chip stays tappable even at zero, so it can be undone.
            available={count > 0 || isSelected}
            isPrimary={isPrimary}
            onPress={() => onSelect(isSelected ? null : option.slug)}
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  available,
  isPrimary,
  onPress,
}: {
  label: string;
  active: boolean;
  available: boolean;
  isPrimary: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!available}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !available }}
      style={({ pressed }) => [
        styles.chip,
        active && (isPrimary ? styles.chipActivePrimary : styles.chipActiveSecondary),
        !available && styles.chipUnavailable,
        pressed && styles.chipPressed,
      ]}
    >
      <View style={styles.chipInner}>
        <Text
          variant="label"
          color={active ? 'textPrimary' : available ? 'textSecondary' : 'textMuted'}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface1,
  },
  chipInner: {
    minHeight: layout.minTouchTarget - 16,
    justifyContent: 'center',
  },
  chipActivePrimary: {
    backgroundColor: colors.brandRed,
    borderColor: colors.brandRed,
  },
  chipActiveSecondary: {
    backgroundColor: colors.surface2,
    borderColor: colors.textSecondary,
  },
  chipUnavailable: {
    opacity: 0.35,
  },
  chipPressed: {
    opacity: 0.7,
  },
});
