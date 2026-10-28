import * as Sentry from '@sentry/react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/context';
import { ProfileProvider, useProfile } from '@/features/profile/context';
import { posthog } from '@/lib/analytics';
import { initMonitoring } from '@/lib/monitoring';
import { startSessionRefreshHandling } from '@/lib/supabase';
import { colors } from '@/theme';
import { useBrandFonts } from '@/theme/use-fonts';

// Called at module scope, before any component renders, so errors thrown during
// the very first render are still captured.
initMonitoring();

// Hold the splash screen until the app knows what to show. Without this, text
// renders in a fallback face and then reflows into Lora, and the sign-in screen
// flashes before an already-authenticated user reaches the app.
SplashScreen.preventAutoHideAsync();

/**
 * Navigation chrome in brand colours (task 0.11). Built on DarkTheme rather
 * than switching on the OS scheme: NashFit is dark only — see src/theme.
 */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.brandRed,
    background: colors.surface0,
    card: colors.surface0,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.brandRed,
  },
};

/**
 * App-state routing (tasks 1.7, 5.1).
 *
 * Three mutually exclusive states, each a declared stack behind a guard rather
 * than an imperative redirect inside an effect. The imperative approach is the
 * classic source of navigation races — a redirect firing before the navigator
 * has mounted, or twice on a fast session refresh.
 *
 *   signed out                        -> (auth)
 *   signed in, onboarding incomplete  -> (onboarding)
 *   signed in, onboarding complete    -> (tabs)
 *
 * Subscription gating (task 2.4) slots in as a fourth state between auth and
 * onboarding without restructuring this.
 */
function RootNavigator() {
  const { isSignedIn, initialising: authInitialising } = useAuth();
  const { onboardingComplete, loading: profileLoading } = useProfile();
  const fontsLoaded = useBrandFonts();

  // Three independent async gates: fonts, the stored session, and the profile
  // row that says whether onboarding is done. Render nothing until all three
  // resolve — routing on an unknown profile flashes onboarding at a user who
  // finished it months ago.
  const ready = fontsLoaded && !authInitialising && !(isSignedIn && profileLoading);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface0 } }}
    >
      <Stack.Protected guard={isSignedIn && onboardingComplete}>
        <Stack.Screen name="(tabs)" />
        {/* Logging lives outside the tab bar: an active workout is a focused
            task, and tabs invite wandering off mid-session. */}
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="session/add-exercise" options={{ presentation: 'modal' }} />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="history/[id]" />
        <Stack.Screen name="progress/[exerciseId]" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn && !onboardingComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      {/* Guarded on sign-in ALONE, outside the two states above (task 1.8).
          Apple guideline 5.1.1(v) wants deletion reachable by anyone with an
          account, and a user who signed up but abandoned onboarding has an
          account — they are just not in the tabs yet. Registering this inside
          either group above would strand them with no way out. */}
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="account/delete" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  // Refresh auth tokens only while the app is foregrounded (task 1.1).
  useEffect(startSessionRefreshHandling, []);

  return (
    // Shares the singleton from src/lib/analytics so screen autocapture and
    // manual track() calls use one client.
    <PostHogProvider client={posthog}>
      <AuthProvider>
        {/* Inside AuthProvider: the profile is fetched per signed-in user. */}
        <ProfileProvider>
          <ThemeProvider value={navigationTheme}>
            <RootNavigator />
            {/* Light text: the status bar always sits on a dark surface. */}
            <StatusBar style="light" />
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

// Adds error-boundary and performance instrumentation around the whole app.
export default Sentry.wrap(RootLayout);
