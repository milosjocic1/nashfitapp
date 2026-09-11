import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import { signUpWithEmail } from '@/features/auth/sign-up';
import { MIN_PASSWORD_LENGTH, validateEmail, validatePassword } from '@/features/auth/validation';

/**
 * Sign-up screen (task 1.1).
 *
 * Routing into and out of here is task 1.7; for now it is reachable from the
 * placeholder home screen so the flow can be exercised on a device.
 */
export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string>();

  async function handleSubmit() {
    // Validate on submit rather than on every keystroke: telling someone their
    // email is invalid while they are still typing it is just noise.
    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setFormError(undefined);

    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setSubmitting(true);
    const result = await signUpWithEmail(email, password);
    setSubmitting(false);

    if (result.status === 'error') {
      setFormError(result.message);
      return;
    }
    if (result.status === 'confirmation_required') {
      setConfirmationSentTo(result.email);
    }
    // 'signed_in' needs no handling here — auth-state routing (task 1.7) will
    // move the user on automatically once it exists.
  }

  if (confirmationSentTo) {
    return (
      <View style={[screenStyles.screen, styles.container, styles.centered]}>
        <Text variant="h1">Check your email</Text>
        <Text color="textSecondary" style={styles.centredText}>
          We sent a confirmation link to {confirmationSentTo}. Open it to finish creating your
          account.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={screenStyles.screen}
      // Without this the keyboard covers the password field and the button on
      // smaller phones.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, styles.scrollContent]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="display">Create your account</Text>
          <Text color="textSecondary">Train the way Nash teaches.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!submitting}
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            secureTextEntry
            autoCapitalize="none"
            // newPassword lets the OS offer to generate and save a strong one.
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
          />

          {formError ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}

          <Button label="Create account" onPress={handleSubmit} loading={submitting} />
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
    gap: 12,
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
