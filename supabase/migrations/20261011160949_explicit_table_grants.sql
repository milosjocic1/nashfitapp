-- Explicit table-level grants.
--
-- WHY THIS EXISTS. Postgres has two independent access layers, and both must
-- allow a query:
--
--   1. GRANT  — may this role touch this table at all?
--   2. RLS    — which rows of it may this role see?
--
-- Task 0.6 set up RLS carefully and tested it locally. But grants were left to
-- Supabase's defaults, and those turned out to differ between the local stack
-- and the hosted project: locally `anon` held SELECT and was filtered to zero
-- rows by RLS, while on the hosted project the same query returned
-- `42501 permission denied for table exercises` — denied a layer earlier.
--
-- A difference like that makes local RLS testing an unreliable predictor of
-- production behaviour, and in the worst case would have shipped a library
-- that silently fails to load for signed-in users. Granting explicitly makes
-- the two environments agree and puts the intent in the repo where it can be
-- read, rather than inheriting whatever the platform defaults happen to be.
--
-- RLS still does the real work: these grants only open the table, and the
-- policies from 20260905100548 decide the rows.

-- Clean slate first ----------------------------------------------------------
-- Supabase's default privileges grant ALL to both roles on every table in
-- public, so granting on top of that is a no-op and leaves content tables
-- writable at the grant layer. Revoking everything first makes what follows
-- the whole truth rather than an addition to an invisible baseline.
revoke all on all tables in schema public from anon, authenticated;

-- Content tables — signed-in users read, nobody writes -----------------------
-- Nash's content is managed through the dashboard on the service role, which
-- bypasses both layers. No client role has any write privilege here, so an
-- accidental write is refused by grants before RLS is even consulted.
grant select on exercises              to authenticated;
grant select on muscle_groups          to authenticated;
grant select on equipment              to authenticated;
grant select on exercise_muscle_groups to authenticated;
grant select on exercise_equipment     to authenticated;
grant select on exercise_media         to authenticated;

-- User-owned tables ----------------------------------------------------------
-- RLS scopes each of these to the signed-in user's own rows.
grant select, update on users to authenticated;

-- Plans are written server-side by the generation Edge Function on the secret
-- key, so the client reads only. A client able to write a plan row could also
-- approve it, defeating the two-phase review.
grant select on plans to authenticated;

grant select, insert, update, delete on sessions          to authenticated;
grant select, insert, update, delete on session_exercises to authenticated;
grant select, insert, update, delete on sets              to authenticated;

-- anon gets nothing at all. The PRD specifies a hard paywall with no free
-- content or preview, so a client with no session sees an empty database.
-- Covered by the blanket revoke above; stated here so the intent is explicit.
