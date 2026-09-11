import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Auth stack (task 1.7). Sign-in is the landing screen — most people opening
 * the app already have an account.
 */
export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface0 },
      }}
    />
  );
}
