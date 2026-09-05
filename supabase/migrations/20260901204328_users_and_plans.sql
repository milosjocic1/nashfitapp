-- Migration 3 of 4 — user profiles and AI-generated plans.

-- App-specific profile, keyed to the Supabase Auth user id.
-- RevenueCat remains the source of truth for subscription state; nothing about
-- subscriptions is stored here.
create table users (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,

  -- PREFERENCE — display only. Must never trigger plan regeneration.
  unit_preference       unit_preference not null default 'kg',

  -- PLAN INPUTS — these four drive generation (docs/nashfit-user-info-
  -- gathering-template.md). Nullable because the row is created at signup
  -- (Phase 1) but these aren't collected until onboarding (Phase 5).
  -- "Onboarding complete" = all four non-null.
  age                   int,
  experience_level      experience_level,
  sex                   sex,
  training_days_per_week int,

  created_at            timestamptz not null default now(),

  -- Ranges from the onboarding template. Defence in depth behind the app-level
  -- validation in task 5.5. Relax if the Principles Document supports other
  -- training-day counts.
  constraint users_age_range
    check (age is null or age between 16 and 90),
  constraint users_training_days_supported
    check (training_days_per_week is null or training_days_per_week between 3 and 6)
);

-- Create the profile row automatically when an auth user is created.
--
-- A trigger rather than client-side insert because v1 offers three sign-in
-- paths — email/password (1.1), Apple (1.4) and Google (1.5) — and the OAuth
-- callbacks don't reliably run app insert code. One place, all paths covered.
--
-- `security definer` so it can write to public.users regardless of the caller,
-- and `set search_path = ''` to prevent search_path hijacking, which is why
-- every reference below is schema-qualified.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- An AI-generated plan, its provenance, and its review state.
create table plans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,

  -- Which version of Nash's Principles Document produced this plan. Plans stay
  -- traceable to the ruleset that generated them.
  principles_version text not null,

  -- The age/experience/sex/training-days used at generation time, so a later
  -- profile edit doesn't retroactively rewrite the basis of an existing plan.
  input_snapshot     jsonb not null,

  -- Two-phase review is this column plus an app config toggle. Phase 1 creates
  -- pending_review and hides the plan; Phase 2 auto-approves. The phase is
  -- never hardcoded — see task 6.5.
  status             plan_status not null default 'pending_review',
  reviewed_by        text,
  reviewed_at        timestamptz,
  generated_at       timestamptz not null default now()
);

create index plans_user_id_idx on plans (user_id);

alter table users enable row level security;
alter table plans enable row level security;
