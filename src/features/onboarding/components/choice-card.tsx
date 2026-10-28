import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, layout, radius } from '@/theme';

type ChoiceCardProps = {
  label: string;
  /** Explanatory line beneath the label — task 5.2's helper text. */
  helper?: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * A single-select option in onboarding (tasks 5.1, 5.2).
 *
 * Full-width rows rather than a segmented control or picker: the helper text
 * under each experience level is the whole point of task 5.2, and neither of
 * those can carry it. A wheel picker would also hide the options not currently
 * centred, which is wrong when the choice is between three things the user is
 * actively comparing.
 */
export function ChoiceCard({ label, helper, selected, onPress }: ChoiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={helper ? `${label}. ${helper}` : label}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.content}>
        <Text variant="h2" color={selected ? 'textPrimary' : 'textSecondary'}>
          {label}
        </Text>
        {helper ? (
          <Text variant="caption" color="textMuted">
            {helper}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  // Selection is marked with the accent border and a lift to surface2, not a
  // red fill: the primary button at the bottom of the step is the one red
  // element on the screen, per §5.
  cardSelected: {
    borderColor: colors.brandRed,
    backgroundColor: colors.surface2,
  },
  cardPressed: {
    opacity: 0.8,
  },
  content: {
    gap: 4,
  },
});
