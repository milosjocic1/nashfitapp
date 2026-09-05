# NashFit — Progress Log

**Purpose.** A chronological, auditable record of development work: what was done, when, against which build-plan task, and how it was verified. Written to support invoicing and client transparency.

**How to read it.** Newest session first. Each entry lists the build-plan tasks touched, the concrete deliverables, the commit(s), and what was actually verified versus assumed. Anything blocked is stated with who it's blocked on.

**Relationship to other docs.** `docs/nashfit-build-plan.md` is the forward-looking task list and status tracker — *what's left*. This file is the backward-looking record — *what happened*. Build-plan statuses are the summary; this file is the detail behind them.

**On effort figures.** The `Effort` column is left blank for the developer to complete. Time is not recorded automatically and is deliberately not estimated here — an invoice shouldn't rest on a guess.

---

## Outstanding — waiting on the client

Kept at the top because it's the critical path. Everything below is blocked until these land.

| Need | Blocks | Detail |
|---|---|---|
| Sentry account + two project DSNs | 0.9 | React Native project for the app, Node project for Edge Functions. |
| iOS simulator / Android emulator run | 0.1 (final ✅) | Neither toolchain installed on the dev machine. Expo Go on a physical device is sufficient for now. |
| Nash's domain (for deep links + privacy policy URL) | 1.3, 9.5 | Universal Links / App Links need files hosted on a controlled domain. Not needed for the bundle identifier, which is set. |
| Dev database password, to link and push the schema | 0.3 (final ✅), 0.7 | Schema is verified locally. Pushing it to nashfit-dev needs `supabase link`, which prompts for the database password set at project creation. |
| Nash's Principles Document | Phase 6 (6.1–6.5) | Listed in CLAUDE.md as source of truth but absent from `/docs`. Hard prerequisite for plan generation; the longest lead-time item in the project. |

---

## 2026-09-05 (later) — PostHog analytics

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.10 | `src/lib/analytics.ts` typed event helper; `PostHogProvider` wired into the root layout | 🟨 Partial | _pending_ | |

