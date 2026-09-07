# NashFit — v1 Build Plan, Prompts & Progress Tracker
 
**How to use this.** Each task is a scoped unit of work written so you can hand it to Claude Code more or less as-is (edit for context). Work top to bottom — order respects dependencies. Update the **Status** as you go.
 
**Status legend:** ⬜ To do · 🟨 In progress · ✅ Done · ⏸️ Blocked
 
**Golden rules (see CLAUDE.md for the full set):** build only v1 scope; client-generatable UUIDs for logging tables; prescription vs. actual and plan-input vs. preference stay separate; AI selects only from real library exercises; secrets in Edge Functions only.
 
---
 
## Phase 0 — Project setup & infrastructure
 
Foundational plumbing. Nothing user-facing works until this is solid, so resist rushing it.
 
| # | Task / Prompt | Status |
|---|---|---|
| 0.1 | Initialise an Expo (React Native, TypeScript, strict mode) project. Set up the folder structure, linting (ESLint + Prettier), and absolute imports. Confirm it runs on both an iOS simulator and an Android emulator. | ✅ |
| 0.2 | Create the `/docs` folder and move the six spec docs + CLAUDE.md into the repo root/docs as appropriate. Confirm CLAUDE.md is at the location Claude Code reads. | ✅ |
| 0.3 | Create two Supabase projects (dev, prod) — or one with a clear separation strategy. Record connection details in env config (never committed). Wire the Expo app to the dev project. | ✅ |
| 0.4 | Set up environment config management (dev vs prod) for the app and Edge Functions. Ensure no secrets land in the client bundle. Document how to switch environments. | ✅ |
| 0.5 | Author the initial database schema as Supabase **migration files**, following `docs/nashfit-v1-data-model.md` exactly: `exercises`, `muscle_groups`, `equipment`, `exercise_muscle_groups`, `exercise_media`, `users`, `plans`, `sessions`, `session_exercises`, `sets`. Include enums, nullability, and FKs as specified. | ✅ |
| 0.6 | Set up Supabase Row Level Security policies: a user can read/write only their own `users`/`plans`/`sessions`/`session_exercises`/`sets`; exercise content tables are read-only to clients. Write these as migrations. | ✅ |
| 0.7 | Establish the Edge Functions project structure (Deno, TypeScript) and deploy a trivial health-check function to confirm the deploy pipeline works. | ✅ |
| 0.8 | Set up CI (lint + typecheck + test on push). Keep it minimal but present from the start. | 🟨 |
| 0.9 | Wire Sentry into the app and Edge Functions (crash/error monitoring live from day one). | 🟨 |
| 0.10 | Wire PostHog into the app; add a tiny event-tracking helper so instrumenting events later is one call. Confirm an event lands in the dashboard. | 🟨 |
| 0.11 | Implement the design tokens from `docs/nashfit-brand-guidelines.md` — colour ramp, type scale, Lora + Inter, radii — as the app theme, replacing the Expo scaffold's light/dark placeholder. Added 2026-09-06: not in the original plan, but Phase 1 builds three auth screens and they should be built against the real brand once, not twice. | ✅ |
 
**Phase 0 partials.** 0.8 🟨 pending a test step (no test runner yet). 0.9 🟨 — app side wired and the DSN verified, but SDK capture is unverifiable until a development build, source-map upload needs the Sentry org/project slugs, and the Edge Function side waits for a function that can meaningfully fail (4.2 or 6.2). 0.10 🟨 pending confirmation that a `$screen` event from the real SDK reached PostHog.

**Development build now on the critical path.** Three verifications are blocked on it — 0.9's SDK capture, 0.10's screen events under a production build, and anything native. It becomes mandatory at 2.1 (RevenueCat) regardless. Installing Xcode and Android Studio before Phase 2 would clear the backlog.

**Note on 0.3.** Both projects exist, credentials are in env config, the app points at dev, and the schema is pushed there. The Supabase *client* itself lands with auth in task 1.1, where session-persistence configuration belongs. `nashfit-prod` has no schema yet — deliberately, until the schema has proven itself on dev.

See `docs/nashfit-progress-log.md` for the detail behind every status here.

---
 
## Phase 1 — Auth & Accounts (Epic 1)
 
| # | Task / Prompt | Status |
|---|---|---|
| 1.1 | Configure Supabase Auth for email/password. Build the sign-up screen (email + password) with validation and error states. On sign-up, create the corresponding `users` profile row. | ⬜ |
| 1.2 | Build the sign-in screen (email/password) with error handling for bad credentials. | ⬜ |
| 1.3 | Implement password reset via email using Supabase Auth's flow (request screen + deep-link handling for the reset). | ⬜ |
| 1.4 | Add Apple sign-in (required by Apple since Google is offered). Handle the create-profile-on-first-sign-in path. | ⬜ |
| 1.5 | Add Google sign-in, same first-sign-in profile handling. | ⬜ |
| 1.6 | Implement persistent sessions (stay signed in across app opens) using secure token storage. Add sign-out that clears the session. | ⬜ |
| 1.7 | Build the auth-state routing: unauthenticated → auth stack; authenticated → app (gated by subscription, see Phase 2). | ⬜ |
 
