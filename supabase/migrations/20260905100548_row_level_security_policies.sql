-- Migration 5 — Row Level Security policies (build-plan task 0.6).
--
-- RLS was enabled on every table at creation, which denies everything. This
-- migration opens the specific doors described in task 0.6:
--   * a user reads/writes only their own users/plans/sessions/session_exercises/sets
--   * exercise content tables are read-only to clients
--
-- Roles: `authenticated` is a signed-in user; `anon` is a client with no
-- session. The app is behind a hard paywall with no free content, so `anon`
-- gets nothing at all — not even the exercise library.
--
-- `service_role` (and the Edge Functions using the secret key) BYPASSES RLS
-- entirely, which is how plan generation writes agent-authored sessions and
-- how content is managed from the Supabase dashboard.
--
-- Note on `(select auth.uid())`: wrapping it in a subselect lets Postgres
-- evaluate it once per query instead of once per row. On the sets table that
-- is the difference between one call and one per logged set.

-- ---------------------------------------------------------------------------
-- Content tables — read-only to signed-in users
-- ---------------------------------------------------------------------------
-- SELECT only. No insert/update/delete policies exist, so those are denied for
-- every client role. Nash's content changes go through the dashboard, which
-- uses service_role.

create policy "Signed-in users can read exercises"
  on exercises for select to authenticated using (true);

create policy "Signed-in users can read muscle groups"
  on muscle_groups for select to authenticated using (true);

create policy "Signed-in users can read equipment"
  on equipment for select to authenticated using (true);

create policy "Signed-in users can read exercise muscle groups"
  on exercise_muscle_groups for select to authenticated using (true);

create policy "Signed-in users can read exercise equipment"
  on exercise_equipment for select to authenticated using (true);

create policy "Signed-in users can read exercise media"
  on exercise_media for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- users — own profile only
-- ---------------------------------------------------------------------------
-- No INSERT policy: rows are created by the handle_new_user trigger, which is
-- security definer and so bypasses RLS. A client must never be able to
-- fabricate a profile row for an id it doesn't own.
--
-- No DELETE policy: account deletion happens through Supabase Auth, and the
-- FK to auth.users cascades.

create policy "Users can read their own profile"
  on users for select to authenticated
  using (id = (select auth.uid()));

-- Covers onboarding inputs (task 5.1) and unit preference (task 5.3).
create policy "Users can update their own profile"
  on users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plans — read-only to the user who owns them
-- ---------------------------------------------------------------------------
-- Plans are written server-side by the generation Edge Function (task 6.4)
-- using the secret key, so no client insert/update policy is needed. A client
-- that could write its own plan row could also approve it.
--
-- All statuses are visible, deliberately. The plans row holds metadata only —
-- principles_version, input_snapshot, status — not the workout itself. Letting
-- the user see a `pending_review` row is what makes the "your plan is being
-- prepared" state possible (task 6.8). The actual prescribed content is
-- withheld at the sessions level below.

create policy "Users can read their own plans"
  on plans for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- sessions — own sessions, with the plan review gate
-- ---------------------------------------------------------------------------
-- This is where two-phase review is actually enforced. A session belonging to
-- a plan is only visible once that plan is approved or active; an ad-hoc
-- session (plan_id is null) is always visible.
--
-- This does NOT hardcode a phase, per CLAUDE.md. The phase toggle decides what
-- status a plan is CREATED with; this policy only ever asks what the status IS
-- now. Phase 1 creates pending_review and the content stays hidden until a
-- reviewer flips it; Phase 2 creates approved and it is visible immediately.
-- The same policy is correct in both.

create policy "Users can read their own visible sessions"
  on sessions for select to authenticated
  using (
    user_id = (select auth.uid())
    and (
      plan_id is null
      or exists (
        select 1 from plans
        where plans.id = sessions.plan_id
          and plans.status in ('approved', 'active')
      )
    )
  );

-- Ad-hoc sessions only (task 7.2). `created_by = 'user'` is enforced so a
-- client cannot forge agent provenance and pass its own workout off as a
-- Nash-generated plan.
create policy "Users can create their own ad-hoc sessions"
  on sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and created_by = 'user'
  );

-- Covers marking a session completed and renaming it. Agent-authored sessions
-- are updatable too — the user logs against them and completes them.
create policy "Users can update their own sessions"
  on sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own sessions"
  on sessions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- session_exercises — ownership inherited from the parent session
-- ---------------------------------------------------------------------------
-- The SELECT policy repeats the plan review gate rather than relying on the
-- sessions policy: RLS is evaluated per table, so a direct query against
-- session_exercises with a known session id would otherwise bypass it.

create policy "Users can read their own visible session exercises"
  on session_exercises for select to authenticated
  using (
    exists (
      select 1 from sessions
      where sessions.id = session_exercises.session_id
        and sessions.user_id = (select auth.uid())
        and (
          sessions.plan_id is null
          or exists (
            select 1 from plans
            where plans.id = sessions.plan_id
              and plans.status in ('approved', 'active')
          )
        )
    )
  );

create policy "Users can add exercises to their own sessions"
  on session_exercises for insert to authenticated
  with check (
    exists (
      select 1 from sessions
      where sessions.id = session_exercises.session_id
        and sessions.user_id = (select auth.uid())
    )
  );

-- Supports reordering within an ad-hoc session (task 7.4).
create policy "Users can update their own session exercises"
  on session_exercises for update to authenticated
  using (
    exists (
      select 1 from sessions
      where sessions.id = session_exercises.session_id
        and sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from sessions
      where sessions.id = session_exercises.session_id
        and sessions.user_id = (select auth.uid())
    )
  );

create policy "Users can remove exercises from their own sessions"
  on session_exercises for delete to authenticated
  using (
    exists (
      select 1 from sessions
      where sessions.id = session_exercises.session_id
        and sessions.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- sets — ownership inherited through session_exercises -> sessions
-- ---------------------------------------------------------------------------
-- Logged sets are the user's own actual performance, so they are readable
-- regardless of plan review state: a set only exists because the user recorded
-- it, and withholding their own logged data would make no sense. The review
-- gate protects unapproved *prescriptions*, not actuals.

create policy "Users can read their own sets"
  on sets for select to authenticated
  using (
    exists (
      select 1 from session_exercises
      join sessions on sessions.id = session_exercises.session_id
      where session_exercises.id = sets.session_exercise_id
        and sessions.user_id = (select auth.uid())
    )
  );

create policy "Users can log sets on their own sessions"
  on sets for insert to authenticated
  with check (
    exists (
      select 1 from session_exercises
      join sessions on sessions.id = session_exercises.session_id
      where session_exercises.id = sets.session_exercise_id
        and sessions.user_id = (select auth.uid())
    )
  );

create policy "Users can update their own sets"
  on sets for update to authenticated
  using (
    exists (
      select 1 from session_exercises
      join sessions on sessions.id = session_exercises.session_id
      where session_exercises.id = sets.session_exercise_id
        and sessions.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from session_exercises
      join sessions on sessions.id = session_exercises.session_id
      where session_exercises.id = sets.session_exercise_id
        and sessions.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their own sets"
  on sets for delete to authenticated
  using (
    exists (
      select 1 from session_exercises
      join sessions on sessions.id = session_exercises.session_id
      where session_exercises.id = sets.session_exercise_id
        and sessions.user_id = (select auth.uid())
    )
  );