**Delivered.** `posthog-react-native` 4.67 plus its Expo dependencies (`expo-file-system`, `expo-application`, `expo-device`, `expo-localization`; the last needed adding to `app.config.ts` plugins by hand, since Expo can't auto-edit a dynamic config).

`src/lib/analytics.ts` declares every event and its properties in one mapped type, so instrumenting is a single typed call — `track('exercise_viewed', { exercise_id, source: 'library' })` — and a typo or missing property is a compile error rather than a malformed event nobody notices until a funnel is opened months later. The seven declared events are the six task 9.1 audits, plus `video_played` for task 4.5. Also exports `identifyUser` / `resetUser` for the auth lifecycle (tasks 1.6, 1.7); only the Supabase auth id is sent, never email or name. Every event carries `app_environment`, so dev traffic can be filtered out of product dashboards without a second PostHog project.

**Autocapture — a refinement of the 2026-09-01 decision.** Reading the actual SDK types showed `autocapture` is three separate switches, not one. Configured explicitly:

| Switch | Setting | Reasoning |
|---|---|---|
| `captureTouches` | **off** | The original concern. A workout logger is tap-heavy; every touch would be billable volume, would bury the seven real events, keys off a component tree that changes constantly, and can pick up rendered text in an app holding health data. (This was already the SDK default, but is now stated in code.) |
| `captureScreens` | **on** | One event per navigation, not per tap. Cheap, and it is what makes the retention and drop-off analysis the tech-stack doc asks for possible. |
| `captureAppLifecycleEvents` | **on** | App opened/backgrounded; required for any meaningful retention measure. |

The earlier note said "autocapture off" — that referred to the dashboard's *interactions* toggle, which maps to `captureTouches` and remains off. Screens and lifecycle are separate, low-volume, and enabled deliberately. Flagged rather than changed silently.

**Verified.** Typecheck passes against the real SDK types, confirming the client construction, `capture`/`identify`/`reset` calls and autocapture option shape are correct. `expo config` still resolves with the added plugin. A verification event was posted directly to the PostHog ingestion endpoint using the project token — **HTTP 200, `{"status":"Ok"}`** — proving the key is valid and events reach the project. It appears in the activity feed as `setup_verification` with distinct_id `nashfit-setup-check`.

**Why 🟨 not ✅.** The credential and endpoint are proven, but **the SDK integration has not been exercised in a running app** — that needs a device or simulator run, which is the same blocker as task 0.1. Nothing has confirmed that `PostHogProvider` mounts cleanly or that screen autocapture fires. No events are instrumented at call sites yet either; those land with the features they measure, and task 9.1 audits the set before launch.

---

## 2026-09-05 — Row Level Security policies

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.6 | 21 RLS policies across all 11 tables, applied and adversarially tested | ✅ Done | _pending_ | |

**Delivered.** `supabase/migrations/20260905100548_row_level_security_policies.sql`. Every table had RLS enabled but no policies (deny-all) since 0.5; this opens the specific doors.

- **Content tables** (`exercises`, `muscle_groups`, `equipment`, both link tables, `exercise_media`) — SELECT only, for `authenticated`. No write policies exist, so inserts, updates and deletes are denied for every client role. Nash's content changes go through the dashboard on `service_role`, which bypasses RLS.
- **`anon` gets nothing at all**, not even the exercise library. The PRD specifies a hard paywall with no free content or preview, so an unauthenticated client should see an empty database.
- **`users`** — SELECT and UPDATE own row only. No INSERT policy: rows come from the `handle_new_user` trigger, which is `security definer` and bypasses RLS, so a client can never fabricate a profile for an id it doesn't own. No DELETE policy: account deletion goes through Supabase Auth and cascades.
- **`plans`** — SELECT own only. No client write policies; plans are written server-side by the generation Edge Function using the secret key. A client able to write its own plan row could also approve it.
- **`sessions` / `session_exercises` / `sets`** — full CRUD scoped to ownership, resolved through the parent chain.

**How two-phase review is enforced.** The review gate lives in the `sessions` and `session_exercises` SELECT policies: a session belonging to a plan is visible only when that plan's status is `approved` or `active`; ad-hoc sessions (`plan_id is null`) are always visible. Crucially **this does not hardcode a phase**, per CLAUDE.md — the config toggle decides what status a plan is *created* with, while the policy only ever asks what the status *is now*. Phase 1 creates `pending_review` and content stays hidden until a reviewer flips it; Phase 2 creates `approved` and it is visible immediately. One policy, correct in both.

The `plans` row itself is visible in **any** status, deliberately. It carries metadata only — `principles_version`, `input_snapshot`, `status` — not the workout. That is what makes the "your plan is being prepared" state (task 6.8) possible while the prescribed content stays withheld at the session level.

The gate is repeated on `session_exercises` rather than inherited from `sessions`, because RLS is evaluated per table: a direct query against `session_exercises` with a known session id would otherwise bypass it.

`sets` are readable regardless of plan status — a logged set exists only because the user recorded it, and withholding their own performance data would make no sense. The gate protects unapproved *prescriptions*, not actuals.

**Verified against the local stack**, impersonating real users via `set role authenticated` plus a `request.jwt.claims` sub, with two seeded users each holding plans, sessions and logged sets.

| Test | Result |
|---|---|
| `auth.uid()` resolves inside the impersonated session | ✓ |
| Each user sees exactly their own profile, sessions and sets | ✓ 2 sets in the database, 1 visible to each |
| Direct lookup of another user's row by primary key | ✓ 0 rows |
| `anon` reading exercises / sessions / users | ✓ 0 rows — hard paywall holds at the database |
| Session under a `pending_review` plan | ✓ hidden (2 of 3 sessions visible) |
| Reviewer flips it to `approved` | ✓ becomes visible (3 of 3), with its `session_exercises` |
| Reviewer flips it to `rejected` instead | ✓ hidden again |
| Insert a session claiming `created_by = 'agent'` | ✓ blocked — a client cannot forge Nash-generated provenance |
| Insert a session owned by another user | ✓ blocked |
| Reassign another user's session to yourself | ✓ 0 rows affected |
| Insert / rename / delete an exercise | ✓ blocked, 0 rows affected |
| Create a plan, or self-approve a pending one | ✓ blocked, 0 rows affected |
| Edit another user's profile, or delete their set | ✓ 0 rows affected |
| Own profile edit, ad-hoc session, log set, complete, delete | ✓ all allowed |

**Testing note worth carrying forward.** An initial harness reported five false failures because it treated "no error" as "allowed". RLS **filters rows silently** — `INSERT` violations raise an error via `WITH CHECK`, but `UPDATE`/`DELETE` against invisible rows simply match nothing and report success. Any future RLS test must assert on **rows affected** and on the data actually changing, not on error status; otherwise it will produce false passes, which is the dangerous direction.

**Performance note.** `auth.uid()` is wrapped as `(select auth.uid())` throughout so Postgres evaluates it once per query rather than once per row — on the `sets` table that is the difference between one call and one per logged set.

**Still outstanding.** Not yet pushed to the remote `nashfit-dev` project; needs `supabase link` and the dev database password. `nashfit-prod` untouched.

---

## 2026-09-01 (later) — Database schema migrations

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.5 | Four migration files authored, applied and behaviourally verified against local Postgres 17.6 | ✅ Done | _pending_ | |
| — | Supabase CLI added as a pinned dev dependency; `supabase init` | ✅ | _pending_ | |

**Tooling.** Supabase CLI 2.116.0 installed as a **dev dependency** rather than via Homebrew, so the version is pinned in `package.json` and identical on every machine and in CI. Schema tooling that drifts between machines is a real source of migration inconsistency, and it matches CLAUDE.md's rule that every schema change is a committed migration file — pin the tool that writes them. `supabase init` scaffolded `supabase/config.toml`.

**Schema decisions taken (developer-approved 2026-09-01).**

| Decision | Choice | Reasoning |
|---|---|---|
| Equipment modelling (open item in the data model) | **Link table** `exercise_equipment` | Most real exercises need multiple pieces — barbell + bench, cable + attachment. Moving one-to-many later would mean rewriting every equipment query and the generator's filtering. |
| `users` row creation | **Database trigger** on `auth.users` insert | v1 has three sign-in paths (email 1.1, Apple 1.4, Google 1.5); OAuth callbacks don't reliably run client insert code. One place covers all three. Slightly diverges from task 1.1's wording, which implies a client-side insert. |
| Deleting a library exercise | **RESTRICT** on `session_exercises.exercise_id` | A deletion in the Supabase dashboard must not destroy logged user history. Retire exercises instead. |
| Deleting a plan | **RESTRICT** on `sessions.plan_id` | Same principle; `plan_status` already has `archived`. |

Governing rule for the remaining foreign keys: **user-owned data cascades from its owner; shared vocabulary and content restrict.**

**Other choices.** Native Postgres enums over `text` + CHECK, so `supabase gen types` produces TypeScript unions. Client-generated UUIDs on `sessions`/`session_exercises`/`sets` carry **no** `gen_random_uuid()` default, so a client that forgets to generate an id fails loudly rather than the database silently masking the bug; `plans` is server-generated and does have a default. RLS is enabled on all ten tables at creation — deny-all until task 0.6 adds policies — because the publishable key ships in the app bundle, so a table with RLS off is readable by anyone who unpacks the app. FK indexes added throughout (Postgres does not create them automatically). No `updated_at` columns, as the data model doesn't specify them.

**Two deliberate deviations from the data model, flagged rather than silent.**
1. `sessions.performed_at` is **nullable**. The document doesn't mark it so, but also states the agent creates a session before it is performed — those conflict. Null until the user actually trains it.
2. The four onboarding inputs on `users` are **nullable**. Forced by the flow: the row is created at signup (Phase 1), the inputs are collected at onboarding (Phase 5). "Onboarding complete" is derived from all four being non-null.

Also added `CHECK` constraints for age (16–90) and training days (3–6), both traceable to `docs/nashfit-user-info-gathering-template.md`, as defence in depth behind task 5.5's app-level validation. Deliberately **not** added: unique constraints on `(session_id, position)` or `(session_exercise_id, set_number)`, because reordering exercises (task 7.4) against a non-deferrable unique constraint requires awkward shuffling.

**Verified.** All four files parse cleanly against libpg_query — Postgres's own parser — via `pgsql-parser` (40 statements total). Lint, typecheck and format check pass.

**Applied and verified (2026-09-04).** Docker Desktop was started, `supabase start` brought up a local stack, and all four migrations applied cleanly against **Postgres 17.6.1**. Docker 20.10.22 turned out to be new enough. A subsequent `supabase db reset` confirmed the migrations apply correctly from scratch, not just incrementally.

Structural verification:
- 11 tables created (the 10 from the data model plus the `exercise_equipment` link table).
- All 8 enum types present with the correct labels and ordering.
- 12 foreign keys with the intended delete rules, confirmed via `pg_constraint` — including `users.id → auth.users CASCADE`. (An earlier `information_schema` query appeared to show duplicate constraints; that was a join artifact, not real duplication.)
- RLS enabled on all 11 tables.
- `id` defaults exactly as designed: `gen_random_uuid()` on server-created tables, **absent** on `sessions`/`session_exercises`/`sets`.

Behavioural verification — the part structure alone can't prove:

| Test | Result |
|---|---|
| `handle_new_user` trigger creates a profile on auth signup | ✓ row created, `unit_preference` defaulted to `kg`, all four onboarding inputs null |
| `age` = 5 and `age` = 120 | ✓ rejected; 45 accepted |
| `training_days_per_week` = 7 | ✓ rejected; 4 accepted |
| Insert `sessions` / `sets` without a client-supplied id | ✓ rejected — the offline-first rule is enforced by the database, not just convention |
| Delete an exercise present in logged history | ✓ rejected (RESTRICT) |
| Delete a plan with logged sessions | ✓ rejected (RESTRICT) |
| Delete a session | ✓ cascaded to its `session_exercises` and `sets` |
| Delete the `auth.users` row | ✓ cascaded to `public.users` and onward to `plans` |
| RLS with zero policies | ✓ genuinely deny-all — `anon` and `authenticated` both see 0 rows where the owner sees 1 |

**Still outstanding.** The migrations have not been pushed to the remote `nashfit-dev` project — that needs `supabase link` and the dev database password. Tracked under task 0.3. `nashfit-prod` remains untouched.

---

## 2026-09-01 — Environment configuration

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.3 | Supabase dev + prod projects created (client-side); dev credentials wired into config | 🟨 Partial | _pending_ | |
| 0.4 | `app.config.ts`, `.env.local` / `.env.example`, typed `src/lib/env.ts` | 🟨 Partial | _pending_ | |
| 0.10 | PostHog account and project created; SDK not yet integrated | ⬜ Not started | — | |

**Client decisions recorded.** Supabase and PostHog both created in **US regions** — EU was recommended for latency and data residency; US was the developer's call. Consequence carried forward: the privacy policy and store disclosures at task 9.5 must state US processing, since UK/EU users retain GDPR protection regardless of hosting location.

**Supabase key scheme.** Used the new **publishable key** (`sb_publishable_…`) rather than the legacy `anon` JWT. Supabase deprecates the legacy `anon`/`service_role` pair by end of 2026 — roughly when this app ships — so starting on the new scheme avoids a migration.

**PostHog configuration.** Product Analytics only. Error tracking declined (duplicates Sentry, task 0.9); session replay declined (records screens in an app holding health data, and needs masking configured before it's safe); heatmaps and web vitals are web-only; data warehouse declined (nothing to connect, and it cuts against the tech-stack decision that Nash gets visibility from three separate tool dashboards). PostHog's install wizard was declined in favour of a deliberate integration at 0.10. All reasoning recorded in `docs/nashfit-environment-setup.md`.

**Delivered — `app.config.ts`** replaces `app.json`, so the build varies by environment. Dev and production get distinct bundle identifiers (`com.nashfit.app.dev` / `com.nashfit.app`), app names, and URL schemes. This lets both builds sit on one device with separate storage, keychains and databases — a prerequisite for testing offline sync at task 8.5, where a shared identifier would mean each install clobbered the other's SQLite database. Identifiers are permanent once a store listing exists, hence deciding now.

**Delivered — `src/lib/env.ts`**, a typed accessor that validates configuration once at module load and throws a precise, actionable error listing every problem at boot, rather than surfacing `undefined` inside a later network call. Includes two hard guards that throw outright: a Supabase `sb_secret_` key or a PostHog `phx_` personal key in a client variable. Both would be serious leaks — the Supabase secret key bypasses Row Level Security entirely.

**Verified.**
- `expo config` resolves correctly in both environments — `APP_ENV=development` yields `NashFit (Dev)` / `com.nashfit.app.dev` / scheme `nashfit-dev`; `APP_ENV=production` yields `NashFit` / `com.nashfit.app` / scheme `nashfit`.
- An iOS bundle was exported and the compiled Hermes bytecode grepped: all four public values are present, confirming Metro's build-time substitution works end to end. This also demonstrates concretely that `EXPO_PUBLIC_` values are extractable from a shipped app — the reason only public-by-design values may use that prefix.
- Lint, typecheck and format check all pass.
- The placeholder home screen now reads `env`, so a misconfigured build fails visibly on device instead of at the first Supabase call.

**Why 0.3 is 🟨.** Both projects exist and the dev credentials are wired into config, but the app has no Supabase *client* yet. That lands with authentication in task 1.1, where session-persistence configuration belongs — building a bare client now would mean rebuilding it there.

**Why 0.4 is 🟨.** Task 0.4 covers "the app **and Edge Functions**". The app side is complete. Edge Function secrets can't be configured until functions exist (task 0.7).

**Not verified.** No simulator or device run — neither toolchain is installed. The screen renders correctly according to the bundler, but has not been seen running.

---

## 2026-08-25 — CI pipeline

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.8 | GitHub Actions workflow: lint + typecheck + format check on push/PR to `main` | 🟨 Partial | _pending_ | |
| — | Progress log created; CLAUDE.md convention and `/log-progress` command added | ✅ | _pending_ | |
| 0.3, 0.9, 0.10 | `docs/nashfit-environment-setup.md` — console setup instructions for Supabase (dev + prod), Sentry, PostHog | ⏸️ Blocked on client | _pending_ | |
| 0.4 | Environment config approach drafted (Part 3 of the same doc) | ⏸️ Awaiting approval | _pending_ | |

**Delivered.** `.github/workflows/ci.yml` — Node 22, `npm ci` with dependency caching, cancel-in-progress concurrency so superseded pushes don't burn runner minutes, and `if: always()` on the check steps so a lint failure doesn't mask a type error.

**Verified.** YAML parsed with `js-yaml`; `npm ci --dry-run` confirms the lockfile is in sync; all three scripts run green locally.

**Why 🟨 not ✅.** Task 0.8 specifies "lint + typecheck + **test**". There is no test runner, and per CLAUDE.md the tests worth writing cover plan-output validation, offline-sync reconciliation and subscription state — none of which exist yet. Adding Jest now would mean a green suite testing nothing. The test step gets added when the first of that logic lands.

**Environment setup document.** `docs/nashfit-environment-setup.md` written to unblock the console work: which Supabase/Sentry/PostHog accounts to create, which region to pick and why (EU, for latency and GDPR data residency — fixed at creation for both Supabase and PostHog), and which values to hand back. Includes the client-safe vs. server-only key split and an explanation of why RLS (task 0.6) is the actual security boundary given the `anon` key ships publicly in the bundle.

**Task 0.4 proposed, not built.** Part 3 of that document sets out the environment config approach — `app.json` → `app.config.ts`, gitignored `.env.local` with an `EXPO_PUBLIC_` prefix rule, a typed `src/lib/env.ts` that fails loudly at boot, and build-time (not runtime) environment selection so a dev build cannot reach production. Awaiting sign-off before implementation; one open question on whether dev builds should take a distinct bundle identifier.

**Tooling check.** `brew`, `gh` and `docker` present. **Supabase CLI not installed** — required for tasks 0.5 and 0.7. Docker is 20.10 (2022-era) and should be updated before local Supabase development.

---

## 2026-08-23 — Project setup, tooling, and restructure

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.2 | Spec docs into `/docs`; CLAUDE.md at repo root | ✅ Done | `cddd8c7` | |
| 0.1 | ESLint + Prettier, TypeScript strict, absolute imports | 🟨 Partial | `d8ede56` | |
| 0.1 | Folder structure; Expo demo scaffold removed | 🟨 Partial | _pending_ | |

**Scaffold audit (first).** Reviewed the existing Expo project before changing anything. Found TypeScript strict mode and the `@/*` absolute-import alias **already present** in the scaffold — verified rather than re-implemented. ESLint was present via `eslint-config-expo`. Prettier, a typecheck script, and CI were absent.

**Tooling.** Prettier 3.6.2 + `eslint-config-prettier`, wired so Prettier owns formatting and ESLint owns correctness (not running Prettier as an ESLint rule). Added `typecheck`, `lint:fix`, `format`, `format:check` scripts. `*.md` is Prettier-ignored so the `/docs` specs keep their authored formatting.

**Restructure.** Routes stay in `app/` (expo-router convention); all other code moved under `src/` — `components`, `hooks`, `theme`, plus new `features`, `lib`, `types`, `utils`, each with a README documenting its purpose. `constants/theme.ts` became `src/theme/index.ts` so there is one theme location rather than two. Aliases: `@/*` → `./src/*`, `@assets/*` → `./assets/*`.

**Demo content removed.** Explore tab, modal route, hello-wave, parallax-scroll-view, React logo assets, and the `reset-project` script. `app/(tabs)/index.tsx` reduced to a placeholder pending auth routing (1.7).

**Verified.** Lint and typecheck green. Alias resolution confirmed with real `expo export` bundles for **iOS** (1296 modules) and **web** (1042 modules) — `tsc` alone would not catch a Metro resolution failure, which is the actual risk when moving every file.

**Dependency housekeeping.** Committed pending `expo-doctor` bumps: `expo` 54.0.35 → 54.0.37, `expo-constants` 18.0.13 → 18.0.14.

**Flagged to client.**
- Brand tokens from `docs/nashfit-brand-guidelines.md` (dark-first, `#ED070D`, Lora + Inter) are unimplemented and have **no build-plan task**. Should land before the first user-facing screen or Phase 1's auth screens get built twice.
- `docs/nashfit-principles-document-template.md` is referenced by CLAUDE.md but missing from `/docs`.

---

## 2026-08-15 — Initial scaffold

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| — | `create-expo-app` scaffold, git initialised | ✅ Done | `7aa63d1` | |

Expo SDK 54, expo-router 6, React Native 0.81.5, React 19.1, new architecture enabled. Pre-dates the structured build plan.
