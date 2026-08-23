# NashFit — v1 User Stories & Feature List
 
**Status:** Living document — update as decisions change
**Scope:** v1 (exercise library + AI plan generation + session logging). Stories grouped by epic, ordered in build sequence. Everything traces to a decision in the PRD, data model, or tech-stack doc.
 
**Scope note (expanded).** AI plan generation is now in v1. Two epics were added (Onboarding, AI Plan Generation) and logging reframed to include logging *against a prescribed plan*. The deferred list shrank accordingly.
 
**Build order:** auth → subscription → library → detail → onboarding → plan generation → logging → offline, then cross-cutting. Library/detail come before plan generation because the generator selects from the library — you need the catalogue and its data before a plan can reference it.
 
---
 
## Epic 1 — Auth & Accounts
 
- As a new user, I want to sign up with email and password so that I can create an account.
- As a new user, I want to sign up / sign in with Apple so that I can join without a new password. *(Required by Apple since Google is offered.)*
- As a new user, I want to sign up / sign in with Google so that I can join quickly.
- As a user who forgot my password, I want to reset it via email so that I can regain access. *(Must-have, since email/password is offered — Supabase Auth provides the flow.)*
- As a returning user, I want to stay signed in between app opens so that I don't re-authenticate every session.
- As a user, I want to sign out so that I can leave my account on a shared device.
---
 
## Epic 2 — Subscription & Paywall
 
- As a signed-up user, I want to see the subscription options (annual headline + monthly) so that I can choose a plan.
- As a user, I want to subscribe and pay via the app store so that I can unlock access.
- As a subscriber, I want the whole app gated until I subscribe so that access matches my payment. *(Hard paywall — no free content.)*
- As a returning subscriber, I want my subscription recognised across app reinstalls / devices so that I keep access I've paid for. *(RevenueCat.)*
- As a user, I want to restore purchases so that I regain access if it isn't detected.
---
 
## Epic 3 — Exercise Library (browse & search)
 
- As a user, I want to browse the full exercise library so that I can find exercises to view.
- As a user, I want to filter exercises by muscle group so that I see only relevant ones. *(Muscle group + equipment are the only v1 filters.)*
- As a user, I want to filter exercises by equipment so that I see exercises I can actually do.
- As a user, I want to search exercises by name so that I can jump straight to one.
---
 
## Epic 4 — Exercise Detail & Video
 
- As a user, I want to open an exercise and watch its instructional video so that I learn to perform it Nash's way. *(One primary video per exercise; streamed via signed URL. Reached by browsing or by tapping an exercise inside my plan.)*
- As a user, I want to read Nash's form cues for an exercise so that I get his specific coaching points. *(Rendered as a list of discrete cues.)*
- As a user, I want to see an exercise's target muscles and required equipment so that I understand what it trains and needs.
---
 
## Epic 5 — Onboarding (plan-generation inputs)
 
- As a new subscriber, I want to enter my age, experience level, sex, and training days per week so that my plan fits me. *(The four plan-generation inputs; goal is deliberately not asked.)*
- As a user, I want to set my unit preference (kg/lb) so that weights display in my units. *(A preference — display only; must not affect plan generation.)*
- As a user, I want clear guidance on what each experience level means so that I pick the one Nash's rules expect. *(Helper text — users often misjudge their level.)*
- As a returning user, I want to update my inputs and get a new plan so that my plan keeps matching me. *(Re-onboarding → new plan; the old plan stays traceable via its input snapshot.)*
---
 
## Epic 6 — AI Plan Generation
 
- As a user, I want a Nash-style training plan generated from my inputs so that I know exactly what to train. *(Generated from Nash's Principles Document, assembled from real library exercises.)*
- As a user, I want each exercise in my plan to link to its video and cues so that I know how to perform it. *(Ties the plan to Epic 4.)*
- As a user, I want to see the prescribed sets/reps/target for each exercise so that I know the target before I lift.
- As a user, I want my plan to be ready reliably so that onboarding leads to a usable result. *(Handles the Phase 1 "plan is being prepared" state vs. Phase 2 instant.)*
**Behind the scenes (not user-facing, but v1 requirements):**
- The plan is generated server-side (Edge Function → Claude), constrained to select from the exercise library, and validated against it before persistence.
- **Phase 1 (launch):** each plan is created `pending_review` and withheld until a reviewer (Nash/dev) approves it via the Supabase dashboard; a notification fires on creation.
- **Phase 2 (once trusted):** plans go straight to the user; the creation notification remains as an audit safety net. The phase is a config toggle.
- Each plan records which Principles Document version and which inputs produced it.
---
 
## Epic 7 — Session Logging
 
- As a user following my plan, I want to log the sets/weights/reps I actually did so that I record my performance against the prescription. *(Logging against an AI-prescribed session — the prescribe→log loop.)*
- As a user, I want to log an ad-hoc session I assembled myself so that I can record a workout outside my plan. *(Ad-hoc sessions — no prescription, actual only.)*
- As a user, I want to optionally record RPE on a set so that I can note how hard it felt.
- As a user, I want to reorder or remove exercises in an ad-hoc session so that it reflects what I actually did.
- As a user, I want to save a completed session to my history so that I keep a record.
- As a user, I want to see my past sessions so that I can review what I've done.
- As a user, I want to see my progress on a given exercise over time so that I can tell whether I'm improving. *(Per-exercise history across sessions.)*
---
 
## Epic 8 — Offline Logging
 
- As a user training with no signal, I want to log my sets offline so that poor gym connectivity doesn't lose my data.
- As a user, I want my offline-logged sessions to sync automatically when the connection returns so that my history is complete without manual effort.
- As a user, I want to resume an in-progress session so that an interruption or app close doesn't lose the workout. *(Supported by session status.)*
*(Note: plan generation and video require a connection; only logging is offline-capable in v1.)*
 
---
 
## Epic 9 — Cross-cutting / Non-functional
 
Not user-facing stories, but v1 requirements that must be in place at launch:
 
- Product/behaviour analytics instrumented from launch (PostHog) so data accumulates from day one.
- Crash/error monitoring live from launch (Sentry).
- Plan-creation notification wired to Nash/dev (both phases).
- App runs on both iOS and Android from the same codebase (Expo / React Native).
---
 
## Explicitly Not in v1 (traceable to the PRD)
 
Recorded so they don't creep in as stories: full corpus/RAG decomposition of Nash's eBooks/videos/programs; nutrition; community/social; user-built workout templates and manual multi-week program-building; closed-loop auto-adjustment of plans from logged history (the AI reading back your sets to change the next plan — structurally supported, not automated in v1); offline video download (priority v2 fast-follow); biometric (Face ID) unlock; custom admin panel and custom plan-review UI (developer operates the Supabase dashboard in v1); fine-tuning a model in Nash's voice.
 
---
 
## Related Documents
 
- **v1 PRD** — scope, pricing, target user, boundaries, two-phase review.
- **v1 Data Model** — the tables these stories read and write (incl. `plans`, onboarding inputs, prescription fields).
- **v1 Tech Stack** — how each capability is implemented (Supabase, Edge Functions + Claude, RevenueCat, PostHog, Sentry).
- **Principles Document** — Nash's methodology; drives Epic 6.
- **User Information Gathering template** — defines Epic 5's inputs and the plan-input vs. preference split.