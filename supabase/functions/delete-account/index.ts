// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

/**
 * Account deletion (build-plan task 1.8).
 *
 * Apple guideline 5.1.1(v) makes in-app account deletion mandatory for any app
 * that offers account creation, and its absence is a rejection rather than a
 * note. This is the server half: a client cannot delete its own auth user —
 * that needs the secret key, which never leaves an Edge Function.
 *
 * Deletion is **immediate and permanent**. There is no soft-delete and no
 * grace period, decided 2026-10-24: a scheduled deletion is a promise kept by
 * a background job, and a job that silently stops means telling users their
 * data is gone while it is still in the table. Immediate deletion either works
 * or fails in front of the user.
 *
 * Everything else follows from the schema. Deleting the `auth.users` row
 * cascades to `public.users`, and from there to `plans`, `sessions`,
 * `session_exercises` and `sets`. Verified against the real schema on
 * 2026-10-24, including the case that looked risky: `sessions.plan_id` is
 * ON DELETE RESTRICT, so a plan with training logged against it cannot be
 * deleted — but a whole-user cascade still succeeds, because the
 * `sessions.user_id` cascade is queued by the same statement and therefore
 * runs before the nested RESTRICT check. Nash's protection against deleting a
 * plan someone trained against stays intact; this path is unaffected.
 */

/** What the client is told. Deliberately vague — see the handler. */
const FAILURE_MESSAGE = 'Could not delete the account.';

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    // `auth: 'user'` already rejects anything without a valid, unexpired user
    // JWT, so reaching this line means the caller is authenticated. The
    // publishable key alone is not enough — contrast the health check, which
    // accepts it.
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed.' }, { status: 405 });
    }

    // The id comes from the verified token and NOWHERE else. Reading a user id
    // out of the request body would turn this into an endpoint that lets any
    // authenticated user delete any other account.
    const userId = ctx.userClaims?.id;

    if (!userId) {
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // `false` = hard delete, not Supabase's soft delete. Spelled out because
    // the default is easy to misread and the difference is the whole point:
    // a soft-deleted user still holds the email address and the row.
    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);

    // Already gone. Reachable with a still-valid token after the account was
    // deleted on another device: the JWT stays cryptographically valid until
    // it expires, so the request authenticates fine and only fails here.
    // Deletion is idempotent — the caller asked for the account not to exist,
    // and it does not. Reporting a failure would send someone chasing support
    // over an account that is already deleted.
    if (error && (error.status === 404 || /user not found/i.test(error.message))) {
      return Response.json({ status: 'deleted' });
    }

    if (error) {
      // Logged in full for us, returned vague to the caller. The client is
      // already authenticated as this user, so there is little to leak, but an
      // error string from the auth admin API is no use to them either.
      console.error('delete-account failed', { userId, message: error.message });
      return Response.json({ error: FAILURE_MESSAGE }, { status: 500 });
    }

    return Response.json({ status: 'deleted' });
  }),
};
