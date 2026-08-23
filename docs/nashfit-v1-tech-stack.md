# NashFit — v1 Tech Stack & Architecture Decisions
 
**Status:** Living document — update as decisions change
**Scope:** The stack and architecture for v1 (exercise video library + AI plan generation + session logging). Records the *decision and the reasoning*, so future-you knows why, not just what.
 
**Scope note (expanded).** AI plan generation moved into v1 (driven by Nash's Principles Document, not the full corpus/RAG build). The AI orchestration described below is therefore a **v1 concern**, not a future one — but it stays within the same Edge Functions + Supabase stack already chosen, so the pivot added scope without changing the architecture.
 
---
 
## Guiding Principle
 
Ship v1 fast, keep the changeable layer changeable, and don't stand up infrastructure for speculative needs. Backend *logic* is the cheap-to-refactor layer; the **data model** and **third-party entanglements** (auth, payments) are the expensive-to-change ones, so those get the care and the logic layer stays lean. Where a managed tool already solves a problem, adopt it rather than build it.
 
---
 
## The Stack at a Glance
 
| Concern | Choice |
|---|---|
| App framework | Expo / React Native (cross-platform iOS + Android) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password + Apple + Google) |
| Backend logic | Supabase Edge Functions |
| AI plan generation | Claude API, called from an Edge Function; Principles Document as source of truth |
| Vector store (future corpus/RAG) | pgvector, in the same Postgres (not needed for v1 plan generation) |
| Media hosting | Supabase Storage (private buckets, signed URLs) |
| Subscriptions | RevenueCat |
| Revenue/subscriber analytics | RevenueCat dashboard |
| Product/behaviour analytics | PostHog (instrumented from launch) |
| Crash/error monitoring | Sentry |
 
---
 
## App Framework — Expo / React Native
 
Cross-platform iOS + Android from one codebase, per the PRD's dual-platform launch decision. Expo makes the *code* cross-platform; the launch surface is still doubled (two stores, two review processes) — see the PRD risk note.
 
---
 
## Database & Auth — Supabase
 
Postgres is the source of truth for everything that must persist or sync (accounts, sessions, logs, exercise catalogue). The data model assumes Postgres. Supabase Auth handles accounts with email/password plus Apple and Google sign-in (Apple sign-in is effectively required by Apple once other social logins are offered).
 
**Device vs. server split:** the server DB is the source of truth; the device holds a cache (exercise list, later downloaded videos) plus pending offline writes not yet synced. Anything a user would be upset to lose, or expect on another device, lives server-side — which is why logged workouts must sync and never live only on-device (device storage is wiped on uninstall).
 
---
 
## Backend Logic — Supabase Edge Functions (+ pgvector)
 
Server-side logic runs in Edge Functions: signing media URLs, RevenueCat webhooks, anything holding secrets, and **the v1 AI plan-generation orchestration** (see below). The gateway validates Supabase JWTs, handles regional latency, and emits logs to Sentry — conveniences that would otherwise be hand-rolled.
 
**Why not a dedicated backend service (for now).** A dedicated TypeScript backend (Fastify/Nest/Hono) was seriously considered, given web-dev familiarity and the eventual admin panel. Decision: **Edge Functions win for v1** on three of four axes — build speed (already on Supabase, nothing new to provision), maintenance/complexity (Supabase operates the runtime; only function code is maintained), and AI groundwork (pgvector co-locates embeddings with entities; Edge Functions call Claude natively). The fourth axis, cost at very high scale, favors a dedicated service — but that's a well-funded future decision, and backend logic is the refactorable layer, so deferring costs nothing.
 
**When to revisit.** Add a dedicated service *for the specific job* if/when concrete needs arrive: long-running or multi-step agent orchestration (Edge Functions are short-request-shaped and time-limited), or heavy background/batch pipelines (re-embedding, bulk content processing). Supabase keeps doing data/auth/storage/vectors; the dedicated service takes only the heavy orchestration. Not a v1 or early-v2 concern.
 
