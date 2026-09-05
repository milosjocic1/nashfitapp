-- Migration 2 of 4 — the exercise library.
-- Both a browsable catalogue (Epic 3) and the pool the plan generator selects
-- from (Epic 6). The generator may only assemble from these rows; it must
-- never invent exercises.

create table exercises (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  -- Ordered list of discrete cues, rendered as a list in the UI (task 4.3).
  form_cues        jsonb not null default '[]'::jsonb,
  common_mistakes  jsonb not null default '[]'::jsonb,
  -- Taxonomy (hinge, squat, horizontal push…). No v1 UI, but the generator
  -- uses it to cover movement patterns per Nash's selection rules.
  movement_pattern text,
  created_at       timestamptz not null default now()
);

-- Many-to-many with a role, so an exercise can have primary and secondary
-- muscles. Deleting an exercise removes its links; a muscle group still in use
-- cannot be deleted.
create table exercise_muscle_groups (
  exercise_id     uuid not null references exercises(id)     on delete cascade,
  muscle_group_id uuid not null references muscle_groups(id) on delete restrict,
  role            muscle_group_role not null,
  primary key (exercise_id, muscle_group_id)
);

-- Link table rather than a single FK on exercises: most real exercises need
-- more than one piece of kit (barbell + bench, cable + rope attachment), and
-- moving one-to-many later would mean rewriting every equipment query plus the
-- generator's filtering. Decided 2026-09-01.
create table exercise_equipment (
  exercise_id  uuid not null references exercises(id) on delete cascade,
  equipment_id uuid not null references equipment(id) on delete restrict,
  primary key (exercise_id, equipment_id)
);

-- One table for all media; video and image share nearly every attribute.
create table exercise_media (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id) on delete cascade,
  media_type  media_type not null,
  -- Storage KEY, not a public URL. Private bucket; an Edge Function mints a
  -- short-lived signed URL at play time (task 4.2). The client never sees a
  -- raw URL.
  url         text not null,
  is_primary  boolean not null default false,
  position    int not null default 0,
  caption     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Composite primary keys already index their leading column, so only the
-- trailing columns need their own index.
create index exercise_muscle_groups_muscle_group_id_idx on exercise_muscle_groups (muscle_group_id);
create index exercise_equipment_equipment_id_idx        on exercise_equipment (equipment_id);
create index exercise_media_exercise_id_idx             on exercise_media (exercise_id);

-- NOTE: is_primary does not enforce "one primary per media_type per exercise".
-- Per the data model this stays app logic for v1. If it needs enforcing later:
--   create unique index on exercise_media (exercise_id, media_type) where is_primary;

alter table exercises              enable row level security;
alter table exercise_muscle_groups enable row level security;
alter table exercise_equipment     enable row level security;
alter table exercise_media         enable row level security;
