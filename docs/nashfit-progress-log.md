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
| `SENTRY_AUTH_TOKEN` for source-map upload | 0.9 (source maps), 9.2 | Org/project slugs are now configured (`nashfit`/`nashfit`). Upload still needs this token in the build environment — it grants write access to the Sentry org, so EAS build secrets only, never the repo or bundle. Generate at Settings → Auth Tokens. |
| `nashfit-functions` DSN, via `supabase secrets set` | 0.9 (server half) | Not needed until the first Edge Function that can meaningfully fail (4.2 or 6.2). |
| Own team-member logins on both store accounts | 2.x | Everything is under `nash@nashfittraining.com`. Apple requires 2FA, so a shared login means codes go to Nash's device — a hard blocker on submission day. Add the developer as Admin/App Manager with a separate Apple ID and Google account. |
| Xcode + Android Studio, for a development build | 0.9, 0.10, 2.1 | Three verifications are blocked on it, and RevenueCat makes it mandatory at 2.1 anyway. |
| Confirm a `$screen` event reached PostHog | 0.10 (final ✅) | The app ran on device; checking PostHog → Activity for a `$screen` event alongside `setup_verification` is the last step to close 0.10. |
| ~~Nash's domain~~ **RESOLVED 2026-10-20** | — | `nashfittraining.com`. Unblocks Universal Links for password reset (1.3) and hosting for privacy policy / terms (9.5a). |
| Nash's Principles Document | Phase 6 (6.1–6.5) | Listed in CLAUDE.md as source of truth but absent from `/docs`. Hard prerequisite for plan generation; the longest lead-time item in the project. |

---

## 2026-10-24 — Account deletion (1.8)

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 1.8 | `delete-account` Edge Function | 🟨 Written, **verified end-to-end locally**, not deployed | _pending_ | |
| 1.8 | Confirmation screen, Settings and onboarding entry points | 🟨 Written | _pending_ | |

**Why this task, now.** Apple guideline 5.1.1(v) makes in-app account deletion mandatory for any app offering account creation. Its absence is a rejection, not a note. It was also the only fully unblocked item left in Phase 1.

**Decision: immediate hard delete, no grace period.** A scheduled deletion is a promise kept by a background job rather than by a request. It needs a sweeper that must actually run — on infrastructure where a paused free-tier project already came back empty once (dev, 2026-10-11). If that job silently stops, the app has told users their data is gone while it sits in the table, which is a worse position than never offering a window. A grace period would also have to be disclosed in the privacy policy (9.5a) and would add a fourth account state to routing that has never been exercised against real auth. The thing it buys — undo for a mis-tap — is bought more cheaply by a typed confirmation. It remains additive later if support requests ever justify it.

Apple permits a wind-down; what 5.1.1(v) forbids is deactivation offered *instead of* deletion. Immediate deletion satisfies the strictest reading, so this choice is a simplification rather than a compliance risk. Re-reading the current guideline before submission is checklist **F4**.

**A predicted schema failure that turned out not to exist.** `sessions.plan_id` is `ON DELETE RESTRICT`, so deleting a user looked like it should fail: the cascade into `plans` would hit a session still referencing the plan. Tested against the real schema before writing any migration — it succeeds. The `sessions.user_id` cascade is queued by the same statement that queues the `plans` cascade, so the session rows are gone before the nested RESTRICT check runs. Separately confirmed that deleting a plan *directly* is still refused, so Nash's protection against destroying a plan someone trained against is untouched.

**No migration was written.** Worth recording explicitly: the instinct was to relax the constraint to `NO ACTION`, and testing first showed the schema was already correct. Changing it would have weakened a deliberate protection to fix nothing.

**Server-side authorisation is the whole risk here.** The function takes the user id from the verified JWT and from nowhere else. An endpoint that read a user id from the request body would let any authenticated user delete any account — so that is the case the tests target directly: authenticate as one user, name a different user in the body, and confirm the *caller* is the one deleted and the named account survives.

**Verified — 15 assertions against local Supabase auth**, with real users, real JWTs, and a seeded plan + prescribed session + logged sets:

- rejects a call with no JWT (401), a malformed JWT (401), and `GET` (405)
- a body-supplied `user_id` is ignored: the caller is deleted, the named account survives
- deletes a user who has a plan with training logged against it — the case the RESTRICT scare was about
- cascade confirmed empty across `users`, `plans`, `sessions`, `session_exercises`, `sets`
- the `auth.users` row returns 404, proving a hard delete rather than Supabase's soft delete
- a repeat delete with a still-valid token returns success, not an error
- the email address can be reused afterwards

This is a stronger standard of evidence than anything else in Phase 1, which is written but has never run against real auth. It does **not** extend to the UI or to the hosted projects.

**A gap found while building.** A user who signs up and abandons onboarding had no sign-out and no delete: the onboarding screens have no tab bar and no exit, so the account was unreachable and undeletable. Since 5.1.1(v) covers anyone with an account, the delete route is guarded on `isSignedIn` alone — outside both the onboarding and tabs states — with a quiet link on the onboarding screen. **The missing sign-out is a separate gap** belonging to 1.6/1.7 and was deliberately not fixed here; it is noted in the build plan and still needs its own task.

**What the user is told**, on a full screen rather than an alert, because an alert is the surface people dismiss without reading: training history is erased permanently; **the subscription is not cancelled** and must be cancelled with Apple or Google, named per platform; signing up again starts from nothing. The subscription point has money attached — Phase 2 has not landed, so nobody has a subscription to cancel today, but the copy exists now rather than being remembered at launch. 9.5a was updated to require the privacy policy to match it.

**Deliberately not done.** The function is **not deployed** — deleting an account does not work in the app until checklist **F1** runs. Deployment is a change to hosted infrastructure and was left for the developer.

**Verified.** Typecheck, lint, Prettier, 59 tests (up from 50 — 9 new, covering the confirmation gate, that the client never names a user, and that a failed delete leaves the session intact). Plus the 15 live assertions above.

**Unverified.** Every pixel. No screen has been on a device — checklist **B9**. The Edge Function has not run on hosted Supabase, only locally — **F1–F3**.

---

## 2026-10-22 — Phase 7 built: logging, history, progress

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 7.1 | Prescribed-session logging | ⏸️ Built, unverifiable | _pending_ | |
| 7.2–7.5 | Ad-hoc sessions, RPE, reorder/remove, save to history | 🟨 Written | _pending_ | |
| 7.6 | Session history | 🟨 Written | _pending_ | |
| 7.7 | Per-exercise progress | 🟨 Written | _pending_ | |
| 7.8 | Units stored as entered; preference locked | 🟨 Written | _pending_ | |

