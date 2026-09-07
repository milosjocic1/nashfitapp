import { StyleSheet, View } from 'react-native';

import { Text, screenStyles } from '@/components/text';
import { env } from '@/lib/env';
import { colors, radius } from '@/theme';

/**
 * Placeholder home screen — replaced once auth routing lands (task 1.7).
 *
 * Reads `env` deliberately: it exercises the environment config end to end
 * (task 0.4) so a misconfigured build fails visibly on device rather than at
 * the first Supabase call. Now also serves as a smoke test for the brand
 * tokens (task 0.11) — serif heading, sans labels, card on the dark page.
 */
export default function HomeScreen() {
  const rows = [
    ['Environment', env.appEnvironment],
    ['Supabase', env.supabase.url.replace('https://', '')],
    ['PostHog', env.posthog.key ? 'configured' : 'missing'],
    ['Sentry', env.sentry.dsn ? 'configured' : 'not configured'],
  ] as const;

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
            <Text variant="label">{value}</Text>
          </View>
        ))}
      </View>
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
});
