import PostHog from 'posthog-react-native';

import { env } from '@/lib/env';

/**
 * Product analytics (build-plan task 0.10).
 *
 * The tech-stack doc is explicit that key events must be instrumented from day
 * one — retrofitting later loses all early data. So the point of this module is
 * that adding an event anywhere in the app is one typed call:
 *
 *   track('exercise_viewed', { exercise_id: id, source: 'library' });
 *
 * Event names and their properties are declared together in `EventProperties`
 * below, so a typo or a missing property is a compile error rather than a
 * silently malformed event that nobody notices until someone opens a funnel
 * three months later.
 *
 * Crash and error reporting is Sentry's job (task 0.9), not PostHog's.
 */

/**
 * Every analytics event in the app, with the properties it carries.
 *
 * The first six are the events task 9.1 audits before launch. Add new ones
 * here rather than calling `capture` directly anywhere else.
 */
type EventProperties = {
  signed_up: { method: 'email' | 'apple' | 'google' };
  subscribed: { plan: 'annual' | 'monthly' };
  onboarding_completed: {
    experience_level: 'beginner' | 'intermediate' | 'advanced';
    training_days_per_week: number;
  };
  plan_generated: { plan_id: string; principles_version: string };
  exercise_viewed: { exercise_id: string; source: 'library' | 'plan' };
  session_logged: {
    session_id: string;
    created_by: 'user' | 'agent';
    set_count: number;
  };
  video_played: { exercise_id: string };
};

export type AnalyticsEvent = keyof EventProperties;

/**
 * Autocapture is configured explicitly rather than left to defaults, so the
 * behaviour is visible in the repo instead of living in a dashboard toggle
 * nobody can see from the code.
 *
 * - `captureTouches` OFF. A workout logger is tap-heavy by design; capturing
 *   every touch would generate large billable volume, bury the seven events
 *   above, and key off a component tree that changes constantly during
 *   development. It can also pick up rendered text, which matters in an app
 *   holding health data.
 * - `captureScreens` ON. One event per navigation, not per tap — cheap, and
 *   it is what makes retention and drop-off analysis possible.
 * - `captureAppLifecycleEvents` ON. App opened/backgrounded; needed for any
 *   meaningful retention measure.
 */
const autocaptureConfig = {
  captureTouches: false,
  captureScreens: true,
  captureAppLifecycleEvents: true,
} as const;

export const posthog = new PostHog(env.posthog.key, {
  host: env.posthog.host,
  ...autocaptureConfig,
});

/**
 * Record an event. Properties are required and typed per event.
 */
export function track<E extends AnalyticsEvent>(event: E, properties: EventProperties[E]): void {
  posthog.capture(event, {
    ...properties,
    // Lets dev traffic be filtered out of product dashboards without needing a
    // separate PostHog project.
    app_environment: env.appEnvironment,
  });
}

/**
 * Associate subsequent events with a signed-in user. Call after sign-in and on
 * app start when a session is restored (task 1.6).
 *
 * Only the Supabase auth id is sent — no email, no name. There is no reason for
 * the analytics provider to hold identifying details.
 */
export function identifyUser(userId: string): void {
  posthog.identify(userId);
}

/**
 * Clear the identity on sign-out so the next user on a shared device is not
 * attributed to the previous one.
 */
export function resetUser(): void {
  posthog.reset();
}
