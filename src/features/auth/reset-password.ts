import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

/**
 * Password reset (task 1.3).
 *
 * Flow: request a reset → Supabase emails a link → the link deep-links back
 * into the app with a recovery token → the app sets a new password.
 *
 * The redirect uses the app's **custom scheme** (`nashfit-dev://` in
 * development, `nashfit://` in production — see app.config.ts), not a Universal
 * Link. Universal Links need an `apple-app-site-association` file hosted on a
 * domain Nash controls, which is not available yet. A custom scheme works
 * without one; the trade-off is that it can be claimed by another app on the
 * device, which is an acceptable risk for a reset link that expires and is
 * single-use. Worth revisiting once the domain exists.
 *
 * The scheme must also be listed under Authentication → URL Configuration in
 * the Supabase dashboard, or the redirect is refused. See the verification
 * checklist, item A3.
 */

export type RequestResetResult = { status: 'sent' } | { status: 'error'; message: string };

export async function requestPasswordReset(email: string): Promise<RequestResetResult> {
  const redirectTo = Linking.createURL('/reset-password/confirm');

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

  if (error) {
    const normalised = error.message.toLowerCase();
    if (normalised.includes('network') || normalised.includes('fetch')) {
      return { status: 'error', message: 'Could not reach the server. Check your connection.' };
    }
    // Rate limiting is the one server error worth naming: it is recoverable by
    // waiting, and a generic message would leave the user retrying into it.
    if (normalised.includes('rate limit') || normalised.includes('too many')) {
      return { status: 'error', message: 'Too many attempts. Wait a minute and try again.' };
    }
    return { status: 'error', message: 'Could not send the reset email. Please try again.' };
  }

  return { status: 'sent' };
}

export type UpdatePasswordResult = { status: 'updated' } | { status: 'error'; message: string };

/**
 * Sets a new password. Requires an active recovery session, which Supabase
 * establishes when the emailed link opens the app.
 */
export async function updatePassword(password: string): Promise<UpdatePasswordResult> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const normalised = error.message.toLowerCase();
    if (normalised.includes('session') || normalised.includes('jwt')) {
      return {
        status: 'error',
        message: 'That reset link has expired. Request a new one.',
      };
    }
    if (normalised.includes('should be different')) {
      return { status: 'error', message: 'Choose a password you have not used before.' };
    }
    return { status: 'error', message: 'Could not update your password. Please try again.' };
  }

  return { status: 'updated' };
}
