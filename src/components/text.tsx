import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyRole } from '@/theme';

type TextProps = RNTextProps & {
  /** Type role from the brand scale. Defaults to `body`. */
  variant?: TypographyRole;
  /** Colour token. Defaults to `textPrimary`. */
  color?: ColorToken;
};

/**
 * The app's only text primitive (task 0.11).
 *
 * Everything goes through here rather than bare `<Text>`, so type and colour
 * come from the brand tokens by default and drift is hard: an off-scale size or
 * an unapproved colour has to be written deliberately rather than by omission.
 *
 * Replaces the scaffold's ThemedText, which switched between Expo's default
 * light and dark palettes. NashFit is dark only — see src/theme/index.ts.
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}

/** Page background. Screens sit on surface0; cards go on surface1 above it. */
export const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface0,
  },
});
