import {
  DELETE_CONFIRMATION_PHRASE,
  deleteAccount,
  isDeleteConfirmed,
} from '@/features/auth/delete-account';
import { supabase } from '@/lib/supabase';

/**
 * Account deletion is the one action in the app that destroys data with no way
 * back. These tests pin the two things that would be expensive to get wrong:
 * the gate that arms the button, and the fact that the client never names the
 * user it is deleting.
 */

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
    auth: { signOut: jest.fn().mockResolvedValue({ error: null }) },
  },
}));

const invoke = supabase.functions.invoke as jest.Mock;
const signOut = supabase.auth.signOut as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  invoke.mockResolvedValue({ data: { status: 'deleted' }, error: null });
  signOut.mockResolvedValue({ error: null });
});

describe('isDeleteConfirmed', () => {
  it('accepts the exact phrase', () => {
    expect(isDeleteConfirmed(DELETE_CONFIRMATION_PHRASE)).toBe(true);
  });

  it('accepts any case and surrounding whitespace', () => {
    // Phone keyboards autocapitalise unpredictably; the friction that matters
    // is having to type the word at all.
    expect(isDeleteConfirmed('delete')).toBe(true);
    expect(isDeleteConfirmed('Delete')).toBe(true);
    expect(isDeleteConfirmed('  DELETE  ')).toBe(true);
  });

  it('rejects an empty or blank field', () => {
    // The button must not be armed on arrival at the screen.
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('   ')).toBe(false);
  });

  it('rejects partial and near-miss input', () => {
    expect(isDeleteConfirmed('DELET')).toBe(false);
    expect(isDeleteConfirmed('DELETE ME')).toBe(false);
    expect(isDeleteConfirmed('yes')).toBe(false);
  });
});

describe('deleteAccount', () => {
  it('calls the Edge Function without naming a user', async () => {
    await deleteAccount();

    // The id comes from the verified JWT inside the function. If a user id
    // ever appears in this payload, the endpoint has become one that can
    // delete somebody else's account.
    expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
  });

  it('clears the local session only, after a successful delete', async () => {
    const result = await deleteAccount();

    expect(result).toEqual({ status: 'deleted' });
    // A global sign-out would try to revoke a session whose user no longer
    // exists, fail, and leave a stale session in the encrypted store.
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('leaves the session alone when the delete fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('boom') });

    const result = await deleteAccount();

    expect(result.status).toBe('error');
    // Signing the user out of an account that still exists would look like
    // the deletion worked.
    expect(signOut).not.toHaveBeenCalled();
  });

  it('explains an expired session rather than telling the user to retry', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Invalid JWT') });

    const result = await deleteAccount();

    expect(result).toEqual({
      status: 'error',
      message: 'Your session expired. Sign in again, then retry.',
    });
  });

  it('reports a connection failure as one', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Network request failed') });

    const result = await deleteAccount();

    expect(result.status).toBe('error');
    expect(result).toHaveProperty(
      'message',
      'Could not reach the server. Check your connection and try again.',
    );
  });
});
