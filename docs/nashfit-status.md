# NashFit — Project Status

**Snapshot as of 2026-10-02.** One page, written to be read cold — by a person returning to the project, or by an AI assistant in a conversation with no access to this repository. Paste it whole.

**Keep it current by regenerating, not patching.** It summarises other documents; if it drifts from them, they are right and this is wrong.

---

## What NashFit is

A subscription mobile app for Dr. Nash Jocic's fitness community. v1 delivers one loop: **onboard → get an AI-generated Nash-style training plan → follow it (video + cues per exercise) → log what you actually did.**

The differentiator is that plans and coaching come from Nash's own methodology, not a generic model.

**Stack:** Expo / React Native (TypeScript) · Supabase (Postgres, Auth, Storage, Edge Functions) · Claude API for plan generation · RevenueCat for subscriptions · PostHog + Sentry.

---

## Where we are

**Phase 0 (infrastructure) is complete. Phase 1 (auth) is written but unverified. Phase 3 (exercise library) is blocked on content from Nash.**

| Phase | Status |
|---|---|
| 0 — Setup & infrastructure | ✅ Complete (0.8 CI lacks a test step; 0.9/0.10 need a device to finish verifying) |
| 1 — Auth & accounts | 🟨 Email/password flow written, not yet run against real auth. Apple/Google sign-in not started |
| 2 — Subscription & paywall | ⬜ Not started — needs a development build and store accounts |
| 3 — Exercise library | ⏸️ **Blocked on Nash**: the definitive list of filmed exercises and his form cues |
| 4 — Exercise detail & video | ⏸️ Blocked on the same, plus the videos themselves |
| 5 — Onboarding | ⬜ Not started — **fully specified and unblocked**, the obvious next build |
| 6 — AI plan generation | ⏸️ Blocked on Nash's Principles Document, which does not exist yet |
| 7 — Session logging | ⬜ Not started |
| 8 — Offline logging | ⬜ Not started |
| 9 — Pre-launch | ⬜ Not started |

### Built and working

- Expo SDK 57, TypeScript strict, ESLint + Prettier, GitHub Actions CI (lint, typecheck, format)
- Two Supabase projects (dev, prod). **Dev has the full schema; prod is deliberately empty** until the schema proves itself
- 11 tables, 8 enums, 12 foreign keys, 21 RLS policies — all applied and behaviourally tested
- Environment config with separate dev/prod bundle identifiers, so both builds can coexist on one device
- Edge Functions deploying, with a health check proving the pipeline, auth gateway and secrets channel
- PostHog and Sentry wired; brand design tokens implemented (dark-only, Lora + Inter)
- Full email auth flow: sign-up, sign-in, password reset, persistent encrypted sessions, auth-state routing

---

## Decisions that constrain future work

Each of these is expensive to reverse. Full reasoning is in `docs/nashfit-progress-log.md`.

| Decision | Consequence |
|---|---|
| **Bundle identifiers split dev/prod** (`com.nashfit.app.dev` / `com.nashfit.app`) | Permanent once a store listing exists. Lets both builds sit on one device — required to test offline sync at 8.5 |
| **Database enforces client-generated UUIDs** on `sessions`/`session_exercises`/`sets` (no default) | A client that forgets to generate an id fails loudly rather than the DB silently minting one and breaking offline sync |
| **RESTRICT on deleting exercises and plans** referenced by logged history | Nash cannot delete content someone has trained against; he archives instead. Protects user history from a dashboard click |
| **Two-phase plan review enforced in RLS**, driven by current plan status | Phase 1 vs Phase 2 is a config toggle, never hardcoded. Plan *metadata* is always visible (so "being prepared" works); the prescribed content is withheld until approved |
| **`users` profile rows created by a database trigger** | Covers email, Apple and Google sign-in in one place. No client code creates profiles |
| **Auth tokens encrypted at rest** (key in SecureStore, AES session in AsyncStorage) | SecureStore alone caps at ~2KB — too small for a Supabase session; AsyncStorage alone is plaintext. Changing this later invalidates every session |
| **Dark-only theme** | The brand guidelines supply one palette, a dark one. A light theme would mean inventing colours Nash has not approved |
| **Supabase publishable keys** (`sb_publishable_`), not legacy `anon` JWTs | Legacy keys are deprecated end of 2026 |
| **US region** for Supabase and PostHog | Developer's call; EU was recommended. **Consequence:** the privacy policy at 9.5 must disclose US processing, since UK/EU users keep GDPR protection regardless of hosting |
| **Exercise catalogue is video-driven** | An exercise exists only if Nash has filmed it. This also decides that each filmed variation is its own row |

