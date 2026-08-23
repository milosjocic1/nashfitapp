# NashFit — v1 Data Model
 
**Status:** Living document — update as decisions change
**Scope:** v1 operational tables (the app's runtime data). The knowledge-corpus schema (raw sources, segments, embeddings for RAG) is a **separate, related document**, deferred with the full corpus decomposition.
 
**Scope note (expanded).** AI plan generation is now in v1 (driven by Nash's Principles Document, not the full corpus). The prescription and provenance fields that earlier drafts "left room for" are now **active v1 features** — the AI writes them. Onboarding inputs and a plan-review status are added.
 
---
 
## Design Principles
 
Two consumers drive this model, **both now live in v1**:
 
1. **The app runtime** — exercise library, media, onboarding, session logging.
2. **The AI plan generator** — writes prescribed sessions the user logs against; needs the prescription/actual split, session provenance, and the onboarding inputs to key off.
The forward-compatible shape designed in the original cut (nullable prescription fields, `created_by` provenance) is now exercised rather than dormant — which is why the pivot required no migration. The remaining forward-compat room is for the *closed adaptive loop* (AI reading back logged history to adjust the next plan), which v1 supports structurally but does not yet automate.
 
Guiding rules: shared consistent vocabulary via reference tables; structure where the generator reasons, JSONB where the app just renders; client-generatable UUIDs where offline sync needs them.
 
---
 
## The Model at a Glance
 
**Exercise side (content)**
- `exercises`
- `muscle_groups`, `equipment` (reference tables)
- `exercise_muscle_groups` (link table, primary/secondary role)
- `exercise_media`
**User / session side (runtime)**
- `users` (now includes onboarding inputs)
- `plans` (new — an AI-generated plan and its review state)
- `sessions`
- `session_exercises`
- `sets`
---
 
## Exercise Side
 
*(Unchanged by the pivot — the library is both browsable and the pool the generator selects from. The generator relies on the taxonomy being consistent, which the reference-table design already guarantees.)*
 
### `exercises`
 
The heart of the app and the moat — it carries Nash's teaching content as data, and it's the vocabulary the plan generator assembles from.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | e.g. "Barbell Back Squat" |
| `slug` | text, unique | Lookup/deep-link friendly |
| `description` | text | Short |
| `form_cues` | JSONB | Ordered list of discrete cues |
| `common_mistakes` | JSONB | Optional list |
| `movement_pattern` | text, **nullable** | Taxonomy (hinge, squat, horizontal push…). Now *actively useful* to the generator for covering movement patterns per Nash's selection rules; still no dedicated v1 UI |
| `created_at` | timestamptz | |
 
Muscle groups and equipment link via reference tables (below), not columns here.
 
### `muscle_groups` / `equipment` (reference tables)
 
Small controlled-vocabulary tables. Exercises reference them rather than storing free text, because free text (`"chest"`, `"Chest"`, `"pecs"`) is how a taxonomy rots — and a consistent vocabulary is what lets the generator reason over muscle groups reliably (e.g. "cover each major group across the week").
 
Each: `id`, `name` (unique), optional `slug`/`display_order`.
 
### `exercise_muscle_groups` (link table)
 
Many-to-many with a role, so an exercise can have primary and secondary muscles.
 
| Field | Type | Notes |
|---|---|---|
| `exercise_id` | UUID | FK |
| `muscle_group_id` | UUID | FK |
| `role` | enum | `primary` / `secondary` |
 
(Equipment can be a similar link table if an exercise may need multiple pieces; a single FK if one-per-exercise is enough for v1.)
 
### `exercise_media`
 
One unified table for all exercise media — video and image share almost every attribute.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `exercise_id` | UUID | FK |
| `media_type` | enum | `video` / `image` |
| `url` | text | Storage key — resolved to a signed URL on demand |
| `is_primary` | boolean | v1 shows the primary video; supports a primary image too |
| `position` | int | Ordering when multiple |
| `caption` | text, nullable | Alt text / caption |
| `metadata` | JSONB | Type-specific: duration, dimensions, etc. |
| `created_at` | timestamptz | |
 
**v1 behavior:** one primary video shown per exercise, reached both by browsing and by tapping an exercise inside a generated plan.
 
**Constraint to consider (not v1-blocking):** a boolean `is_primary` does not enforce "one primary per type per exercise." Handle in app logic for v1; add a partial unique index later (`unique (exercise_id, media_type) where is_primary`) if wanted.
 
---
 
## User / Session Side
 
### `users`
 
App-specific profile keyed to the Supabase Auth user id. Now also holds the **onboarding / plan-generation inputs** (previously deferred; in v1 because the generator is). RevenueCat remains the source of truth for subscription state.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Matches auth user id |
| `display_name` | text | |
| `unit_preference` | enum | `kg` / `lb` — a **preference** (display only), not a plan input |
| `age` | int | **Plan input.** Drives age-adjustment rules |
| `experience_level` | enum | **Plan input.** `beginner` / `intermediate` / `advanced` — bands match the Principles Document |
| `sex` | enum | **Plan input.** `male` / `female` |
| `training_days_per_week` | int | **Plan input.** Constrained to values the Principles Document supports |
| `created_at` | timestamptz | |
 
**Plan inputs vs. preferences.** `age`, `experience_level`, `sex`, `training_days_per_week` feed plan generation. `unit_preference` (and future settings) affect display only and must never trigger regeneration. Keeping the distinction explicit in the schema mirrors the onboarding template's two groups. No goal field — by decision, the plan follows Nash's default objective.
 
### `plans` (new)
 
An AI-generated plan, its provenance, and its **review state** (the two-phase human-review approach). A plan groups the sessions the AI prescribed.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK |
| `principles_version` | text | Which version of Nash's Principles Document produced this plan — plans are traceable to their ruleset |
| `input_snapshot` | JSONB | The age/experience/sex/training-days used at generation time (so later profile edits don't rewrite history) |
| `status` | enum | `pending_review` / `approved` / `rejected` / `active` / `archived`. Phase 1 starts at `pending_review`; Phase 2 auto-sets `approved`/`active` |
| `reviewed_by` | text, nullable | Who approved (dev/Nash), null until reviewed |
| `reviewed_at` | timestamptz, nullable | |
| `generated_at` | timestamptz | |
 
**Two-phase support.** The review gate is entirely this `status` field plus an app-config toggle (auto-approve on/off). Phase 1: plans created `pending_review`, hidden from the user until `approved`. Phase 2: created `approved`/`active` immediately; a notification still fires on creation. Switching phases is a config change, no schema change.
 
### `sessions`
 
One workout session. `created_by` provenance is now **actively used** — the AI authors sessions in v1.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | **Client-generatable** (offline-first) |
| `user_id` | UUID | FK |
| `plan_id` | UUID, **nullable** | FK to `plans`. Set when the session belongs to a generated plan; null for ad-hoc sessions |
| `created_by` | enum | `user` (ad-hoc) or `agent` (AI-prescribed) — now both occur in v1 |
| `performed_at` | timestamptz | When the workout happened (distinct from `created_at`; the agent creates a session before it's performed) |
| `name` | text, nullable | e.g. "Push day" |
| `status` | enum | `in_progress` / `completed` — supports offline resume |
| `created_at` | timestamptz | |
 
### `session_exercises`
 
An exercise within a session, in order. Home of the **prescription vs. actual** split — **both sides now populated in v1**.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | **Client-generatable** |
| `session_id` | UUID | FK |
| `exercise_id` | UUID | FK |
| `position` | int | Order within the session |
| `prescribed_sets` | int, **nullable** | **Written by the AI in v1.** Null for ad-hoc user sessions |
| `prescribed_reps` | int, **nullable** | " |
| `prescribed_load` | numeric, **nullable** | " |
| `prescribed_notes` | text, **nullable** | " |
| `created_at` | timestamptz | |
 
**Prescribed vs. actual.** *Prescribed* = what the AI (via Nash's rules) told the user to do. *Actual* = what they did (the logged `sets`). In v1 **both** occur: AI-prescribed plan sessions carry a prescription; ad-hoc sessions leave it null and only log actual. The full loop — agent prescribes → user logs actual → (future) adjust next plan — exists structurally; v1 automates the first two steps, not the auto-adjustment.
 
**Granularity:** prescription is at the exercise level (one target like "3×8 @ 80kg"), not per-set. Per-set can come later.
 
### `sets`
 
An individual logged set — the *actual* data.
 
| Field | Type | Notes |
|---|---|---|
| `id` | UUID | **Client-generatable** |
| `session_exercise_id` | UUID | FK |
| `set_number` | int | |
| `weight` | numeric | Stored **as entered**, in the user's `unit_preference`. No conversion |
| `reps` | int | |
| `rpe` | numeric, nullable | Optional |
| `logged_at` | timestamptz | |
 
No `is_warmup` / `completed` flag in v1 — easy to add later.
 
---
 
## Cross-Cutting Decisions
 
**Offline-first ids.** `sessions`, `session_exercises`, and `sets` use **client-generatable UUIDs** so offline rows have stable ids before sync. `plans` are server-generated (created by the AI server-side, not offline).
 
**Units — edge case to resolve before launch.** Weight stored as entered against `unit_preference`, no conversion. If a user switches preference, historical sets keep raw numbers and meaning shifts. Options: lock the preference once logging exists, or denormalize the unit onto each `set`. Not a v1 blocker, but decide before launch.
 
**Input snapshotting.** `plans.input_snapshot` records the inputs used at generation time, so a user editing their profile (re-onboarding) doesn't retroactively rewrite the basis of an existing plan. New inputs → new plan, old plan stays traceable.
 
---
 
## Forward-Compatibility Summary
 
- **Built in v1:** exercises + media + taxonomy; users with onboarding inputs; AI-generated plans with review state; AI-prescribed *and* ad-hoc sessions; session logging (actual sets); the prescribe→log loop.
- **Left room for (near-zero added cost):** the *closed* adaptive loop — the AI reading back logged `sets` to auto-adjust the next plan (structurally supported via the prescription/actual split; not automated in v1); per-set prescription granularity; the full corpus/RAG layer (separate schema).
---
 
## Related Documents
 
- **Principles Document** — Nash's methodology; the source of truth the generator applies. `plans.principles_version` ties a plan to a version of it.
- **User Information Gathering template** — defines the onboarding inputs now on `users` and the plan-input vs. preference split.
- **Knowledge-corpus schema** (raw sources, segments, embeddings for RAG) — separate, deferred with the full corpus decomposition. pgvector in this same Postgres is its eventual home.
- **Tech-stack / architecture doc** — video hosting/storage keys, Supabase layout, RevenueCat wiring, the plan-generation Edge Function.