**AI plan generation fits this stack (and is now v1).** The generator is an Edge Function that gathers the user's onboarding inputs + Nash's Principles Document + the relevant exercise entities, calls Claude, and writes structured output into the `plans` / session prescription fields. This fits Edge Functions comfortably — it's a single request/response generation, not long-running multi-step orchestration. The heavier future work (full corpus/RAG, closed-loop auto-adjustment, batch re-embedding) is what would eventually justify a dedicated service; v1 plan generation does not.
 
---
 
## AI Plan Generation — architecture (v1)
 
The plan generator runs entirely on the chosen stack. Flow:
 
1. **Trigger:** user completes onboarding (age, experience, sex, training days) or re-onboards.
2. **Edge Function** gathers: the user's inputs; the current **Principles Document** (Nash's methodology as rules + reasoning — the source of truth); and the **exercise library** entities the plan may draw from.
3. **Claude API call** applies Nash's rules to the inputs and returns a **structured plan** (JSON: sessions, exercises, prescribed sets/reps/load). The generation is *constrained to select and assemble from real library exercises*, not to invent — validated against the library on return.
4. **Persist:** write a `plans` row (with `principles_version` and `input_snapshot`) and the prescribed sessions/`session_exercises`.
5. **Review gate (two-phase):**
   - **Phase 1:** plan saved as `pending_review`, hidden from the user; a **notification fires** to Nash/dev; a reviewer approves (initially via the Supabase dashboard — flip `status` to `approved`; a simple internal review page can come later if volume warrants).
   - **Phase 2:** plan saved `approved`/`active` immediately; the notification still fires as an after-the-fact audit signal.
   - The phase is an **app-config toggle** (auto-approve on/off) — switching is a config change, no code/schema change.
**Principles Document, not corpus/RAG, for v1.** The document is small enough to pass directly into the model's context — no vector store or retrieval needed for v1 generation. pgvector stays available for the *future* corpus/RAG work but is **not** part of the v1 plan-generation path.
 
**Why the Principles Document over free generation.** Handing the model Nash's explicit rules and constraining it to the vetted exercise library is what keeps plans consistent and on-method — the guardrail against the LLM inventing exercises or drifting off Nash's methodology. The hard-constraints section of the Principles Document is the safety floor; Phase 1 review is the human backstop.
 
