import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Onboarding stack (task 5.1). Gesture dismissal is off: this flow is not
 * optional, and swiping out of it would leave a signed-in user with no plan
 * inputs and nowhere to go.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.surface0 },
      }}
    />
  );
}
