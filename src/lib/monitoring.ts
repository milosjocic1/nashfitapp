import * as Sentry from '@sentry/react-native';

import { env } from '@/lib/env';

/**
 * Crash and error monitoring (build-plan task 0.9).
 *
 * Sentry owns errors and crashes; PostHog (src/lib/analytics.ts) owns product
 * behaviour. Keeping that split means neither tool's signal is diluted by the
 * other's noise — the reason PostHog's error tracking was declined at 0.10.
 *
 * Call `initMonitoring()` once, as early as possible, before the app renders.
 */

/**
 * Initialise Sentry. Safe to call when no DSN is configured — it no-ops, so a
 * contributor without one still gets a working app rather than a crash on boot.
 */
export function initMonitoring(): void {
  if (!env.sentry.dsn) {
    if (__DEV__) {
      console.warn('[monitoring] EXPO_PUBLIC_SENTRY_DSN is not set — Sentry disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentry.dsn,

    // Tags every event, so development noise can be excluded from production
    // alerting without needing a second Sentry project.
    environment: env.appEnvironment,

    // Errors are always sent. Performance tracing is sampled: full sampling in
    // development for visibility, 20% in production because traces are billed
    // per transaction and a workout logger produces a lot of navigation.
    tracesSampleRate: env.isProduction ? 0.2 : 1.0,

    // Local error reporting is mostly noise from hot reloads and half-finished
    // code. Metro already surfaces those in the console and on the red screen.
    enabled: !__DEV__,

    // The app handles health data (age, sex, training history). Sentry's
    // default already excludes PII; stating it explicitly means the decision is
    // visible in the repo rather than resting on a library default that could
    // change.
    sendDefaultPii: false,
  });
}

/**
 * Attach the signed-in user to subsequent error reports, so a crash can be
 * traced to an account without hunting through logs. Call alongside
 * `identifyUser` from src/lib/analytics.ts (tasks 1.6, 1.7).
 *
 * Only the Supabase auth id is sent — never email or name, matching the
 * analytics module and keeping identifying details out of a third party.
 */
export function setMonitoringUser(userId: string): void {
  Sentry.setUser({ id: userId });
}

/**
 * Clear the user on sign-out so errors from the next person on a shared device
 * are not attributed to the previous one.
 */
export function clearMonitoringUser(): void {
  Sentry.setUser(null);
}
