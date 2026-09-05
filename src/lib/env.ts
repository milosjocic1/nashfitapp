import Constants from 'expo-constants';

/**
 * Typed, validated access to environment configuration.
 *
 * Import this instead of touching `process.env` anywhere else in the app.
 *
 * Two Expo specifics worth knowing:
 *
 * 1. `process.env.EXPO_PUBLIC_*` is NOT read at runtime. Metro replaces each
 *    literal occurrence with a string at build time, so these must be written
 *    out in full — `process.env[name]` silently yields undefined because
 *    there's no literal for Metro to substitute. That's why the reads below
 *    are spelled out rather than looped over.
 *
 * 2. Anything `EXPO_PUBLIC_` is embedded in the shipped bundle and extractable.
 *    Only values that are public by design belong here. Secrets live in Edge
 *    Function config — see docs/nashfit-environment-setup.md.
 *
 * Validation runs once at module load, so a misconfigured build fails at
 * startup with a precise message rather than surfacing as an undefined value
 * somewhere deep in a network call.
 */

export type AppEnvironment = 'development' | 'production';

const problems: string[] = [];

function requireValue(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    problems.push(`${name} is missing or empty`);
    return '';
  }
  return trimmed;
}

function expectPrefix(name: string, value: string, prefix: string): string {
  if (value && !value.startsWith(prefix)) {
    problems.push(`${name} should start with "${prefix}" (got "${value.slice(0, 12)}…")`);
  }
  return value;
}

// --- Environment ---------------------------------------------------------
// Set in app.config.ts at build time, so this always reflects how the running
// binary was actually built rather than what a runtime value claims.
const rawEnvironment = Constants.expoConfig?.extra?.appEnvironment as string | undefined;

if (rawEnvironment !== 'development' && rawEnvironment !== 'production') {
  problems.push(
    `extra.appEnvironment must be "development" or "production", got "${rawEnvironment}"`,
  );
}

const appEnvironment = (rawEnvironment ?? 'development') as AppEnvironment;

// --- Supabase ------------------------------------------------------------
const supabaseUrl = requireValue('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
expectPrefix('EXPO_PUBLIC_SUPABASE_URL', supabaseUrl, 'https://');

const supabasePublishableKey = requireValue(
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
expectPrefix('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey, 'sb_publishable_');

// A `service_role`/secret key in the client bundle is a total compromise: it
// bypasses Row Level Security entirely. Fail hard rather than ship it.
if (supabasePublishableKey.startsWith('sb_secret_')) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a Supabase SECRET key. ' +
      'Secret keys bypass Row Level Security and must never reach the client bundle. ' +
      'Use the publishable key (sb_publishable_…) instead.',
  );
}

// --- PostHog -------------------------------------------------------------
const posthogKey = requireValue('EXPO_PUBLIC_POSTHOG_KEY', process.env.EXPO_PUBLIC_POSTHOG_KEY);
expectPrefix('EXPO_PUBLIC_POSTHOG_KEY', posthogKey, 'phc_');

// phx_ is a personal API key — it can read and write private project data.
if (posthogKey.startsWith('phx_')) {
  throw new Error(
    'EXPO_PUBLIC_POSTHOG_KEY holds a PostHog personal API key (phx_). ' +
      'That key reads and writes private data and must not ship in the bundle. ' +
      'Use the project token (phc_…) instead.',
  );
}

const posthogHost = requireValue('EXPO_PUBLIC_POSTHOG_HOST', process.env.EXPO_PUBLIC_POSTHOG_HOST);

// --- Sentry (optional until task 0.9) ------------------------------------
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';

if (problems.length > 0) {
  throw new Error(
    `Environment configuration is invalid:\n` +
      problems.map((p) => `  • ${p}`).join('\n') +
      `\n\nCheck .env.local against .env.example, then restart with ` +
      `\`npx expo start --clear\` — Metro caches these values at build time.`,
  );
}

export const env = {
  appEnvironment,
  isDevelopment: appEnvironment === 'development',
  isProduction: appEnvironment === 'production',
  supabase: {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  },
  posthog: {
    key: posthogKey,
    host: posthogHost,
  },
  sentry: {
    /** Empty until task 0.9; callers should no-op when this is falsy. */
    dsn: sentryDsn,
  },
} as const;