**One screen handles both session types.** Prescribed and ad-hoc sessions differ only in whether a prescription exists, so `session/[id]` renders both: targets appear above each exercise when present, and ad-hoc exercises show no prescription row at all rather than a row of dashes, which would imply one exists. Reordering is offered on ad-hoc sessions **only** — the order of a prescribed session is part of what Nash's rules decided, and is not the user's to shuffle.

**Resume comes before start** on the Train tab. A workout interrupted by a phone call is the normal case, not the exception, and burying the resume behind "start a workout" is how someone ends up with two half-sessions. The check refetches on focus rather than mount, so returning from a finished session does not leave a stale resume card.

**Finishing is blocked at zero sets.** Saving an empty session would put a workout with nothing in it into history, which is never what anyone means.

**Progress is a table, not a chart (7.7).** Weight alone is a misleading line — 100×5 and 80×12 are different kinds of hard — and a chart ignoring reps invites reading a deload as decline. The numbers, oldest first, let a lifter judge for themselves, which is how Nash's audience thinks about progression. Charting is reasonable for v2 once there is enough history for a trend to mean anything.

**History rows summarise rather than enumerate**: date, exercises, set count and heaviest set. Someone scanning is looking for "when did I last train legs", not a transcript — that is what tapping in is for. The detail view shows **both sides of the split**, prescribed against actual, which is the comparison the whole prescribe-then-log loop exists to produce.

**Unit lock completed (7.8).** The database trigger landed earlier; this adds the client half. `has_logged_sets()` is called through RPC rather than counting rows client-side, and **fails closed** — if the check errors, the UI assumes locked. Wrongly allowing a change silently rewrites the meaning of every past set; wrongly blocking one is merely annoying and recoverable. The Settings toggle disables with an explanation rather than becoming a silently dead control.

Regenerating `src/types/database.ts` was required before the RPC typechecked — a useful reminder that `npm run db:types` is part of any migration that adds a function.

**Why 7.1 is ⏸️ rather than 🟨.** The prescribed-logging path is written and will work, but **no prescribed session can exist** until plan generation lands (Phase 6), which waits on the Principles Document. It cannot be verified before then, and marking it 🟨 would imply a device pass could close it.

**Verified.** Typecheck, lint, format, 50 tests, clean iOS bundle (2177 modules). The unit-lock trigger was separately verified against the database across six cases, including that deleting history releases the lock.

---

## 2026-10-20 — Phase 7 begun: units locked, logging data layer

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 7.8 | `unit_preference` lock enforced in the database | 🟨 Enforcement done, UI pending | _pending_ | |
| 7.1–7.7 | Logging types and data-access layer | 🟨 In progress | _pending_ | |

**Units decision resolved (2026-10-20): lock the preference.** Weight is stored exactly as entered with no conversion, so switching units would silently rewrite the meaning of every historical set — 100kg becoming 100lb. The alternative considered was denormalising the unit onto each `set` row, which would have kept history unambiguous and allowed switching freely; lock was chosen as the simpler option and costs no schema change. Recorded in the data model, which had flagged this as "decide before launch".

Enforced by a trigger, not only in the UI: a disabled toggle is a suggestion, and the REST API is directly reachable with the publishable key. The check tests for *current* existence of sets, so it self-heals — a user who deletes their history can change units again, where a one-way flag could disagree with the data it describes. A `has_logged_sets()` function lets the client disable the toggle without pulling every set down to count them.

Verified behaviourally, all six cases: changing units before any set exists is allowed; after a set exists it is rejected; updating other columns on the row still works; writing the *same* unit is not treated as a change; `has_logged_sets()` reports correctly; and deleting history releases the lock.

**Logging data layer.** `src/features/logging/` holds the types and queries for Epic 7, built around the prescription-versus-actual split the data model insists on: `prescribed_*` is what the AI said to do, `sets` is what the user did, and they are never merged. `hasPrescription` is checked per exercise rather than per session, since a prescribed session may contain an exercise without targets and the UI should not render "— × —".

**Every id is client-generated.** `newId()` is the only source, matching the schema's deliberate absence of a `gen_random_uuid()` default on the three logging tables. A row written with no connection already has its final identity, which is what makes Epic 8's sync an insert rather than a reconciliation.

Ad-hoc sessions write `created_by: 'user'` explicitly and set all four `prescribed_*` columns to null — the RLS insert policy enforces the former independently, so a client cannot pass a hand-built workout off as Nash-generated.

`completeSession` stamps `performed_at` on completion rather than creation, because a prescribed session exists before it is performed and the column means the workout, not the row.

**Set-entry validation and the session hook.** `validation.ts` deliberately errs towards accepting input: this is used one-handed mid-workout, and blocking someone over a rule that only catches typos is worse than storing an odd number. Zero weight is **accepted** so bodyweight exercises are loggable — rejecting it would make pull-ups impossible to record. A comma is accepted as a decimal separator, since European keyboards offer one. RPE is optional, so blank returns no value rather than an error, and is restricted to half points because 7.25 is not a thing anyone means.

`suggestNextSet` carries the previous set's weight and reps forward — retyping the same numbers five times is the main friction in logging — falling back to the prescription on the first set of a prescribed exercise. RPE is **not** carried forward: it describes the set just performed, and pre-filling invites accepting a stale number.

`useSession` refetches after every mutation rather than patching local state. A workout is not latency-sensitive between sets, and the simpler model removes any chance of the screen and the database disagreeing about how many sets were logged — drift a user would only notice after finishing. Mutation errors are surfaced, never swallowed: a set the user believes they logged but which never landed is the worst outcome in this feature.

**Tests now 50, up from 29.** The new 21 cover weight/reps/RPE validation including the bodyweight-zero and comma-decimal cases, the next-set suggestion precedence, and the prescription-versus-actual helpers — including that an ad-hoc exercise returns `null` rather than a placeholder, since rendering "— × —" would imply a prescription exists.

**Still to build:** the logging screens (7.1–7.5), history (7.6), per-exercise progress (7.7), and the Settings UI half of 7.8.

---

