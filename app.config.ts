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
  // Dark only. The brand is dark-first and Nash has approved one palette, a
  // dark one — see docs/nashfit-brand-guidelines.md and src/theme/index.ts.
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: identifiers.bundleId,
  },
  android: {
    package: identifiers.bundleId,
    adaptiveIcon: {
      // Brand black. The logo is designed for a dark field and must never sit
      // on white (§4 of the brand guidelines).
      backgroundColor: '#090708',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
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
    // SDK 57 requires these to be declared explicitly rather than
    // auto-linked. expo-font now loads the Lora/Inter brand faces (0.11);
    // expo-image is still unused but due in Phase 3/4 for exercise thumbnails.
    'expo-font',
    'expo-image',
    'expo-status-bar',
    'expo-web-browser',
    // Sentry ships native code; the plugin wires up the iOS/Android crash
    // handlers and source-map upload at build time (task 0.9).
    //
    // organization/project are required for source-map upload. Without them a
    // production stack trace arrives minified — a captured error nobody can
    // read. Upload also needs SENTRY_AUTH_TOKEN in the build environment; that
    // token grants write access to the Sentry org, so it belongs in EAS build
    // secrets and must never reach the repo or the bundle.
    [
      '@sentry/react-native',
      {
        organization: 'nashfit',
        project: 'nashfit',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        // Brand black in both cases — there is no light theme, and a white
        // splash flashing before a dark app is exactly the jarring launch the
        // dark-first direction avoids.
        backgroundColor: '#090708',
        dark: {
          backgroundColor: '#090708',
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
