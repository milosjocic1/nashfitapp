CLAUDE.md — NashFit

Persistent context for Claude Code. Read this first every session. Keep it lean; the detailed specs live in /docs — this file points at them and encodes the rules that aren't obvious from the code.

What this is

NashFit is a subscription mobile app for Dr. Nash Jocic's fitness community. v1 delivers one loop: onboard → get an AI-generated Nash-style training plan → follow it (video + cues per exercise) → log what you actually did.

The differentiator is that plans and coaching come from Nash's own methodology, not a generic model. Protect that everywhere.

Source of truth: /docs

Do not infer scope or design from code or memory — check these first. If a request conflicts with them, say so before proceeding.

docs/nashfit-v1-prd.md — scope, pricing, boundaries, two-phase plan review.
docs/nashfit-v1-data-model.md — Postgres schema (authoritative for tables/fields).
docs/nashfit-v1-tech-stack.md — stack, architecture, AI plan-generation flow.
docs/nashfit-v1-user-stories.md — the feature list and build order.
docs/nashfit-principles-document-template.md — Nash's methodology (source of truth for plan generation).
docs/nashfit-user-info-gathering-template.md — onboarding inputs vs. preferences.
docs/nashfit-status.md — one-page current-state snapshot. READ THIS FIRST if you are new to the project or returning after a gap. Regenerate it rather than patching it.
docs/nashfit-build-plan.md — the sequenced task/prompt list and progress tracker. Update it as work completes.
docs/nashfit-exercise-taxonomy.md — muscle groups, equipment, and Nash's exercise breakdown. Nothing seeded yet.
docs/nashfit-progress-log.md — chronological record of work done, for client transparency and invoicing. Append to it; never rewrite history.
docs/nashfit-verification-checklist.md — things needing a device, dashboard or store account to confirm. Add to it instead of blocking; a task stays 🟨 until its items pass.
docs/nashfit-brand-guidelines.md — colour, type, and component tokens for the app UI.
docs/nashfit-environment-setup.md — Supabase/Sentry/PostHog setup, the client-safe vs server-only key split, and how environments switch.
Stack (do not swap without an explicit decision)
App: Expo / React Native, TypeScript, cross-platform iOS + Android from one codebase.
Backend/DB/Auth/Storage: Supabase (Postgres, Supabase Auth, Storage).
Server logic: Supabase Edge Functions (Deno). Anything with secrets or third-party calls goes here, never in the client.
AI plan generation: Claude API, called from an Edge Function, with Nash's Principles Document passed in-context. No vector store in v1.
Subscriptions: RevenueCat (wraps Apple/Google IAP).
Analytics/monitoring: PostHog (product analytics), Sentry (crash/error). Both from day one.
Non-negotiable rules

These are the things that are easy to get wrong and expensive to fix. Follow them unless a doc explicitly says otherwise.

Scope discipline. Build only what's in v1 (see PRD/user stories). If asked for something on the "Explicitly Not in v1" list — corpus/RAG, nutrition, community, manual program-builder, closed-loop auto-adjustment, offline video, Face ID unlock, custom admin panel — flag it as out of scope before building.

Data model integrity.

sessions, session_exercises, sets use client-generatable UUIDs (offline-first). Generate ids on the client, not the DB.
plans are server-generated (created by the plan-generation Edge Function).
Respect the prescription vs. actual split: prescribed_* fields on session_exercises are written by the AI; logged sets are the user's actual performance. Never conflate them.
Respect plan inputs vs. preferences: age, experience_level, sex, training_days_per_week drive plan generation; unit_preference is display-only and must never trigger regeneration.

AI plan generation.

The generator selects and assembles from real library exercises only — it must never invent exercises, cues, or set/rep schemes not grounded in the library + Principles Document.
Validate the model's structured output against the exercise library before persisting. Reject/retry on invalid references.
Every plan records principles_version and input_snapshot.
Respect the two-phase review: Phase 1 plans are created pending_review and hidden until approved; Phase 2 auto-approves. The phase is a config toggle — never hardcode one.

Media.

Video/images live in private Supabase Storage buckets. The client never sees a raw URL — an Edge Function mints a short-lived signed URL at play time.
exercise_media.url stores the storage key, not a public URL.

Secrets. No API keys or service-role keys in the client bundle. Claude API calls, signed-URL minting, RevenueCat webhooks — all Edge Function only.

Money. Digital subscriptions must use Apple/Google IAP via RevenueCat. Never wire Stripe/web checkout to dodge the platform cut.

Safety. The app prescribes plans to an audience that includes older lifters. Honor the Principles Document's hard-constraints/safety section, and keep the "not medical advice" disclaimer surfaces intact.

Conventions
Language: TypeScript everywhere (app + Edge Functions). Strict mode on.
Migrations: every schema change is a Supabase migration file, committed. Never hand-edit production tables as the source of truth.
Environments: separate Supabase projects (or clearly separated) for dev and prod. Never test against prod data. RevenueCat sandbox for dev builds.
Commits: small, focused, one task per commit where practical. Reference the build-plan task.
Tests: cover the logic that's costly to get wrong — plan-output validation, offline-sync reconciliation, subscription state. UI can be lighter.
Don't introduce a new dependency or service without noting why; prefer the stack above.
Working style with me (the developer)
I'm an experienced web/software engineer; mobile and Supabase idioms are newer to me. Explain mobile-specific or Supabase-specific choices; don't over-explain general programming.
Propose, then confirm on anything with a lasting consequence (schema, third-party wiring, auth/payments). These are the expensive-to-change layers.
When a task is ambiguous, ask before building — a wrong assumption in the data or auth layer is costly.
Keep the build plan (docs/nashfit-build-plan.md) updated: mark tasks done, note anything that changed.

Progress logging (this project bills by the work, so the record matters)

At the end of any session that produced a deliverable, append an entry to docs/nashfit-progress-log.md. Run /log-progress to do it, or do it unprompted before signing off.

Rules for that file:
Append only. Never rewrite or delete a past entry — it's an invoicing record. Corrections go in a new entry that says what it corrects.
Be accurate, not flattering. Record what was actually verified versus assumed. A 🟨 that says why is worth more than a ✅ that can't be defended.
Never invent effort or time figures. Leave the Effort column blank for the developer.
Keep blockers current: anything waiting on the client goes in the "Outstanding" table at the top, and comes out when it lands.
The build plan holds statuses (what's left); the progress log holds detail (what happened). Don't duplicate narrative across both.