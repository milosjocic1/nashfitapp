import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import { signInWithEmail } from '@/features/auth/sign-in';
import { validateEmail } from '@/features/auth/validation';

/**
 * Sign-in screen (task 1.2).
 *
 * On success nothing is navigated here: the auth-state listener updates the
 * session and the routing in app/_layout.tsx moves the user on (task 1.7).
 */
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    // Only the email is format-checked. Validating password length on sign-in
    // would be wrong: an existing account may predate the current minimum, and
    // the server is the authority on whether a credential is correct.
    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    setFormError(undefined);

    if (nextEmailError) {
      return;
    }
    if (!password) {
      setFormError('Enter your password.');
      return;
    }

    setSubmitting(true);
    const result = await signInWithEmail(email, password);
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
          <Text variant="display">Welcome back</Text>
          <Text color="textSecondary">Sign in to your plan.</Text>
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
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {formError ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}

          <Button label="Sign in" onPress={handleSubmit} loading={submitting} />
        </View>

        <View style={styles.footer}>
          <Link href="/reset-password">
            <Text variant="label" color="textSecondary">
              Forgot your password?
            </Text>
          </Link>
          <Link href="/sign-up">
            <Text variant="label" color="brandRed">
              Create an account
            </Text>
          </Link>
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
  footer: {
    alignItems: 'center',
    gap: 16,
  },
});
