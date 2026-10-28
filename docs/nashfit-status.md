# NashFit — Project Status

**Snapshot as of 2026-10-24.** One page, written to be read cold — by a person returning to the project, or by an AI assistant with no access to this repository. Paste it whole.

**Regenerate this file rather than patching it.** It summarises other documents; if it drifts from them, they are right and this is wrong.

---

## What NashFit is

A subscription mobile app for Dr. Nash Jocic's fitness community. v1 delivers one loop: **onboard → get an AI-generated Nash-style training plan → follow it (video + cues per exercise) → log what you actually did.**

The differentiator is that plans and coaching come from Nash's own methodology, not a generic model.

**Stack:** Expo / React Native SDK 57 (TypeScript) · Supabase (Postgres, Auth, Storage, Edge Functions) · Claude API for plan generation · RevenueCat for subscriptions · PostHog + Sentry.

---

## Where we are

**Everything that could be built without outside input has been built.** What remains is blocked on content from Nash, on store/toolchain setup, or on a verification pass.

| Phase | Status |
|---|---|
| 0 — Setup & infrastructure | ✅ **Complete** |
| 1 — Auth & accounts | 🟨 Email flow written but **never run against real auth**. Apple/Google sign-in and account deletion not started |
| 2 — Subscription & paywall | ⬜ Store accounts now exist; needs a development build |
| 3 — Exercise library | 🟨 36 exercises seeded, browse/filter/search built. **Form cues are placeholders** |
| 4 — Exercise detail & video | ⏸️ Blocked on Nash's video files |
| 5 — Onboarding | 🟨 Written, not yet run |
| 6 — AI plan generation | ⏸️ Blocked on the Principles Document, which does not exist |
| 7 — Session logging | 🟨 Built: ad-hoc sessions, RPE, reorder, history, per-exercise progress, unit lock. **7.1 ⏸️** — prescribed logging is written but no plan can exist until Phase 6 |
| 8 — Offline logging | ⬜ Not started — unblocked, but see the note under *What to build next* |
| 9 — Pre-launch | ⬜ Not started |

### Built and working

- Expo SDK 57, TypeScript strict, ESLint + Prettier, CI running lint/typecheck/format/test
- Two Supabase projects. **Dev holds the full schema and content; prod is deliberately empty**
- 11 tables, 8 enums, 12 foreign keys, 21 RLS policies and explicit grants — applied and behaviourally tested
- Edge Functions deploying; health check proves pipeline, auth gateway and secrets channel
- PostHog and Sentry wired; brand tokens implemented (dark-only, Lora + Inter)
- Full email auth: sign-up, sign-in, password reset, encrypted persistent sessions, three-state routing
- **36 exercises** across 8 muscle groups, seeded via idempotent migrations
- Library browse with muscle-group and equipment filters and name search, cached for offline use
- Four-step onboarding collecting the plan inputs; Settings with unit preference
- Full ad-hoc workout logging: start, add exercises, log sets with optional RPE, reorder, remove, resume after interruption, finish
- Workout history and per-exercise progress over time
- `unit_preference` locked once any set is logged — enforced by a database trigger, not only in the UI
- **50 tests** covering library filtering, onboarding validation, the plan-input/preference split, and set entry

---

## Decisions that constrain future work

Expensive to reverse. Full reasoning in `docs/nashfit-progress-log.md`.

| Decision | Consequence |
|---|---|
| **Bundle identifiers** `com.nashfit.app` / `.dev` | **Permanent once a store listing exists.** Lets both builds coexist on one device — required for offline-sync testing at 8.5 |
| **Database enforces client-generated UUIDs** on logging tables | A client that forgets to generate an id fails loudly instead of the DB masking a sync bug |
| **RESTRICT on deleting exercises and plans** with logged history | Nash cannot delete content someone trained against; he archives. Protects history from a dashboard click |
| **Two-phase plan review enforced in RLS** by current status | The phase is a config toggle, never hardcoded. Plan metadata stays visible so "being prepared" works; prescribed content is withheld |
| **`users` rows created by a database trigger** | One place covers email, Apple and Google sign-in. No client code creates profiles |
| **Auth tokens encrypted at rest** (key in SecureStore, AES blob in AsyncStorage) | SecureStore alone is too small for a Supabase session; AsyncStorage alone is plaintext. Changing this invalidates every session |
| **Plan inputs and preferences written by separate functions** | A preference change physically cannot carry a plan input. Unit preference must never regenerate a plan |
| **`unit_preference` locks after the first logged set** | Weights are stored unconverted, so switching units would silently rewrite the meaning of every past set. Decided 2026-10-20 over the alternative of denormalising the unit onto each row |
| **Reordering offered on ad-hoc sessions only** | A prescribed session's order is part of what Nash's rules decided |
| **Dark-only theme** | The brand supplies one palette. A light theme would mean inventing colours Nash has not approved |
| **US region** for Supabase and PostHog | The privacy policy must disclose US processing; UK/EU users keep GDPR protection regardless |
| **Exercise catalogue is video-driven** | An exercise exists only if filmed. Each filmed variation is its own row, keeping per-exercise progress honest |
| **Explicit table grants, not platform defaults** | Supabase's defaults differ between local and hosted, so local RLS testing was not evidence about production |

