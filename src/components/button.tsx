import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/text';
import { colors, layout, radius } from '@/theme';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /**
   * Primary is the brand-red fill. Per §5, only ONE primary button per
   * screen — if everything is red, nothing reads as the main action.
   *
   * `destructive` is a separate axis, not a third rank: it uses the semantic
   * error colour, which §8 keeps deliberately distinct from the brand red so
   * "delete forever" never looks like "continue".
   */
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Button primitive (§5 of the brand guidelines).
 *
 * Height is at least 48px because the app is used mid-workout, at arm's length,
 * often with chalky or sweaty hands — the guidelines call out legibility and
 * touch size over decoration.
 */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  // Both filled variants carry white text and a white spinner; only the
  // outlined secondary differs.
  const isFilled = variant === 'primary' || variant === 'destructive';
  // `loading` disables too: a double-tapped sign-up submits twice.
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? colors.textPrimary : colors.textSecondary} />
      ) : (
        <Text variant="label" color="textPrimary">
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.brandRed,
  },
  // Outlined rather than a second fill, so the primary action stays the only
  // red thing on the screen.
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  // Filled, not outlined: an irreversible action should not look like the
  // quiet option sitting next to it.
  destructive: {
    backgroundColor: colors.error,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