## 2026-10-15 (cont. 2) — Onboarding, settings, and three-state routing

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 5.1 | Four-step onboarding collecting the plan inputs | 🟨 Written | _pending_ | |
| 5.2 | Helper text under each experience band | 🟨 Written | _pending_ | |
| 5.3 | Unit preference as a display-only setting | 🟨 Written | _pending_ | |
| 5.4 | Re-onboarding entry point | 🟨 Partial | _pending_ | |
| 5.5 | Age and training-day validation | 🟨 Written | _pending_ | |

**The plan-input / preference split is enforced structurally**, not by convention. `savePlanInputs` and `saveUnitPreference` are separate functions touching disjoint columns, so a preference write cannot carry a plan input with it. Settings presents them as two sections with different wording — "changing them creates a new one" versus "changing these never affects your plan" — because the difference matters to the user and is invisible otherwise. Unit preference is deliberately **not** an onboarding step, for the same reason.

`isOnboardingComplete` is **derived from the four inputs**, not stored as a flag. A separate boolean can disagree with the data it describes, and then nothing tells you which is right.

**Four steps rather than one form.** These four values are the only things the generator knows about a user; a stepped flow makes that weight visible where a four-field form invites rushing. It also gives each experience band room for the helper text task 5.2 requires — the template is explicit that people misjudge their own level, which a segmented control or wheel picker cannot address.

**Nothing is written until the final step.** A half-saved profile is a state nothing else understands, and `isOnboardingComplete` would flip the moment the last field happened to land.

**Routing now has three states** — signed out, signed in without onboarding, signed in with it — each a declared stack behind a guard. Subscription gating (2.4) slots in as a fourth without restructuring. The readiness gate grew a third condition: fonts, session, *and* profile. Routing on an unknown profile would flash onboarding at someone who completed it months ago.

**A React 19 lint rule caught a real bug.** The first profile context called a loader synchronously inside an effect, which `react-hooks/set-state-in-effect` rejects as a cascading render. Rewriting it to **key state by user id and derive during render** fixed the rule and, more usefully, removed a class of bug: a stale profile cannot be briefly visible to the next person on a shared device, because it is never read when the ids disagree. The rule pointed at a correctness problem, not a style one.

**Tests: 29 passing, up from 16.** The new ones cover age validation (including that `32kg` is rejected rather than salvaged as 32 by `parseInt`), the training-day options matching what the Principles Document is expected to support, and the input/preference split — specifically that `isOnboardingComplete` does **not** depend on unit preference, and that `toPlanInputs` returns exactly four fields. That last assertion is equality rather than a subset check: anything extra leaking through would end up in `plans.input_snapshot` and make a preference look like a plan input.

**Why 5.4 is partial.** Inputs can be edited and prior plans stay traceable through their own `input_snapshot`, but "triggers a new plan" needs Phase 6 to exist.

**Also replaced the debug home screen** that had stood since Phase 0 with a real Settings screen. Tabs are now Library and Settings.

**Verified.** Typecheck, lint, format, 29 tests, clean iOS bundle (2165 modules). Not yet run on a device — checklist section B7 covers it, and needs a *fresh* account since an onboarded user skips the flow.

---

## 2026-10-15 (cont.) — Library browse, filters and search

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 3.4 | Browse screen with 36 real exercises | 🟨 Written | _pending_ | |
| 3.5 | Muscle-group filter | 🟨 Written | _pending_ | |
| 3.6 | Equipment filter | 🟨 Written | _pending_ | |
| 3.7 | Search by name | 🟨 Written | _pending_ | |

**Text-only rows, deliberately.** The brand guidelines describe library rows as "thumbnail + serif name + sans metadata", but `exercise_media` is empty — no videos, no stills. A placeholder tile would make every row look broken in every demo until Nash delivers. The row layout leaves a natural left slot, so thumbnails drop in later without a redesign.

Each row shows the name in Lora and one line of `primary muscle group · equipment` in Inter. Movement pattern and secondary groups are available but omitted: at arm's length mid-workout, a third line of grey text costs more than it tells.

**No cards.** §5 specifies cards on `surface1`, which is right for a detail panel and wrong for a 36-row list — it reads as heavy and repetitive. Separation comes from hairline separators and vertical rhythm instead, with `surface1` used as the pressed state. A deliberate departure, noted for Nash's eye.

**Two chip rows rather than a filter sheet.** Filtering is the main action on this screen; a sheet costs a tap and a modal every time and hides the current selection. Scrolling chips keep it visible. Per §5's one-accent rule only the muscle-group row uses brand red; equipment marks selection with a border instead, which also establishes which filter leads.

**Unavailable options are dimmed, not hidden.** An option that would return nothing under the other active filters is disabled at 35% opacity. Hiding them makes the list reshuffle as you use it, which is disorienting; a visibly unavailable option still communicates something. A selected chip stays tappable even at zero so it can always be undone.

**The header scrolls away with the list.** Title, search and both chip rows come to about 160pt — pinned, that is most of a small phone screen. The list is what matters once filtering is done.

**States covered:** first load with an empty cache (the only spinner — a warm cache skips it), load failure with nothing cached, no matches with a clear-filters route out, and pull-to-refresh. A failed background refresh over good cached data stays silent.

**Verified.** Typecheck, lint, format, 16 tests, clean iOS bundle (2158 modules). **Not yet seen on a device** — this is the first screen in the project a user would recognise as the product, and it has only been compiled, not looked at.

---

## 2026-10-15 — Library data layer, filtering, and the test runner (0.8 closed)

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 3.3 | Data-access layer, on-device cache, filter/search logic | ✅ Done | _pending_ | |
| 0.8 | Jest added; CI now runs lint + typecheck + format + test | ✅ Done | _pending_ | |
| 3.2 | Placeholder form cues with a release gate | 🟨 Partial | _pending_ | |

**Data access (3.3).** `src/features/library/` holds types derived from the generated `Database` type, Supabase queries, an on-device cache and pure filter logic. Muscle groups and equipment are joined in a single round trip rather than stitched client-side, which avoids both the extra latency and a torn read if content changed between calls.

**Cache-first, stale-while-revalidate.** Cached content renders immediately and a refresh runs behind it. The alternative — a spinner until the network answers — is precisely wrong for an app used standing in a gym on a weak connection. A failed *background* refresh over good cached data is swallowed rather than surfaced; an error only reaches the user when there is nothing to show.

