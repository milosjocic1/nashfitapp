import { supabase } from '@/lib/supabase';

/**
 * Account deletion, client half (task 1.8).
 *
 * The deletion itself happens in the `delete-account` Edge Function, which
 * holds the secret key. This module is the call, the typed-confirmation gate,
 * and the local cleanup afterwards.
 */

export type DeleteAccountResult = { status: 'deleted' } | { status: 'error'; message: string };

/**
 * The word the user must type to arm the delete button.
 *
 * Deletion is immediate and irreversible, so the confirmation carries the
 * weight a grace period would otherwise carry. A two-button alert is dismissed
 * by muscle memory; typing a word is not something you do by accident.
 */
export const DELETE_CONFIRMATION_PHRASE = 'DELETE';

/**
 * Case-insensitive and whitespace-tolerant. The friction that matters is
 * having to type the word at all — rejecting "delete" for its lower case would
 * only punish phone keyboards, which autocapitalise unpredictably.
 */
export function isDeleteConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_CONFIRMATION_PHRASE;
}

function toUserMessage(message: string): string {
  const normalised = message.toLowerCase();

  if (normalised.includes('network') || normalised.includes('fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  // A JWT that expired while the user sat on the confirmation screen. Worth
  // its own message: "try again" is wrong advice, signing in again is right.
  if (normalised.includes('jwt') || normalised.includes('401')) {
    return 'Your session expired. Sign in again, then retry.';
  }
  return 'Could not delete your account. Please try again, or contact support if this keeps happening.';
}

/**
 * Deletes the signed-in user's account and everything cascading from it.
 *
 * No user id is passed: the Edge Function reads it from the verified JWT, so
 * this call can only ever delete the caller's own account.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });

  if (error) {
    return { status: 'error', message: toUserMessage(error.message) };
  }

  // `scope: 'local'` deliberately. The default global sign-out asks the server
  // to revoke the session — but the user it belonged to no longer exists, so
  // that call fails and would leave a valid-looking session in the encrypted
  // store pointing at a deleted account. Local clears the device, which is all
  // that is left to clear: deleting the auth user already revoked the session
  // server-side.
  await supabase.auth.signOut({ scope: 'local' });

  // No navigation here. The auth listener in src/features/auth/context sees the
  // session go, which flips the routing in app/_layout.tsx back to the auth
  // stack — the same path a normal sign-out takes. It also resets the PostHog
  // and Sentry identities, so no further events attribute to a deleted user.
  return { status: 'deleted' };
}
