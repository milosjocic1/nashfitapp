import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Text, screenStyles } from '@/components/text';
import { useAuth } from '@/features/auth/context';
import { signOut } from '@/features/auth/sign-in';
import { env } from '@/lib/env';
import { colors, radius } from '@/theme';

/**
 * Placeholder home screen. Replaced by real content in Phase 3 onwards.
 *
 * Reads `env` deliberately: it exercises the environment config end to end
 * (task 0.4) so a misconfigured build fails visibly on device rather than at
 * the first Supabase call. Carries a sign-out button until there is a settings
 * screen to hold one (task 1.6).
 */
export default function HomeScreen() {
  const { session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const rows = [
    ['Signed in as', session?.user.email ?? 'unknown'],
    ['Environment', env.appEnvironment],
    ['Supabase', env.supabase.url.replace('https://', '')],
    ['PostHog', env.posthog.key ? 'configured' : 'missing'],
    ['Sentry', env.sentry.dsn ? 'configured' : 'not configured'],
  ] as const;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    // No navigation needed: the auth-state listener clears the session and the
    // routing in app/_layout.tsx moves the user to the auth stack.
  }

  return (
    <View style={[screenStyles.screen, styles.container]}>
      <Text variant="display">NashFit</Text>
      <Text variant="caption" color="textMuted">
        Build configuration
      </Text>

      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text variant="label" color="textSecondary">
              {label}
            </Text>
            <Text variant="label" numberOfLines={1} style={styles.value}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Button
        label="Sign out"
        variant="secondary"
        onPress={handleSignOut}
        loading={signingOut}
        style={styles.signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  // Card: surface1 on the surface0 page, hairline border, 12px radius (§5).
  card: {
    marginTop: 16,
    alignSelf: 'stretch',
    backgroundColor: colors.surface1,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  value: {
    flexShrink: 1,
  },
  signOut: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});