AsyncStorage rather than SQLite, deliberately: this is a small read-only blob replaced wholesale, not relational data to query. SQLite arrives in Phase 8 for offline *writes*, where the conflict model needs it. It is also unencrypted on purpose — the catalogue is Nash's content, identical for every subscriber and already on their screen. Auth tokens are the thing that needs encrypting and have their own store.

**Filtering is client-side over the cached list** (3.5–3.7), not server queries. The catalogue is ~36 rows, and a filter that needs the network fails exactly when it is needed. Muscle-group filtering matches **primary and secondary** roles — someone filtering to "Triceps" wants presses too — while rows stay labelled with their primary group so the distinction remains visible. Search covers the name only: descriptions currently read "Also performed with a barbell", so searching "barbell" would otherwise surface machine exercises.

`countsByMuscleGroup` / `countsByEquipment` count each option against the *other* active filters, so the UI can dim options that would return nothing rather than letting someone tap into an unexplained empty screen.

**Task 0.8 closed.** Jest (via `jest-expo`) added, and the CI workflow now runs the test step that had been deliberately deferred since Phase 0. The deferral was to avoid a green suite testing nothing; the library filters were the first logic genuinely worth locking down. **16 tests** cover muscle-group and equipment filtering, AND-combination, case/whitespace/accent-insensitive search, the deliberate exclusion of descriptions from search, and the option-count behaviour.

Two setup snags worth recording. `expo-modules-core` was not hoisted to the root (it sits under `expo/node_modules`), so `jest-expo`'s preset could not resolve it — fixed by installing it explicitly at the SDK-compatible version. And `@types/jest` was not being picked up automatically, so `expect` was untyped: typecheck caught this *after* the tests passed, which is a useful reminder that a green test run is not evidence the code typechecks. Resolved with an explicit `types` array in `tsconfig.json`, which also has to list `react` and `node` since setting `types` at all disables automatic inclusion.

**Placeholder cues.** All 36 exercises carry four placeholder cues and two common mistakes so the detail screen (4.3) can be built against realistic content — deliberately varied in length, including one that wraps to three lines, because a layout tested against four tidy strings breaks on Nash's real cues.

Every string is prefixed `[PLACEHOLDER]`. Plausible-looking placeholder coaching is the dangerous kind: CLAUDE.md forbids presenting cues Nash did not write, and the failure mode is invented coaching quietly shipping under his name. **Section E of the verification checklist and task 9.3a now make this a release blocker**, alongside checks that every exercise has real cues and a primary video, and that `nashfit-prod` is on a paid plan.

**Verified.** Lint, typecheck, format check, 16 tests, and a clean iOS bundle (2149 modules). The seed migrations and grants are live on dev.

---

## 2026-10-11 — Exercise library seeded; a grants bug caught in production

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 3.1 | 8 muscle groups + 10 equipment items seeded | ✅ Done | _pending_ | |
| 3.2 | 36 exercises with muscle-group, equipment and movement-pattern links | 🟨 Partial — no form cues | _pending_ | |
| 0.6 fix | Explicit table grants; local and hosted environments reconciled | ✅ Done | _pending_ | |

**The catalogue.** Nash supplied the definitive filmed list, confirming that listed "variations" are *not* filmed — they are alternatives that may be filmed later. Each exercise is therefore named for the implement actually shown in its video (*Flat Dumbbell Press*, *Decline Machine Press*, *Machine Scott Curls*), so the equipment filter can never return an exercise whose video shows different kit. Variations live in `description` and become rows of their own if filmed.

Seeded as **migrations, not `supabase/seed.sql`** — the latter only runs on a local reset and would never reach dev or prod. Both files upsert on `slug` and rebuild the link tables, so re-running converges rather than duplicating; verified by running them twice and confirming identical counts.

Equipment was **derived from what the exercises actually use** rather than from a generic gym inventory. Smith machine, dip station, kettlebell and resistance band were dropped from the earlier speculative list — nothing in Nash's catalogue uses them, and an empty filter option is worse than a missing one. Hyperextension Bench and Roman Chair were added because his list needs them.

Final counts match his list group by group: Chest 5, Back 6, Legs 7, Calves 2, Shoulders 5, Biceps 3, Triceps 3, Abdominals 5 — **36 total**.

**Inferred, and worth Nash's review:** secondary muscle groups (pressing tagged as hitting triceps and shoulders; pulls as hitting biceps) and all `movement_pattern` values. The latter matter more than usual: with "Legs" atomic, hinge-versus-squat is the only thing separating hamstring-dominant from quad-dominant work for the plan generator. Also assumed: Squats and Straight Leg Deadlift are barbell, Lunges are dumbbell.

---

### A real bug, found only by pushing to a hosted environment

Pushing exposed that **Supabase's default table grants differ between the local stack and the hosted project.** Locally, `anon` held SELECT and was filtered to zero rows by RLS. On the hosted project the identical query returned `42501 permission denied for table exercises` — denied a layer earlier, by grants rather than policies.

Postgres has two independent gates: **GRANT** decides whether a role may touch a table at all, **RLS** decides which rows. Task 0.6 configured RLS carefully and tested it thoroughly, but left grants to platform defaults — so that testing validated local behaviour which did not match the hosted project. In the worst case this ships a library that silently fails to load for signed-in users.

`20261011160949_explicit_table_grants.sql` fixes it by revoking everything from both client roles and granting exactly what is intended. The blanket revoke matters: Supabase's default is `ALL` on every table, so granting on top of it is a no-op and would have left content tables writable at the grant layer.

| Role | Content tables | `users` | `plans` | `sessions`/`session_exercises`/`sets` |
|---|---|---|---|---|
| `authenticated` | SELECT only | SELECT, UPDATE | SELECT only | Full CRUD, row-scoped by RLS |
| `anon` | — | — | — | — |

Re-verified after the change: a signed-in user reads all 36 exercises and 8 groups, cannot insert an exercise, and can create their own session; `anon` is denied outright, both locally and on the hosted project.

**Lesson recorded:** RLS tested only against the local stack is not evidence about production. Grants are part of the security model and belong in migrations, not inherited from defaults.

---

### Correction to an earlier statement

The dev project had paused — free-tier Supabase projects pause after about a week of inactivity, and it had been five weeks. It was stated at the time that "your data is fine; pausing preserves the database." **That was wrong.** After restoring, `db push` re-applied all five original migrations *successfully* — and those contain `create type` and `create table`, which would have errored had the objects still existed. The database came back empty.