---
 
## Phase 2 — Subscription & Paywall (Epic 2)
 
| # | Task / Prompt | Status |
|---|---|---|
| 2.1 | Integrate the RevenueCat SDK. Configure products: annual (headline) + monthly, in both App Store Connect and Google Play Console (sandbox first). | ⬜ |
| 2.2 | Build the paywall screen showing annual + monthly, with annual framed as the value option. | ⬜ |
| 2.3 | Implement purchase flow via RevenueCat; handle success, cancellation, and failure states. | ⬜ |
| 2.4 | Implement the hard paywall gate: the whole app past auth is locked until an active subscription is detected. | ⬜ |
| 2.5 | Implement restore purchases and cross-device/reinstall entitlement recognition. | ⬜ |
| 2.6 | Add a RevenueCat webhook Edge Function if subscription state needs to be queryable in Postgres (only if required — otherwise RevenueCat stays source of truth). | ⬜ |
 
---
 
## Phase 3 — Exercise Library (Epic 3)
 
Build the catalogue before generation — the generator selects from it.
 
| # | Task / Prompt | Status |
|---|---|---|
| 3.1 | Seed the reference tables (`muscle_groups`, `equipment`) with Nash's agreed vocabulary via a migration/seed script. | ⬜ |
| 3.2 | Seed an initial set of `exercises` (with `form_cues`, `common_mistakes`, `movement_pattern`) and their muscle-group/equipment links. Use a repeatable seed script, not manual entry. | ⬜ |
| 3.3 | Build the data-access layer for exercises (fetch list, fetch by id, with muscle groups + equipment joined). Cache the exercise list on-device for fast browse. | ⬜ |
| 3.4 | Build the library browse screen (list/grid of exercises). | ⬜ |
| 3.5 | Add filter by muscle group. | ⬜ |
| 3.6 | Add filter by equipment. | ⬜ |
| 3.7 | Add search by name. | ⬜ |
 
---
 
## Phase 4 — Exercise Detail & Video (Epic 4)
 
| # | Task / Prompt | Status |
|---|---|---|
| 4.1 | Create the private Supabase Storage bucket for media. Establish the upload/naming convention for storage keys (resolve the "video source-of-truth workflow" open item). Upload the seed videos/images. | ⬜ |
| 4.2 | Build the signed-URL Edge Function: given an `exercise_media` key and an authenticated user, return a short-lived signed URL. Never expose raw URLs. | ⬜ |
| 4.3 | Build the exercise detail screen: primary video player (fed by the signed URL), form cues rendered as a discrete list, target muscles, equipment. | ⬜ |
| 4.4 | Handle media states: loading, playback error, no-connection (video requires a connection in v1). | ⬜ |
| 4.5 | Instrument PostHog events for exercise views / video plays. | ⬜ |
 
---
 
## Phase 5 — Onboarding (Epic 5)
 
| # | Task / Prompt | Status |
|---|---|---|
| 5.1 | Build the onboarding flow collecting the four plan inputs: age, experience level, sex, training days per week. Persist to the `users` row. Keep these strictly separate from preferences. | ⬜ |
| 5.2 | Add helper text under each experience level so users self-assess the way Nash's rules expect. | ⬜ |
| 5.3 | Build the unit preference (kg/lb) setting as a **preference** — display only, must never trigger plan regeneration. | ⬜ |
| 5.4 | Implement re-onboarding: a user can edit inputs later, which triggers a new plan (Phase 6) while leaving prior plans traceable via their `input_snapshot`. | ⬜ |
| 5.5 | Validation: enforce sensible age range and only offer training-day values the Principles Document supports. | ⬜ |
 
---
 
## Phase 6 — AI Plan Generation (Epic 6)
 
The hard, iterative core. Expect to loop on 6.2–6.4 as Nash's Principles Document matures.
 
| # | Task / Prompt | Status |
|---|---|---|
| 6.1 | Define the plan-generation **output JSON schema** (sessions → session_exercises with prescribed sets/reps/load). Resolve the "prompt & output schema" open item. Document it. | ⬜ |
| 6.2 | Build the plan-generation Edge Function: gather user inputs + the current Principles Document + relevant exercise library entities; call the Claude API; return structured plan JSON. Principles Document passed in-context (no vector store). | ⬜ |
| 6.3 | Implement **output validation**: every exercise the model returns must exist in the library; reject/retry on invalid references or malformed output before persisting. | ⬜ |
| 6.4 | Persist a generated plan: write the `plans` row (`principles_version`, `input_snapshot`, `status`) and the prescribed `sessions` / `session_exercises`. | ⬜ |
| 6.5 | Implement the **two-phase review toggle** (app config). Phase 1: create `pending_review`, hide from user. Phase 2: auto-approve/active. Never hardcode a phase. | ⬜ |
| 6.6 | Build the **plan-creation notification** to Nash/dev (fires in both phases). Resolve the notification-channel open item (email via Edge Function vs push). | ⬜ |
| 6.7 | Build the user-facing plan view: the plan's sessions and exercises, each linking to its detail/video (ties to Phase 4), showing prescribed sets/reps/target. | ⬜ |
| 6.8 | Build the "plan is being prepared" waiting state for Phase 1 (plan withheld until approved), and the ready/notified transition. | ⬜ |
| 6.9 | Implement plan caching: don't regenerate on app open; regenerate only on explicit re-onboarding. (AI cost control.) | ⬜ |
| 6.10 | Document the Phase-1 review procedure (read `plans` row, flip `status` in the Supabase dashboard) so Nash/dev can operate it without a custom UI. | ⬜ |
 
