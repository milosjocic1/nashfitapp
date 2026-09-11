import { supabase } from '@/lib/supabase';

/**
 * Sign-in (task 1.2).
 */

export type SignInResult = { status: 'signed_in' } | { status: 'error'; message: string };

/**
 * Supabase returns "Invalid login credentials" for both a wrong password and an
 * unknown email, deliberately — distinguishing them would let an attacker
 * enumerate which addresses have accounts. That vagueness is preserved here
 * rather than "helpfully" telling the user which half was wrong.
 */
function toUserMessage(message: string): string {
  const normalised = message.toLowerCase();

  if (normalised.includes('invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (normalised.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link we sent.';
  }
  if (normalised.includes('network') || normalised.includes('fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong signing you in. Please try again.';
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { status: 'error', message: toUserMessage(error.message) };
  }

  return { status: 'signed_in' };
}

/**
 * Sign out (task 1.6).
 *
 * Clears the session from the encrypted store. Analytics and monitoring
 * identities are reset by the auth-state listener in src/features/auth/context
 * rather than here, so they clear on *any* sign-out — including a session
 * expiring — not only on an explicit tap.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