---

## Blocked on Nash

| Needed | Blocks |
|---|---|
| **Definitive list of exercises he has videos for** | All of Phase 3 |
| **Form cues per exercise**, as discrete points | Phase 3 and the detail screen at 4.3. *This is the differentiator — without cues the library is just movement names* |
| **The Principles Document** | All of Phase 6 (AI plan generation). The longest-lead item in the project |
| Confirmation of the eight muscle groups, and a look at the equipment list | 3.1 |
| A domain he controls | Password-reset deep links (1.3) and the privacy policy URL (9.5) |

**What exists so far:** a breakdown of 36 movements across 8 muscle groups, sent 2026-09-22 — names only, no cues, no indication of which are filmed. Recorded in `docs/nashfit-exercise-taxonomy.md`.

## Blocked on the developer

| Needed | Blocks |
|---|---|
| **Xcode + Android Studio**, for a development build | Verifying Sentry (0.9) and PostHog (0.10); mandatory at 2.1 for RevenueCat |
| A device pass through `docs/nashfit-verification-checklist.md` | Moving 0.10, 1.1, 1.2, 1.3, 1.6 and 1.7 from 🟨 to ✅ |
| Sentry auth token | Source-map upload, so production stack traces are readable |
| App Store Connect + Google Play accounts | All of Phase 2 |

---

## What to build next

**Phase 5, onboarding** — the only substantial chunk with no external dependency. It collects the four plan-generation inputs (age, experience level, sex, training days per week), which are fully specified in `docs/nashfit-user-info-gathering-template.md`, and writes them to a `users` table that already exists. It also feeds Phase 6 directly.

Smaller unblocked items: a test runner for CI (0.8), and the exercise data-access layer (3.3), which depends on the schema rather than on which exercises exist.

---

## Where the detail lives

| Document | Contains |
|---|---|
| `docs/nashfit-build-plan.md` | Every task with its status — the task tracker |
| `docs/nashfit-progress-log.md` | Chronological record of what was done, what was verified, and why each decision was made. Append-only; it backs invoicing |
| `docs/nashfit-verification-checklist.md` | Everything needing a device, dashboard or store account to confirm |
| `docs/nashfit-exercise-taxonomy.md` | Muscle groups, equipment, and Nash's exercise breakdown |
| `docs/nashfit-environment-setup.md` | Supabase/Sentry/PostHog setup; the client-safe vs server-only key split |
| `docs/nashfit-v1-prd.md`, `-data-model.md`, `-tech-stack.md`, `-user-stories.md` | The original specifications |
| `docs/nashfit-brand-guidelines.md` | Colour, type and component tokens |
| `CLAUDE.md` | Working rules for AI assistants on this project |

---

## Honest notes

- **Nothing in Phase 1 has been exercised against real authentication.** It typechecks, lints and bundles; no account has been created. That is the single largest piece of unverified work.
- **`nashfit-prod` has no schema.** Deliberate, but it means production is not ready for anything.
- **Three verifications are waiting on a development build**, which needs a ~15GB toolchain install. It becomes mandatory at Phase 2 regardless.
- **The Principles Document is the critical path.** Phase 6 is the hardest part of the project and cannot start without it. Worth pressing on well before Phase 3 finishes.
