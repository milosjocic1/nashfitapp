import * as Sentry from '@sentry/react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { posthog } from '@/lib/analytics';
import { initMonitoring } from '@/lib/monitoring';
import { colors } from '@/theme';
import { useBrandFonts } from '@/theme/use-fonts';

// Called at module scope, before any component renders, so errors thrown during
// the very first render are still captured.
initMonitoring();

// Hold the splash screen until the brand fonts are ready. Without this, text
// renders in a fallback face and then reflows into Lora — a visible jump on
// every launch.
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

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const fontsLoaded = useBrandFonts();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    // Shares the singleton from src/lib/analytics so screen autocapture and
    // manual track() calls use one client.
    <PostHogProvider client={posthog}>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: colors.surface0 } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        {/* Light text: the status bar always sits on a dark surface. */}
        <StatusBar style="light" />
      </ThemeProvider>
    </PostHogProvider>
  );
}

// Adds error-boundary and performance instrumentation around the whole app.
export default Sentry.wrap(RootLayout);
