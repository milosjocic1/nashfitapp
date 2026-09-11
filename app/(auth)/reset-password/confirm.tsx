import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import { updatePassword } from '@/features/auth/reset-password';
import { MIN_PASSWORD_LENGTH, validatePassword } from '@/features/auth/validation';

/**
 * Set a new password (task 1.3, second half).
 *
 * Reached by the deep link in the reset email. Supabase's client picks up the
 * recovery token from that link and establishes a temporary session, which is
 * what authorises `updateUser` below — so this screen needs no token handling
 * of its own.
 *
 * After a successful update the user holds a valid session, and the routing in
 * app/_layout.tsx moves them into the app automatically.
 */
export default function ResetPasswordConfirmScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextErrors = {
      password: validatePassword(password),
      // A confirmation field on a *new* password, unlike sign-in: the user
      // cannot see what they typed and a typo would lock them out of the
      // account they are currently recovering.
      confirmation: password !== confirmation ? 'Passwords do not match.' : undefined,
    };
    setErrors(nextErrors);
    setFormError(undefined);

    if (nextErrors.password || nextErrors.confirmation) {
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.status === 'error') {
      setFormError(result.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={screenStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, styles.scrollContent]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="display">Set a new password</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
          />

          <TextField
            label="Confirm new password"
            value={confirmation}
            onChangeText={setConfirmation}
            error={errors.confirmation}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {formError ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}

          <Button label="Update password" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 32,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 8,
  },
});
