-- Migration 4 of 4 — sessions, their exercises, and logged sets.
--
-- These three tables use CLIENT-GENERATED UUIDs and deliberately have NO
-- `default gen_random_uuid()`. Offline rows need stable ids before they sync
-- (Epic 8), and omitting the default means a client that forgets to generate
-- one fails loudly instead of the database silently minting an id and masking
-- the bug. `plans` above is server-generated and does have a default.

create table sessions (
  id           uuid primary key,
  user_id      uuid not null references users(id) on delete cascade,

  -- Set when the session belongs to a generated plan; null for ad-hoc.
  -- RESTRICT: a plan someone has trained against cannot be deleted, only
  -- archived (plan_status has 'archived').
  plan_id      uuid references plans(id) on delete restrict,

  -- 'user' = ad-hoc, 'agent' = AI-prescribed. Both occur in v1.
  created_by   session_creator not null,

  -- When the workout happened, distinct from created_at. Nullable: the agent
  -- creates a prescribed session before it has been performed, so this stays
  -- null until the user actually trains it.
  performed_at timestamptz,

  name         text,

  -- Supports offline resume after an interruption (task 8.4).
  status       session_status not null default 'in_progress',
  created_at   timestamptz not null default now()
);

-- An exercise within a session, in order. Home of the prescription vs actual
-- split: prescribed_* is what the AI (via Nash's rules) said to do; the `sets`
-- table below is what the user actually did. Ad-hoc sessions leave the
-- prescription null. Never conflate the two.
create table session_exercises (
  id              uuid primary key,
  session_id      uuid not null references sessions(id) on delete cascade,

  -- RESTRICT: deleting a library exercise must not destroy logged history.
  -- Retire the exercise instead. Decided 2026-09-01.
  exercise_id     uuid not null references exercises(id) on delete restrict,

  position        int not null,

  -- Written by the AI. Null for ad-hoc user sessions. Prescription is at the
  -- exercise level ("3x8 @ 80kg"), not per set.
  prescribed_sets  int,
  prescribed_reps  int,
  prescribed_load  numeric,
  prescribed_notes text,

  created_at      timestamptz not null default now()
);

-- An individual logged set — the ACTUAL data.
create table sets (
  id                  uuid primary key,
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  set_number          int not null,

  -- Stored AS ENTERED, in the user's unit_preference. No conversion.
  -- See the units edge case in the data model — to be resolved before launch.
  weight              numeric not null,
  reps                int not null,
  rpe                 numeric,
  logged_at           timestamptz not null default now()
);

create index sessions_user_id_idx              on sessions (user_id);
create index sessions_plan_id_idx              on sessions (plan_id);
create index session_exercises_session_id_idx  on session_exercises (session_id);
create index sets_session_exercise_id_idx      on sets (session_exercise_id);

-- Deliberately NOT adding unique (session_id, position) or
-- unique (session_exercise_id, set_number): reordering exercises within a
-- session (task 7.4) against a non-deferrable unique constraint requires
-- awkward shuffling. Ordering is app-enforced for v1.

alter table sessions          enable row level security;
alter table session_exercises enable row level security;
alter table sets              enable row level security;
