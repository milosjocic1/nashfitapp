import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/text';
import { colors, layout, radius, typography } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Validation message. Present means invalid: the field turns red. */
  error?: string;
  /** Guidance shown when there is no error. */
  hint?: string;
};

/**
 * Text input primitive (§5: surface2 fill, hairline border, red focus ring).
 *
 * The error slot always occupies its line, whether or not there is an error, so
 * a form does not jump as messages appear and disappear during typing.
 */
export function TextField({ label, error, hint, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          // Error outranks focus: a field can be both, and the problem is the
          // more useful thing to signal.
          !!error && styles.inputError,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        // `aria-invalid`, not accessibilityState: RN's AccessibilityState has
        // no `invalid` member — that is a web ARIA concept, and RN exposes it
        // through the aria-* props instead.
        aria-invalid={!!error}
        {...rest}
      />

      <View style={styles.messageSlot}>
        {error ? (
          <Text variant="caption" color="error">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  input: {
    minHeight: layout.minTouchTarget,
    backgroundColor: colors.surface2,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.brandRed,
  },
  inputError: {
    borderColor: colors.error,
  },
  // Reserved height stops the form shifting as messages appear.
  messageSlot: {
    minHeight: 18,
  },
});
