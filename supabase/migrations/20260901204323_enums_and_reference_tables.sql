-- Migration 1 of 4 — enum types and controlled-vocabulary reference tables.
-- Source of truth: docs/nashfit-v1-data-model.md
--
-- Native Postgres enums (rather than text + CHECK) because they generate into
-- TypeScript union types via `supabase gen types`, giving compile-time safety
-- on values like experience_level. Trade-off: adding a value later needs
-- ALTER TYPE ... ADD VALUE, and removing one is awkward. Acceptable — these
-- vocabularies are stable.

-- Exercise-side enums
create type media_type as enum ('video', 'image');
create type muscle_group_role as enum ('primary', 'secondary');

-- User-side enums
create type unit_preference as enum ('kg', 'lb');
create type experience_level as enum ('beginner', 'intermediate', 'advanced');
create type sex as enum ('male', 'female');

-- Plan / session enums
create type plan_status as enum ('pending_review', 'approved', 'rejected', 'active', 'archived');
create type session_creator as enum ('user', 'agent');
create type session_status as enum ('in_progress', 'completed');

-- Reference tables ---------------------------------------------------------
-- Small controlled vocabularies. Exercises reference these rather than storing
-- free text: "chest" / "Chest" / "pecs" is how a taxonomy rots, and the plan
-- generator needs to reason reliably over muscle groups.

create table muscle_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text unique,
  display_order int,
  created_at    timestamptz not null default now()
);

create table equipment (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text unique,
  display_order int,
  created_at    timestamptz not null default now()
);

-- RLS on from creation. With no policies this denies all access, which is the
-- safe default: the publishable key ships in the app bundle, so a table with
-- RLS disabled is readable by anyone who unpacks the app.
-- Read policies for content tables are added in build-plan task 0.6.
alter table muscle_groups enable row level security;
alter table equipment     enable row level security;