---
 
## Phase 7 — Session Logging (Epic 7)
 
| # | Task / Prompt | Status |
|---|---|---|
| 7.1 | Build logging against a **prescribed** plan session: show the prescription, let the user log actual sets (weight + reps) per exercise. Client-generatable UUIDs. | ⬜ |
| 7.2 | Build **ad-hoc** session logging: user assembles a session from the library, logs sets; no prescription (prescribed fields null). | ⬜ |
| 7.3 | Add optional RPE per set. | ⬜ |
| 7.4 | Allow reorder/remove of exercises within an ad-hoc session. | ⬜ |
| 7.5 | Save completed sessions to history; set session `status` (in_progress/completed). | ⬜ |
| 7.6 | Build session history view (past sessions). | ⬜ |
| 7.7 | Build per-exercise progress view (a given exercise's logged sets across sessions over time). | ⬜ |
| 7.8 | Ensure weights store as entered against `unit_preference` (no conversion); display in the user's unit. | ⬜ |
 
---
 
## Phase 8 — Offline Logging (Epic 8)
 
| # | Task / Prompt | Status |
|---|---|---|
| 8.1 | Implement local persistence of logging data (on-device SQLite for sessions/session_exercises/sets; secure storage for tokens/prefs). Precious unsynced data in backed-up locations. | ⬜ |
| 8.2 | Implement offline logging: a user with no signal can log sets; rows get client UUIDs and queue for sync. | ⬜ |
| 8.3 | Implement sync-on-reconnect: push queued rows to Supabase, reconcile, mark synced. Keep it simple (single-user sequential data). | ⬜ |
| 8.4 | Implement resume of an in-progress session after app close/interruption (driven by session `status`). | ⬜ |
| 8.5 | Test the offline→online path deliberately: log offline, kill connection, reconnect, confirm no data loss and no duplicate ids. | ⬜ |
 
---
 
## Phase 9 — Cross-cutting, pre-launch & release (Epic 9)
 
| # | Task / Prompt | Status |
|---|---|---|
| 9.1 | Audit PostHog instrumentation: confirm key events (signup, subscribe, onboarding complete, plan generated, exercise viewed, session logged) all fire. | ⬜ |
| 9.2 | Confirm Sentry is capturing errors from both app and Edge Functions in production config. | ⬜ |
| 9.3 | Add the "not medical/injury advice" disclaimer surfaces (onboarding and/or plan view), per the PRD non-goals. | ⬜ |
| 9.4 | Build the pre-release QA checklist and run it: signup, all three logins, password reset, subscribe, restore purchases, generate plan, view video, log prescribed + ad-hoc session, offline log + sync. | ⬜ |
| 9.5 | Prepare App Store + Google Play assets: screenshots, descriptions, privacy policy, data-handling disclosures, a reviewer test account. | ⬜ |
| 9.6 | Dry-run the two-store submission. Budget for rejections (esp. Apple). Address feedback. | ⬜ |
| 9.7 | Confirm the Phase-1 review procedure and plan-creation notifications work end-to-end in production before real users hit generation. | ⬜ |
 
---
 
## Parked / not v1 (do not build without a scope decision)
 
Corpus/RAG decomposition · nutrition · community/social · manual program-builder · closed-loop auto-adjustment from logged history · offline video download (priority v2) · Face ID unlock · custom admin panel · custom plan-review UI · fine-tuning Nash's voice.
 
---
 
## Open items to resolve during build (from the specs)
 
- Video upload/naming convention for storage keys (blocks 4.1).
- Plan-generation prompt & output schema (blocks 6.1–6.2).
- Notification channel for plan creation — email vs push (blocks 6.6).
- Units switch-after-logging behaviour — lock preference or denormalize unit onto each set (decide before launch, affects 7.8).
- `is_primary` enforcement — app logic vs partial unique index (affects 3.2/4.x).
- Phase-1 review surface — dashboard-only vs a simple internal page (affects 6.10).
- **Brand tokens have no task.** `docs/nashfit-brand-guidelines.md` defines the dark-first system (`#ED070D`, Lora + Inter); `src/theme/` still holds Expo's default palette. Needs a task before the first user-facing screen, or Phase 1's auth screens get built twice.
- **`docs/nashfit-principles-document-template.md` is missing** from `/docs` despite being listed in CLAUDE.md as source of truth. Hard prerequisite for Phase 6 and the longest lead-time item — Nash owns it.