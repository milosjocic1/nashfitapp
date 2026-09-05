import type { ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Replaces app.json so the build can vary by environment.
 *
 * APP_ENV comes from .env.local (dev) or EAS build secrets (production).
 * It is deliberately NOT prefixed EXPO_PUBLIC_ — it is a build-time input to
 * this file, not a runtime value. The resolved environment is passed to the
 * app through `extra` below, so the running app always reports the environment
 * it was actually built with.
 */
type AppEnvironment = 'development' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnvironment;

if (APP_ENV !== 'development' && APP_ENV !== 'production') {
  throw new Error(`APP_ENV must be "development" or "production", got "${APP_ENV}"`);
}

const isProduction = APP_ENV === 'production';

/**
 * Dev and production are separate apps to the OS, so both can be installed on
 * one device with separate storage, keychains and databases. This matters for
 * task 8.5 (offline sync testing), which needs a dev build and a production
 * build side by side without one clobbering the other's SQLite database.
 *
 * These are permanent once a store listing exists — an app's identifier cannot
 * be changed afterwards.
 */
const identifiers = {
  bundleId: isProduction ? 'com.nashfit.app' : 'com.nashfit.app.dev',
  name: isProduction ? 'NashFit' : 'NashFit (Dev)',
  // Distinct schemes too: two installed apps claiming the same deep-link
  // scheme means the OS picks one arbitrarily.
  scheme: isProduction ? 'nashfit' : 'nashfit-dev',
};

const config: ExpoConfig = {
  name: identifiers.name,
  slug: 'nashfitapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: identifiers.scheme,
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: identifiers.bundleId,
  },
  android: {
    package: identifiers.bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // Required by posthog-react-native to report device locale.
    'expo-localization',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: {
          backgroundColor: '#000000',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  // Surfaced to the running app via expo-constants; read in src/lib/env.ts.
  extra: {
    appEnvironment: APP_ENV,
  },
};

export default config;
