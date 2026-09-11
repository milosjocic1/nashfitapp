import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import { requestPasswordReset } from '@/features/auth/reset-password';
import { validateEmail } from '@/features/auth/validation';

/**
 * Request a password reset (task 1.3, first half).
 *
 * Success is reported without confirming whether the address has an account.
 * Saying "no account with that email" would let anyone test which addresses are
 * registered — the same reasoning behind Supabase's deliberately vague
 * sign-in error.
 */
export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(undefined);

    if (nextEmailError) {
      return;
    }

    setSubmitting(true);
    const result = await requestPasswordReset(email);
    setSubmitting(false);

    if (result.status === 'error') {
      setFormError(result.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <View style={[screenStyles.screen, styles.centered]}>
        <Text variant="h1">Check your email</Text>
        <Text color="textSecondary" style={styles.centredText}>
          If an account exists for {email.trim()}, we have sent a link to reset your password.
        </Text>
        <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
      </View>
    );
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
          <Text variant="display">Reset your password</Text>
          <Text color="textSecondary">
            Enter your email and we will send you a link to set a new one.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {formError ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}

          <Button label="Send reset link" onPress={handleSubmit} loading={submitting} />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  centredText: {
    textAlign: 'center',
  },
  header: {
    gap: 8,
  },
  form: {
    gap: 8,
  },
});