Nothing of value was lost: dev held schema only, and the RLS test users were on the local stack. But the general claim was incorrect, and the implication matters. **The schema survives a pause because it lives in migrations; user data would not.** A paid plan for `nashfit-prod` is therefore a hard launch blocker, not an optimisation.

One thing remains unexplained: a later push re-applied two seed migrations the ledger had already recorded as remote. Idempotency made it harmless and the following push behaved normally, but the cause is not understood.

---

**Still outstanding: the form cues.** `form_cues` and `common_mistakes` are empty on all 36 rows. What exists is a structurally complete catalogue of movement names — which any fitness app has. Nash's coaching points are what make it his, and the detail screen (4.3) has little to show without them.

---

## 2026-10-02 — Exercise taxonomy corrected; status snapshot added

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 3.1 prep | Muscle groups revised from six to eight; catalogue confirmed video-driven | ⏸️ Parked | _pending_ | |
| — | `docs/nashfit-status.md` added | ✅ Done | _pending_ | |

**Taxonomy corrected — it had been left stale and misleading.** The document still claimed "muscle groups CONFIRMED 2026-09-20" with a six-group list (Chest, Back, Arms, Shoulders, Legs, Abs), while two later inputs had superseded it. That is worse than a missing document: anyone reading it, human or AI, would have acted confidently on wrong information.

What actually happened:

- **2026-09-20** — a quick sketch of six groups.
- **2026-09-22** — a breakdown of **36 movements organised under eight headings**: Chest, Back, Legs, Calves, Shoulders, Biceps, Triceps, Abdominals. Arms is split into biceps and triceps; calves is separated from legs. The eight are now taken as the answer, on the grounds that how Nash organises his own programming is better evidence than a quick list. Flagged in the document as an inference worth confirming with him.
- **2026-09-24** — "tailor the app to exercises we have videos for; I'll get the definitive list."

The eight groups also resolve the granularity risk recorded against the six: biceps/triceps and legs/calves are exactly the distinctions a rule like *"direct calf work twice a week"* needs and that an atomic "Arms" or "Legs" could not express.

**The catalogue is video-driven**, which settles the open question about variations. Nash lists movements with variations in parentheses (*Horizontal Press (barbell, dumbbells, machines)*), and whether each becomes its own row was an open modelling question. Inventory decides it: each filmed variation is its own `exercises` row. That is also correct on its merits — a barbell press at 100kg and a dumbbell press at 40kg are different lifts, and sharing a row would plot them on one progress chart (task 7.7) as an apparent collapse in strength.

**Still missing, and it is the part that matters: the form cues.** What exists is a list of movement names, which every fitness app has. Nash's cues and common mistakes are the differentiator the PRD is built on. Names can be seeded without them; the exercise detail screen (4.3) has almost nothing to show until they arrive.

**`docs/nashfit-status.md` added.** A one-page current-state snapshot, written to be read cold — by someone returning to the project, or by an AI assistant in a conversation with no repository access. It covers what the project is, phase-by-phase status, the ten decisions that constrain future work, what is blocked on Nash versus on the developer, and what to build next. Deliberately short and pointer-heavy; the instruction is to regenerate rather than hand-patch, since the earlier build-plan/progress-log split showed how fast duplicated narrative drifts.

**Nothing has been seeded.** No migration was created, and no code depends on the taxonomy.

---

## 2026-09-11 (cont.) — Email auth flow complete: sign-in, reset, routing

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 1.2 | Sign-in screen | 🟨 Written | _pending_ | |
| 1.3 | Password reset: request + set-new-password via deep link | 🟨 Written | _pending_ | |
| 1.6 | Persistent sessions and sign-out | 🟨 Written | _pending_ | |
| 1.7 | Auth-state routing | 🟨 Written | _pending_ | |

**Working method changed.** At the developer's suggestion, verification is now batched rather than blocking: code is written and statically verified, and anything needing a device or dashboard accumulates in the new `docs/nashfit-verification-checklist.md`. That file is organised by what each section needs — dashboard only, Expo Go, development build — with expected results for every item, so a testing session is a single uninterrupted pass rather than a series of context switches.

**Auth state (1.6).** `src/features/auth/context.tsx` holds one subscription to Supabase's auth events and exposes the session through context, so no screen polls or keeps its own copy. It also carries `initialising`, which is neither signed-in nor signed-out: on a cold start, reading the session out of encrypted storage is asynchronous, and routing on that unknown is exactly what makes the sign-in screen flash before an already-authenticated user reaches the app.

Analytics and monitoring identities are set from the auth-state listener rather than at the sign-in call site, so they stay correct when a session ends without anyone tapping sign out — an expiry or a refresh failure clears them too.

**Routing (1.7).** Both stacks are declared and `Stack.Protected` decides which is reachable, rather than imperatively redirecting inside an effect. The imperative pattern is the usual source of navigation races — a redirect firing before the navigator mounts, or twice on a fast token refresh. Subscription gating (2.4) slots in as a third state without restructuring. Nothing navigates after sign-in or sign-out; the session changes and routing follows.

**Sign-in (1.2).** Only the email is format-checked. Validating password length on sign-in would be wrong: an existing account may predate the current minimum, and the server is the authority on whether a credential is correct. Supabase returns the same "Invalid login credentials" for a wrong password and an unknown email — deliberately, since distinguishing them enables account enumeration — and that vagueness is preserved rather than "helpfully" narrowed.

**Password reset (1.3).** Uses the app's **custom scheme** (`nashfit-dev://` / `nashfit://`) for the email redirect, not a Universal Link. Universal Links need an `apple-app-site-association` file on a domain Nash controls, which does not exist yet; a custom scheme needs no domain. The trade-off is that another app on the device can claim the scheme, which is acceptable for a link that is single-use and expires — worth revisiting once the domain lands. The scheme must also be allow-listed in the Supabase dashboard (checklist item A3) or the redirect is refused.

The set-new-password screen needs no token handling of its own: Supabase's client picks the recovery token out of the deep link and establishes a temporary session, which is what authorises `updateUser`. It does have a confirmation field, unlike sign-in — the user cannot see what they are typing, and a typo would lock them out of the account they are in the middle of recovering.

**Route structure.** `reset-password.tsx` was moved to `reset-password/index.tsx` so a file and a directory of the same name do not coexist; the routes are unchanged.

**Verified.** Typecheck, lint, format check, and a clean iOS bundle (2149 modules) across eight routes. `Stack.Protected` was confirmed to exist in expo-router 57 by reading the type definitions before relying on it.

