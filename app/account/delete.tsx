import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { TextField } from '@/components/text-field';
import {
  DELETE_CONFIRMATION_PHRASE,
  deleteAccount,
  isDeleteConfirmed,
} from '@/features/auth/delete-account';
import { colors, radius } from '@/theme';

/**
 * Delete account (task 1.8).
 *
 * A full screen rather than an alert, on purpose. Three things have to be read
 * before someone destroys their training history, and an alert is the one
 * surface people are trained to dismiss without reading.
 *
 * The third point — that deleting the account does **not** cancel the
 * subscription — is the one with a cost attached if it goes unsaid. Store
 * subscriptions live with Apple and Google, not with us; a user who deletes
 * their account and assumes billing stopped keeps paying. Phase 2 has not
 * landed yet, so nobody has a subscription to cancel today, but the copy is
 * written now so it is not forgotten at launch.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const armed = isDeleteConfirmed(confirmation);

  async function handleDelete() {
    if (!armed || deleting) {
      return;
    }

    setDeleting(true);
    setError(undefined);

    const result = await deleteAccount();

    if (result.status === 'error') {
      setError(result.message);
      setDeleting(false);
      return;
    }

    // Deliberately no navigation and no success toast. The session is gone, so
    // the root navigator has already swapped to the auth stack — there is no
    // longer a screen here to show anything on. Leaving `deleting` true keeps
    // the button busy for the frame before this unmounts.
  }

  return (
    <KeyboardAvoidingView
      style={screenStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.heading}>
          <Text variant="display">Delete your account</Text>
          <Text color="textSecondary">
            This is permanent. Read what goes before you confirm it.
          </Text>
        </View>

        <View style={styles.card}>
          <Consequence
            title="Your training history is erased"
            detail="Every workout you have logged, every set, and the plans built for you. None of it can be recovered — not by you, and not by us."
          />
          <Divider />
          <Consequence
            title="Your subscription is not cancelled"
            detail={`Subscriptions are held by ${Platform.OS === 'ios' ? 'Apple' : 'Google'}, not by NashFit. Deleting your account here does not stop the billing — cancel it in ${Platform.OS === 'ios' ? 'Settings → your name → Subscriptions' : 'the Play Store → Payments and subscriptions'}.`}
          />
          <Divider />
          <Consequence
            title="Signing up again starts from nothing"
            detail="You can make a new account with the same email, but it begins empty. Nothing from this one carries across."
          />
        </View>

        <View style={styles.confirmBlock}>
          <TextField
            label={`Type ${DELETE_CONFIRMATION_PHRASE} to confirm`}
            value={confirmation}
            onChangeText={(next) => {
              setConfirmation(next);
              setError(undefined);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
            returnKeyType="done"
          />

          {error ? (
            <Text variant="caption" color="error" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button
          label="Delete my account permanently"
          variant="destructive"
          onPress={handleDelete}
          disabled={!armed}
          loading={deleting}
        />
        {/* Cancel sits below the destructive action but is the easier target to
            find: it is the outcome most people arriving here actually want. */}
        <Button
          label="Keep my account"
          variant="secondary"
          onPress={() => router.back()}
          disabled={deleting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Consequence({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.consequence}>
      <Text variant="label">{title}</Text>
      <Text variant="caption" color="textSecondary">
        {detail}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 24,
  },
  heading: {
    gap: 8,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  consequence: {
    gap: 6,
    paddingVertical: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  confirmBlock: {
    gap: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
});