---

## Blocked on Nash

| Needed | Blocks |
|---|---|
| **Form cues per exercise** | Phase 3 completion and the detail screen (4.3). *All 36 exercises currently carry `[PLACEHOLDER]` cues — a release blocker, gate E1* |
| **Video files** | All of Phase 4 |
| **The Principles Document** | All of Phase 6. **The longest-lead item in the project** |
| Confirmation of the eight muscle groups and the equipment list | Content accuracy |

Resolved: the definitive filmed-exercise list (2026-10-11), and the domain `nashfittraining.com` (2026-10-20).

## Blocked on the developer

| Needed | Blocks |
|---|---|
| **A device pass** through `docs/nashfit-verification-checklist.md` | Eight sections accumulated. Moves 0.10 and all of Phases 1, 3, 5 and 7 from 🟨 to ✅ |
| **Xcode + Android Studio** | Sentry and PostHog verification; **mandatory at 2.1** for RevenueCat |
| Own team-member logins on both store accounts | Everything is under `nash@nashfittraining.com`; Apple 2FA on a shared login blocks submission day |
| Sentry auth token | Readable production stack traces |

Resolved: App Store Connect and Google Play accounts (2026-10-20).

---

## What to build next

**1.8 — account deletion.** Small, fully unblocked, and **mandatory for App Store approval** (guideline 5.1.1(v)); its absence would cause rejection. Needs an Edge Function on the secret key, since clients cannot delete auth users. The schema already cascades cleanly.

**9.5a — privacy policy and terms**, now that `nashfittraining.com` exists. Must disclose US data processing.

**Phase 8, offline logging** is the largest unblocked chunk — but it is sync built on top of a logging flow nobody has run yet. Debugging two unverified layers at once is avoidable by doing the device pass first.

**The verification pass remains the highest-value thing overall.** Five phases are written on foundations that have never been exercised against real authentication. Checklist sections B3–B8 cover it.

---

## Where the detail lives

| Document | Contains |
|---|---|
| `docs/nashfit-build-plan.md` | Every task and its status |
| `docs/nashfit-progress-log.md` | What was done, what was verified, why each decision was made. Append-only; backs invoicing |
| `docs/nashfit-verification-checklist.md` | Everything needing a device, dashboard or store account — including the **pre-launch content gate** |
| `docs/nashfit-exercise-taxonomy.md` | Muscle groups, equipment, Nash's exercise breakdown |
| `docs/nashfit-environment-setup.md` | Supabase/Sentry/PostHog setup; client-safe vs server-only keys |
| `docs/nashfit-v1-prd.md`, `-data-model.md`, `-tech-stack.md`, `-user-stories.md` | Original specifications |
| `docs/nashfit-brand-guidelines.md` | Colour, type and component tokens |
| `CLAUDE.md` | Working rules for AI assistants on this project |

---

## Honest notes

- **No account has ever been created against real auth.** Phases 1, 3, 5 and 7 typecheck, lint, test and bundle — nothing more. This is the single largest piece of unverified work.
- **There is no paywall.** Phase 2 is unbuilt, so anyone who signs up currently gets the whole app free. The PRD specifies a hard paywall gating everything past auth — a release blocker, not a gap.
- **Account deletion is missing** and is an App Store requirement (task 1.8).
- **All 36 exercises have `[PLACEHOLDER]` form cues.** Deliberately unmistakable, and gated as a release blocker, but the library is currently movement names with no coaching — which is the product's whole differentiator.
- **`nashfit-prod` has no schema.** Deliberate, but production is not ready for anything.
- **A paused free-tier Supabase project came back empty** on dev (2026-10-11). The schema survived because it lives in migrations; user data would not have. A paid prod plan is a launch blocker.
- **The Principles Document is the critical path.** Phase 6 is the hardest part of the build and cannot start without it.