**Not started: 1.4 and 1.5 (Apple and Google sign-in).** Both need native configuration, provider setup in the Supabase dashboard, and a development build to test — Expo Go cannot exercise native sign-in. They are the natural companion to the Xcode/Android Studio install already on the critical path for Phase 2.

---

## 2026-09-11 — Supabase client and sign-up screen

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 1.1 | Supabase client, encrypted session storage, generated DB types, sign-up screen | 🟨 Partial | _pending_ | |

**Token storage — the decision worth recording.** Neither obvious option works on its own. `expo-secure-store` gives OS-level encryption (iOS Keychain, Android EncryptedSharedPreferences) but caps items at roughly 2KB, and a Supabase session — access JWT plus refresh token — exceeds that, so writes simply fail. `AsyncStorage` has no cap but writes plaintext, leaving a refresh token readable on a rooted device or out of an unencrypted backup; that token alone is enough to impersonate the user.

Developer approved the pattern Supabase documents for exactly this: `src/lib/secure-session-store.ts` generates a random 32-byte key per entry, keeps it in SecureStore (small enough to fit), AES-CTR encrypts the session with it, and stores the ciphertext in AsyncStorage (large, but useless without the key). `getItem` treats any failure as "no session" and clears both halves — the two stores can desync, for instance when a backup restores AsyncStorage but not the Keychain, and self-healing beats a permanently broken login. This is baked into the client at creation, so changing it later would invalidate every existing session.

**Generated database types.** `npm run db:types` writes `src/types/database.ts` from the linked project — 586 lines covering every table's Row/Insert/Update shape and all eight enums as TypeScript unions. The client is `createClient<Database>`, so a renamed column or an invalid enum value is a compile error rather than a runtime surprise. This is the payoff from choosing native Postgres enums at task 0.5. Added `db:types`, `db:push` and `db:reset` scripts; the generated file is Prettier-ignored, since regenerating it would otherwise fail `format:check`.

**Foreground-only token refresh.** Supabase's auto-refresh runs on a timer. Left running in the background it wakes to make network calls the user cannot benefit from — wasted battery and radio on a phone sitting in a gym locker. `startSessionRefreshHandling()` starts and stops it on `AppState` changes, giving a fresh token when the user returns without the background churn.

**Profile row creation.** Task 1.1's wording says "on sign-up, create the corresponding `users` profile row". That is already handled by the `handle_new_user` trigger from migration `20260901204328`, which fires for every sign-in method including Apple (1.4) and Google (1.5). Doing it client-side would mean three call sites and an auth user with no profile whenever one was missed. No client code was written for it.

**UI primitives** built to §5 of the brand guidelines, so 1.2 and 1.3 reuse rather than reinvent: `Button` (one red primary per screen, 48px minimum, disabled while loading so a double tap cannot submit twice) and `TextField` (surface2 fill, red focus ring, error outranking focus, and a reserved message line so the form does not jump as validation messages appear).

**Sign-up screen.** Validation runs on submit rather than per keystroke — flagging an invalid email while someone is still typing it is noise. The email check is deliberately permissive: strict regexes reject valid addresses, and the only real test is whether the confirmation email arrives. Supabase's developer-facing errors are mapped to actionable text, so nobody is shown a constraint-violation string. Both post-signup states are handled: a session returned means signed in, no session means email confirmation is pending and the screen switches to a "check your email" state.

**Two config notes.**
- Password minimum is 8 client-side against Supabase's default of 6. If the project's Auth settings are not raised to match, the server will accept something the client rejects — harmless, but the two should agree.
- `web.output` changed from the scaffold's `'static'` to `'single'`. Static output prerenders each route in Node at build time, where `window` does not exist, and the Supabase client touches it on construction. Web is not a shipping target (the PRD is iOS + Android); this keeps `expo start --web` usable for quick checks without pretending to support server rendering.

**Verified.** Typecheck, lint, format check, and a clean iOS bundle (2142 modules) — which is what proves the crypto/aes-js/secure-store chain actually resolves under Metro.

**Why 🟨.** Nothing has been exercised against real auth: no account has been created, so the sign-up path, the trigger firing, the encrypted store round-tripping a session, and the confirmation-email flow are all unverified. That needs a device run. Supabase Auth's email settings on `nashfit-dev` have also not been reviewed — email confirmation on or off materially changes the flow, and the password minimum should be aligned.

---

## 2026-09-07 — Brand design tokens (task 0.11, added to the plan)

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.11 | Brand tokens, type scale, Lora + Inter; scaffold theming retired | ✅ Done | _pending_ | |

**Why this task exists.** It was not in the original build plan. Phase 1 builds three auth screens, and building them against Expo's default light theme would mean rebuilding them when Nash's dark-first system landed. Added and approved 2026-09-06 so the auth screens are built once.

**Delivered.** `src/theme/index.ts` carries the tokens from `docs/nashfit-brand-guidelines.md` §8 verbatim — the colour ramp, the type scale mapped to concrete font families and line heights, radii, and the 48px minimum touch target from §5. `src/theme/use-fonts.ts` loads the six faces. `src/components/text.tsx` is now the app's only text primitive: everything goes through it, so type and colour come from tokens by default and an off-scale size has to be written deliberately rather than by omission.

**Dark only, deliberately.** The guidelines describe the app as dark-first and supply a single palette, which is a dark one. Building a light variant would mean inventing colours Nash has not approved, so there is no light theme and no runtime scheme switching. Recorded as an assumption; if a light theme is ever wanted it should come from Nash.

That decision let a whole class of scaffold code go: `themed-text`, `themed-view`, `use-theme-color`, `use-color-scheme` and its `.web` variant — the same files that produced most of the TypeScript 6 errors during the SDK 57 upgrade. `collapsible` and `external-link` went too; both were unused since the demo removal at 0.1.

**Brand applied at the native level as well**, not just in React: `userInterfaceStyle` is now `dark`, and the splash background and Android adaptive-icon background are brand black (`#090708`) instead of Expo's white and pale blue. §4 is explicit that the logo must never sit on a light field, and a white splash flashing before a dark app is exactly the jarring launch the dark-first direction avoids.

