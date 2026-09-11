import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

/**
 * Sign-up (task 1.1).
 *
 * Note what this does NOT do: create the `users` profile row. That is handled
 * by the `handle_new_user` trigger on `auth.users` (migration
 * 20260901204328_users_and_plans.sql), which fires for every sign-in method —
 * email, Apple (1.4) and Google (1.5) alike. Doing it client-side would mean
 * three separate call sites and an auth user with no profile whenever one was
 * missed.
 */

export type SignUpResult =
  | { status: 'signed_in' }
  | { status: 'confirmation_required'; email: string }
  | { status: 'error'; message: string };

/**
 * Turns Supabase's error strings into something a user can act on.
 *
 * Supabase returns developer-facing messages; showing them raw is how apps end
 * up displaying "AuthApiError: duplicate key value violates unique constraint"
 * to a person trying to sign up.
 */
function toUserMessage(message: string): string {
  const normalised = message.toLowerCase();

  if (normalised.includes('already registered') || normalised.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (normalised.includes('password')) {
    return 'That password was rejected. Try a longer one.';
  }
  if (normalised.includes('email') && normalised.includes('invalid')) {
    return 'That email address was not accepted.';
  }
  if (normalised.includes('network') || normalised.includes('fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong creating your account. Please try again.';
}

export async function signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    return { status: 'error', message: toUserMessage(error.message) };
  }

  // With email confirmation enabled, Supabase returns a user but no session —
  // the account exists and is waiting on the emailed link. Without it, a
  // session comes back immediately. Both are success; they need different UI.
  if (!data.session) {
    return { status: 'confirmation_required', email: email.trim() };
  }

  track('signed_up', { method: 'email' });
  return { status: 'signed_in' };
}
