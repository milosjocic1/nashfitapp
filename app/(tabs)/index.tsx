import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { env } from '@/lib/env';

/**
 * Placeholder home screen — replaced once auth routing lands (task 1.7).
 *
 * It reads `env` deliberately: it exercises the environment config end to end
 * (task 0.4) so a misconfigured build fails visibly on device rather than at
 * the first Supabase call.
 */
export default function HomeScreen() {
  const supabaseHost = env.supabase.url.replace('https://', '');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">NashFit</ThemedText>

      <ThemedView style={styles.details}>
        <ThemedText>Environment: {env.appEnvironment}</ThemedText>
        <ThemedText>Supabase: {supabaseHost}</ThemedText>
        <ThemedText>PostHog: {env.posthog.key ? 'configured' : 'missing'}</ThemedText>
        <ThemedText>
          Sentry: {env.sentry.dsn ? 'configured' : 'not set up yet (task 0.9)'}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  details: {
    alignItems: 'center',
    gap: 4,
  },
});