**Font bundle — a real saving.** The first build pulled in **26 font files (~9MB)**: `@expo-google-fonts/inter` re-exports every weight and italic, so importing the package barrel made Metro treat all of them as reachable assets. Switching to per-weight entry points (`@expo-google-fonts/inter/400Regular`) cut it to exactly the **6 faces the type scale uses, 1.43MB**. Verified by counting assets in `expo export` before and after.

**One type note.** `typography` uses `satisfies Record<string, TextStyle>` rather than `as const`. `as const` makes `fontVariant: ['tabular-nums']` a readonly array, which is not assignable to React Native's mutable `FontVariant[]`; `satisfies` keeps key inference for `TypographyRole` while contextually typing each entry correctly.

**Pending Nash's sign-off.** §7 of the guidelines flags the grey surface ramp, the semantic success/warning/error colours, and the Lora-for-Palatino substitution as *extensions* to his existing brand that still need approval. They are implemented because the app cannot be built without them, but they are reversible token changes, not settled identity. The Palatino → Lora swap is the one most worth walking him through.

**Verified.** Typecheck, lint, format check, `expo-doctor` 21/21, and a clean iOS bundle (2096 modules). Not yet seen on a device — the placeholder screen now renders a serif heading and a `surface1` card on the dark page, which is worth an eyeball on the next Expo Go run.

---

## 2026-09-05 (end of day, cont. 2) — Sentry

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.9 | `src/lib/monitoring.ts`; `Sentry.wrap` on the root layout; DSN verified | 🟨 Partial | _pending_ | |

**Delivered.** `@sentry/react-native` 7.11 with its Expo config plugin. `src/lib/monitoring.ts` mirrors the analytics module's shape: `initMonitoring()` plus `setMonitoringUser` / `clearMonitoringUser` for the auth lifecycle, sending only the Supabase auth id — never email or name.

Sentry's wizard (`npx @sentry/wizard -i reactNative`) was declined for the same reason PostHog's was: it cannot write to a dynamic `app.config.ts` and would introduce its own env handling rather than reading `src/lib/env.ts`.

**Configuration decisions, all stated in code rather than left to defaults.**

| Setting | Value | Reasoning |
|---|---|---|
| `environment` | `env.appEnvironment` | Lets production alerting exclude development without a second Sentry project |
| `tracesSampleRate` | 1.0 dev, 0.2 production | Traces bill per transaction and a workout logger generates heavy navigation; errors are always sent regardless |
| `enabled` | `!__DEV__` | Local errors are mostly hot-reload noise already surfaced by Metro. **Consequence:** SDK-level capture cannot be verified from a development run |
| `sendDefaultPii` | `false` | The app holds age, sex and training history. Sentry's default already excludes PII; stating it explicitly keeps the decision visible rather than resting on a library default |

`initMonitoring()` is called at module scope in `app/_layout.tsx`, before any component renders, so failures during the first render are still captured. The default export is `Sentry.wrap(RootLayout)`, adding error-boundary and performance instrumentation around the whole tree.

**Verified.** Typecheck, lint, `expo-doctor` 21/21, and an iOS bundle (2053 modules) all pass. A verification event was posted directly to the Sentry ingest endpoint parsed out of the DSN — **HTTP 200**, event id `d433cda7667e47b3ae01fa32f6329d4e` — proving the DSN is valid and events reach the project.

**Why 🟨 — three gaps, each with a clear owner.**

1. **SDK capture unverified.** `enabled: !__DEV__` means nothing is sent from a development run, and `@sentry/react-native` ships native code that Expo Go cannot fully exercise anyway. Confirming real crash capture needs a development build.
2. **Source maps — partly resolved 2026-09-05.** The Expo plugin initially warned *"Missing config for organization, project"*. Org and project slugs are now set in `app.config.ts` (both `nashfit`, read from the dashboard URL `nashfit.sentry.io/projects/nashfit/`) and the warning is gone, confirmed by a clean `expo export`. Upload itself still needs `SENTRY_AUTH_TOKEN` in the build environment at the first real build; that token grants org write access and belongs in EAS build secrets only.

   *Note on project naming:* one Sentry project exists, named `nashfit`, rather than the `nashfit-app` / `nashfit-functions` split originally proposed. The app is wired to it. A separate functions project is not needed until the Edge Function side lands (4.2 or 6.2); decide then whether to split or tag by `environment` within the one project.
3. **Edge Function side not wired.** Deliberately deferred. It needs the `nashfit-functions` DSN set via `supabase secrets set`, and more importantly a function that can meaningfully fail — the health check cannot. The natural moment is the signed-URL function (4.2) or plan generation (6.2), which is also when it becomes testable.

**Pattern worth noting.** Three verifications now wait on a development build: Sentry SDK capture, PostHog under production config, and any native behaviour. A development build becomes mandatory at task 2.1 for RevenueCat regardless. Installing Xcode and Android Studio before Phase 2 would clear the whole backlog at once.

---

## 2026-09-05 (end of day, cont.) — Edge Functions

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.7 | Edge Function project structure; `health` function deployed to nashfit-dev | ✅ Done | _pending_ | |
| 0.4 | Edge Function secrets pattern established and documented | ✅ Done | _pending_ | |

**Delivered.** `supabase/functions/health/` scaffolded with the CLI rather than hand-written — the current Supabase runtime API turned out to differ from expectation, using `withSupabase` from `@supabase/server` with declared auth modes rather than a raw `Deno.serve` handler. Scaffolding first avoided writing to a stale API.

The health check deliberately proves **three separate things**, so a green response means the whole path works rather than merely "some code ran":

1. **Deploy pipeline** — the function exists and responds at its URL.
2. **Auth gateway** — declared as `auth: ['publishable']`, so the gateway rejects unkeyed requests before function code runs. The secret key is deliberately *not* accepted; a health endpoint has no need for it.
3. **Secrets mechanism** — the reported environment is read from `Deno.env.get('NASHFIT_ENV')`, set via `supabase secrets set`, not hardcoded. This is the same channel that will carry the Claude API key (6.2), the Supabase secret key for signed URLs (4.2) and the RevenueCat webhook secret (2.6), so proving it here proves it for those.

**Toolchain separation.** The app's `tsconfig.json` was compiling `supabase/functions` (confirmed with `tsc --listFilesOnly`), which would fail once Deno globals and JSR imports appeared. `supabase/functions` is now excluded from the app's TypeScript config and from ESLint; the Deno toolchain and `supabase functions deploy` type-check that code instead. Deno and React Native have incompatible type environments and cannot share one config.

**Verified against the live deployment on nashfit-dev.**