**AI cost control.** Cache generated plans (don't regenerate on app open); regenerate only on explicit re-onboarding. Plan generation is a per-user cost that the subscription model is designed to cover.
 
---
 
## Media Hosting — Supabase Storage, private buckets, signed URLs
 
Video and image assets live in **private** Supabase Storage buckets. The app never sees a raw file URL; an Edge Function mints a short-lived **signed URL** at play time. `exercise_media.url` stores the storage key, resolved to a signed URL on demand.
 
**Why not Cloudflare Stream / Mux.** Those buy adaptive-bitrate streaming (better live playback on weak gym connections). We're deprioritizing that in favour of **offline download** (below), which sidesteps gym connectivity entirely by playing a local file — making adaptive streaming largely moot for this use case. Staying on Supabase keeps everything on one platform, one credential set, one content pipeline. Trade-off accepted: v1 serves single-bitrate video.
 
**Signed URLs — what they do and don't do.** They defeat casual link-sharing and hotlinking (leaked links expire fast). They do **not** stop a paying, logged-in user from screen-recording or extracting content — nothing DRM-free does. This is a conscious acceptance, consistent with the PRD's pricing rationale (annual plan blunts the "subscribe once, rip, cancel" move); we don't contort the stack over ripping.
 
### Offline video download — **priority v2 fast-follow** (not v1)
 
Deferred from v1 but explicitly a **priority** next feature. Lets a user download an exercise's video over good wifi and play it in-app offline (BBC iPlayer / Netflix pattern) — the primary answer to unreliable gym connectivity. Supabase's whole-file storage is well-suited to a download model (a plain authenticated fetch). Playback of a downloaded file is simple; the real work is the **download-management and lifecycle layer** (tracking what's downloaded, storage/eviction, re-download on source change), which entangles with offline-sync — hence kept off v1's critical path. Note: a downloaded file is *more* extractable than a stream, an accepted trade for offline convenience. The `exercise_media` schema already accommodates this without change.
 
---
 
## Subscriptions & Store Compliance — RevenueCat
 
Subscriptions (annual headline + monthly, per PRD) run through RevenueCat, wrapping Apple and Google in-app purchase. **Constraint, not a choice:** digital subscriptions must use the platforms' in-app purchase systems — Stripe/web-checkout cannot be used to avoid the cut — so Apple/Google take ~15–30%. Recorded here so it's not a surprise at submission. RevenueCat remains the source of truth for subscription state; mirror into Postgres only if it needs to be queryable in-app.
 
---
 
## Offline Logging Sync — start simple
 
Per the PRD, logging works offline and syncs on reconnect. Approach for v1: **local persistence of unsynced logs + sync-on-reconnect**, not a heavy local-first framework (WatermelonDB etc.). Justified because the logging data is small and the conflict model is trivial (a single user's own sequential sets). Client-generatable UUIDs (per the data model) let offline rows have stable ids before sync and avoid collisions. Revisit only if sync proves fiddly in practice.
 
**On-device storage locations (for the sync/offline work):** small key-value state (tokens, prefs) via secure storage / AsyncStorage; structured local cache and pending writes via on-device SQLite; large binaries (v2 videos) via the filesystem. Precious unsynced data goes in persistent/backed-up locations; reconstructable caches (videos) go in evictable cache locations — putting the wrong data in the wrong bucket is a classic mobile bug.
 
---
 
## Analytics & Monitoring
 
Three tools, each with its own non-programmer-friendly interface, so **Nash gets business visibility without a custom-built dashboard**:
 
- **RevenueCat dashboard** — revenue, active subscribers, churn, trial conversion. Give Nash a login; covers most of "how's the business doing" out of the box.
- **PostHog** — product/behaviour analytics (which exercises watched, engagement, retention). **Instrument key events from day one** — retrofitting later loses all early data.
- **Sentry** — crash/error monitoring from launch, so issues surface before App Store reviews do.
---
 
## Content & Account Management (v1) — Supabase dashboard, developer-operated
 
No custom admin panel in v1. The developer manages everything through Supabase's own dashboards: media via the **Storage UI** (point-and-click upload/delete), exercise rows and taxonomy via the **table editor**, test accounts via the **Auth UI**. Nash does not access the Supabase dashboard directly (it's an unguarded developer console over production data); instead, **the developer executes Nash's content requests**.
 
**Plan review (Phase 1) uses the same developer-operated approach.** Reviewing pending plans initially means reading the `plans` row and flipping `status` in the Supabase dashboard — no custom UI required to launch. A simple internal review page is the first thing worth building if Phase 1 volume makes dashboard-flipping tedious, and it's a natural sibling of the eventual admin panel.
 
**When to build a real admin panel.** The trigger is Nash needing *self-serve* content management, an update cadence that makes developer-in-the-loop a bottleneck, or plan-review volume outgrowing the dashboard. At that point build a guarded, simple web panel (talks to Supabase directly or via Edge Functions). Not v1 scope.
 
---
 
## Open Items to Settle During Build
 
- **Video source-of-truth workflow** — exact upload/naming convention for Storage keys stored in `exercise_media`.
- **Units edge case** (from the data model) — lock unit preference once logging exists, or denormalize unit onto each set. Decide before launch.
- **`is_primary` enforcement** (from the data model) — app-logic for v1; optional partial unique index later.
- **Plan-generation prompt & output schema** — the exact prompt wrapping Nash's Principles Document, and the JSON schema the model must return, validated against the exercise library.
- **Notification channel for plan creation** — email (e.g. via an Edge Function) vs. push; who receives it in each phase.
- **Phase 1 review surface** — dashboard-only to start; decide the threshold for building a simple internal review page.
---
 
## Related Documents
 
- **v1 PRD** — scope, pricing, platform, offline, plan-generation and review decisions.
- **v1 Data Model** — the Postgres schema this stack runs on (incl. `plans`, onboarding inputs, prescription fields).
- **Principles Document** — Nash's methodology; the source of truth the plan-generation Edge Function passes to Claude.
- **User Information Gathering template** — the onboarding inputs the generator keys off.
- **Knowledge-corpus schema** — separate; deferred with the full corpus decomposition (raw sources, segments, embeddings). pgvector in this same Postgres is its eventual home.
 