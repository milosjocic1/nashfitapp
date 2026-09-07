// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

/**
 * Health check (build-plan task 0.7).
 *
 * Deliberately proves three separate things at once, so a green response means
 * the whole Edge Function path is working rather than just "some code ran":
 *
 *   1. The deploy pipeline — the function exists at its URL.
 *   2. The auth gateway — `auth: ['publishable']` means the request is rejected
 *      without a valid project key, so we know the gateway validates keys.
 *   3. The secrets mechanism — NASHFIT_ENV is read from Edge Function secrets
 *      (set with `supabase secrets set`), the same channel that will carry the
 *      Claude API key (6.2), the service-role key for signed URLs (4.2) and the
 *      RevenueCat webhook secret (2.6). If this reads back correctly, that
 *      channel works.
 *
 * Only the publishable key is accepted — a health endpoint has no reason to
 * accept the secret key, and the narrower the auth surface the better.
 */
export default {
  fetch: withSupabase({ auth: ['publishable'] }, () => {
    // Set per Supabase project, so dev and prod report distinctly:
    //   npx supabase secrets set NASHFIT_ENV=development
    const environment = Deno.env.get('NASHFIT_ENV') ?? 'unset';

    return Response.json({
      status: 'ok',
      function: 'health',
      environment,
      timestamp: new Date().toISOString(),
    });
  }),
};