| Request | Result |
|---|---|
| With a valid publishable key | **200** — `{"status":"ok","function":"health","environment":"development",…}` |
| With no key | **401** `MISSING_CREDENTIALS` from the gateway |
| With an invalid key | **401** `Invalid API key` |

`environment: "development"` is the meaningful part: it came from the Edge Function secret, so the secrets channel is proven rather than assumed.

**Task 0.4 now complete.** Part 4 of `docs/nashfit-environment-setup.md` documents setting, listing and reading secrets; which secret each upcoming task needs; that `SUPABASE_URL` and the project keys are injected automatically and must not be set manually; and that there is no server-side `APP_ENV` equivalent — dev and prod are different Supabase projects, so `supabase link` decides which one `deploy` and `secrets set` target. Check with `supabase projects list` before ever deploying to prod.

---

## 2026-09-05 (end of day) — Device run confirmed; schema pushed to dev

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| 0.1 | App confirmed running on a physical device via Expo Go | ✅ Done | — | |
| 0.3 | Five migrations pushed to the remote `nashfit-dev` project | ✅ Done | — | |

**Device run.** The developer ran the app through Expo Go on a physical device and confirmed the expected output: `Environment: development`, `Supabase: qwsxlukvoivepdzyjgvu.supabase.co`, `PostHog: configured`, `Sentry: not set up yet`, and a single Home tab. This is the end-to-end proof that the environment chain from `.env.local` through `app.config.ts` and `src/lib/env.ts` works on real hardware, not just in a bundler.

*Caveat for the record:* verified on one physical device via Expo Go. Task 0.1's wording asks for an iOS simulator **and** an Android emulator; neither toolchain is installed, and the second platform has been confirmed only by a successful `expo export --platform android` bundle, not by running. Marked ✅ on the substance — the app runs on real hardware — with the gap stated rather than hidden.

**Schema pushed to dev.** `supabase db push` applied all five migrations to `nashfit-dev`. `supabase migration list` now reports every migration as present both locally and remotely. `nashfit-prod` remains deliberately empty until the schema has proven itself in development use.

---

## 2026-09-05 (later still) — Expo SDK 54 to 57 upgrade

| Task | Work | Status | Commit | Effort |
|---|---|---|---|---|
| — | Upgraded Expo SDK 54.0.37 to 57.0.20 | ✅ Done | _pending_ | |
| 0.1 | Still pending a device run (now unblocked) | 🟨 | — | |

**Why.** Attempting the Expo Go device run for task 0.1 revealed the installed Expo Go supports SDK 57, while the project was on SDK 54. **Expo Go only ever ships the current SDK**, and iOS offers no way to install an older build — so on SDK 54 Expo Go was simply unavailable, and task 0.1 could not be completed at all without installing Xcode and Android Studio.

Checking npm showed `latest` at 57.0.20: the scaffold was **three major SDKs behind** three weeks after being created (55, 56 and 57 had all shipped). For a v1 launching in 2027 that meant shipping on an SDK from late 2025, missing a year of iOS/Android compatibility work, with Apple's minimum build requirements tightening over time. Developer approved upgrading immediately, while the app was one placeholder screen and two lib modules — the cheapest this would ever be. A checkpoint commit (`19273bf`) was taken first, since two weeks of work was uncommitted.

**Result.** `expo` 57.0.20, React Native 0.86.3, React 19.2.3, expo-router 57.0.19, TypeScript 6.0.3, `eslint-config-expo` 57.0.2. `expo-doctor` 21/21.

**Breaking changes handled.**

| Change | Resolution |
|---|---|
| `newArchEnabled` removed from `ExpoConfig` | New Architecture is mandatory in SDK 57; flag deleted from `app.config.ts` |
| `edgeToEdgeEnabled` removed from the Android config | Edge-to-edge is now always on; flag deleted |
| `ColorSchemeName` widened to include `'unspecified'` | `colorScheme ?? 'light'` no longer type-checks; narrowed explicitly to `=== 'dark' ? 'dark' : 'light'` in `use-theme-color.ts` and the tabs layout |
| `SymbolViewProps['name']` became a union including an object form | Can no longer be a `Record` key; `icon-symbol.tsx` now uses `as const satisfies Record<string, …>` |
| SDK 57 requires several modules declared as plugins | Added `expo-font`, `expo-image`, `expo-status-bar`, `expo-web-browser` to `app.config.ts` |
| `eslint-config-expo` 57 rejects `setState` inside an effect | `use-color-scheme.web.ts` rewritten with `useSyncExternalStore`, which provides separate server and client snapshots by design — the correct fix for a hydration check, not a rule suppression |
| **expo-router dropped react-navigation compatibility in SDK 56** | The significant one. Caught by an `expo export`, not by typecheck. All three `@react-navigation/*` direct dependencies removed; `app/_layout.tsx` now imports `ThemeProvider`, `DarkTheme` and `DefaultTheme` from `expo-router`, which exports its own |

**`src/components/haptic-tab.tsx` deleted.** It added haptic feedback on tab press and was the only consumer of `@react-navigation/bottom-tabs` and `@react-navigation/elements`. Those disagreed with expo-router's vendored copy of bottom-tabs on `pressColor` (`string` vs `ColorValue`), an unfixable structural conflict short of casting. Judged not worth preserving: it is scaffold polish on a tab bar with one tab that gets rebuilt at task 1.7 with auth routing, and deleting it removed the whole class of version skew. Easy to reinstate later with `Pressable` plus `expo-haptics`.

**Nothing written for this project needed changing.** `src/lib/env.ts`, `src/lib/analytics.ts` and the five migrations were untouched by the upgrade; every fix was in scaffold-inherited code.

**Verified.**
- `expo-doctor` 21/21, typecheck (TypeScript 6.0), lint and format check all pass.
- `expo config` resolves in both environments — dev yields `NashFit (Dev)` / `com.nashfit.app.dev` / `nashfit-dev`, production yields `NashFit` / `com.nashfit.app` / `nashfit`, `sdkVersion` 57.0.0.
- **iOS bundle** exported (1659 modules) and **Android bundle** exported (1759 modules), both clean. The react-navigation incompatibility surfaced only at bundle time, which is why exports are run rather than trusting typecheck.
- Environment values still inlined into the compiled bundle.
- `npm audit` improved from 26 vulnerabilities (9 high) to 19 moderate, with no high severity remaining.

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
