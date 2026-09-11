import * as Sentry from '@sentry/react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/features/auth/context';
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
 * Auth-state routing (task 1.7).
 *
 * Both stacks are declared and expo-router's `Protected` guard decides which is
 * reachable, rather than imperatively redirecting from inside an effect. The
 * imperative approach is the classic source of navigation races — a redirect
 * firing before the navigator has mounted, or twice on a fast session refresh.
 *
 * Subscription gating (task 2.4) adds a third state here: signed in but not
 * subscribed goes to the paywall.
 */
function RootNavigator() {
  const { isSignedIn, initialising } = useAuth();
  const fontsLoaded = useBrandFonts();

  // Two independent async gates: fonts, and reading the stored session out of
  // encrypted storage. Render nothing until both resolve — routing on an
  // unknown session is what makes the auth screen flash on a cold start.
  const ready = fontsLoaded && !initialising;

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
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
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
        <ThemeProvider value={navigationTheme}>
          <RootNavigator />
          {/* Light text: the status bar always sits on a dark surface. */}
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </PostHogProvider>
  );
}

// Adds error-boundary and performance instrumentation around the whole app.
export default Sentry.wrap(RootLayout);
