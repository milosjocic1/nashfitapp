# NashFit — Environment & Third-Party Setup

**Status:** Living document
**Covers:** build-plan tasks 0.3 (Supabase projects), 0.4 (env config), 0.9 (Sentry), 0.10 (PostHog)

Part 1 is the console work — accounts only the project owner can create. Part 2 is what to hand back. Part 3 is how the app consumes it, and is a **proposal pending sign-off** (see the note at its head).

---

## The security rule that governs all of this

Every key below falls into exactly one of two buckets. Getting this wrong is the single most expensive mistake in this document.

| Bucket | Examples | Where it goes |
|---|---|---|
| **Client-safe** | Supabase project URL, Supabase **publishable key** (`sb_publishable_…`), PostHog project key, Sentry DSN | `.env.local`, prefixed `EXPO_PUBLIC_`. **Ships inside the app bundle** and can be extracted by anyone. |
| **Server-only** | Supabase **secret key** (`sb_secret_…`), Claude API key, RevenueCat webhook secret | Supabase Edge Function secrets. **Never** in `.env.local`, never `EXPO_PUBLIC_`, never in the repo. |

**Which keys to use.** Supabase is mid-migration. New **publishable** (`sb_publishable_…`) and **secret** (`sb_secret_…`) keys replace the legacy `anon` and `service_role` JWTs, and **the legacy pair is deprecated by end of 2026** — roughly when this app ships. Both sets exist side by side on a new project; NashFit uses the new pair from the start so there's no migration later. Find them under **Settings → API Keys**; if no publishable key exists yet, click *Create new API keys*. The legacy JWTs live under a separate *Legacy API Keys* tab — ignore it.

**The Supabase idiom worth understanding.** The publishable key is *public by design* — it identifies the project, it doesn't authorise anything. What actually protects your data is **Row Level Security**: without RLS policies, that public key reads your entire database. This is why task 0.6 (RLS) is not optional housekeeping — it is the security boundary. A Supabase project with RLS disabled and a shipped publishable key is an open database.

The secret key is the opposite: it **bypasses RLS entirely**. It exists so Edge Functions can do privileged work. If it ever reaches the client bundle, the app is fully compromised — and mobile bundles are trivially unpackable.

**Not to be confused with the Connection settings / Database pane**, which holds the Postgres connection string and database password. Those are for direct database access and migrations — never for the app.

---

## Part 1 — Console work

### 1. Supabase — two projects (task 0.3)

Sign up at [supabase.com](https://supabase.com), then create **two separate projects**:

| | Name | Purpose |
|---|---|---|
| Dev | `nashfit-dev` | All development and testing. Safe to wipe and reseed. |
| Prod | `nashfit-prod` | Real users. Never pointed at from a dev build. |

For each project:

- **Region: US — chosen and created 2026-08-25.** (EU was recommended for latency and data residency; US was the developer's decision.) Region cannot be changed later without migrating the project.
- **Database password:** generate a strong one and store it in a password manager. It's shown once.
- Leave everything else at defaults; we'll configure Auth in Phase 1 and Storage in Phase 4.

**Downstream consequence to carry into task 9.5.** With US hosting, the store privacy disclosures and privacy policy need to state that personal data (age, sex, training history) is processed in the United States. UK/EU users are still covered by UK/EU GDPR wherever the data sits, so the transfer needs a stated lawful basis. Noted here so it isn't discovered during store submission.

**Cost note.** The free tier is fine for `nashfit-dev`. Free projects **pause after a period of inactivity**, which is disruptive for anything real, so `nashfit-prod` should move to a paid plan before launch — not now. Confirm current pricing and pause behaviour in the console rather than taking this document's word for it.

Then collect, per project, from **Settings → API Keys**:
- Project URL
- **Publishable key** (`sb_publishable_…`) — create one if the project doesn't have it yet
- **Secret key** (`sb_secret_…`) — **do not send this to me or put it in the repo.** Password manager only.

### 2. Sentry (task 0.9)

Sign up at [sentry.io](https://sentry.io). Create one organisation, then **two projects** inside it:

| Project | Platform | Covers |
|---|---|---|
| `nashfit-app` | React Native | Crashes and errors in the mobile app |
| `nashfit-functions` | Node | Errors thrown inside Supabase Edge Functions |

Two projects rather than one because the alerting, release tracking, and stack-trace handling differ between a mobile client and a server runtime — merging them makes both noisier. Collect the **DSN** for each (Project Settings → Client Keys).

### 3. PostHog (task 0.10)

Sign up at [posthog.com](https://posthog.com) and create one project, `nashfit`.

- **Region: US — account created 2026-08-25.** Fixed at account creation.
- Collect the **Project API key** and the **host** — `https://us.i.posthog.com`.

One project for now. If dev events polluting production analytics becomes annoying, we separate by environment property before separating by project.

**Products to enable: Product Analytics only.**

| Product | v1? | Why |
|---|---|---|
| Product analytics | ✅ | The only one the specs call for — event tracking for signup, subscribe, onboarding complete, plan generated, exercise viewed, session logged (task 9.1). |
| Error tracking | ❌ | Duplicates Sentry, which is the chosen tool (task 0.9). Two error trackers split the signal and leave it ambiguous which is authoritative. |
| Session replay | ❌ | Records user screens in an app holding age, sex and training history, on US infrastructure. That's a privacy surface worth a deliberate decision, not an onboarding checkbox — and it needs masking configuration to be safe. Revisit in v2 if onboarding drop-off needs diagnosing. |
| Feature flags / experiments | ❌ | Not in v1 scope. See the note below. |
| Surveys | ❌ | Not in v1 scope. |

**This is not a locking choice** — any product can be switched on later in the dashboard without re-integrating the SDK.

**Note for task 6.5.** Feature flags are an obvious candidate for the two-phase plan-review toggle. Recommend against it: the toggle is read by the plan-generation Edge Function, and routing it through a PostHog fetch adds a network failure mode to the generation path. A config/DB value is more predictable. Decide it properly at 6.5.

**Dependencies this will add** (task 0.10): `posthog-react-native` plus `expo-file-system`, `expo-application`, `expo-device`, `expo-localization`. All are Expo modules present in Expo Go, so analytics won't force a development build.

**Onboarding wizard — what was declined and why.**

| Prompt | Choice | Reason |
|---|---|---|
| Install wizard (`npx @posthog/wizard`) | Skipped | Would install the SDK before the env layer exists and scatter capture calls; 0.10 builds a deliberate `src/lib/analytics.ts` wrapper instead. |
| Autocapture frontend interactions | Off | Wrong shape of data — v1 needs six named events with properties, not untyped taps. A tap-heavy workout logger would generate large billable volume and bury the real signal. RN autocapture also keys off the component tree, which breaks under refactoring. |
| Heatmaps | Off | Web only. |
| Web vitals | Off | Web only. |
| Connect your data (data warehouse sources) | Skipped | Nothing exists to connect yet, and it cuts against a decision already made — see below. |

**On connecting Supabase Postgres to PostHog.** Tempting later, but it means granting PostHog read access to user health data (age, sex, training history) and duplicating it outside the primary store. It also contradicts the tech-stack decision that Nash gets business visibility from *three separate tool dashboards* — RevenueCat for revenue, PostHog for behaviour, Sentry for errors — precisely so no custom aggregation layer is needed. Revisit only with a concrete question that can't be answered any other way.

**Capture settings live in code, not the dashboard.** Whatever the onboarding wizard set, task 0.10 states these explicitly in the SDK init (`autocapture: false`, etc.) so the behaviour is versioned, reviewable and diffable rather than invisible dashboard state.

### 4. Supabase CLI (local, needed for 0.5 and 0.7)

```
brew install supabase/tap/supabase
supabase --version
```

Needed to author migrations and deploy Edge Functions. Local development against a containerised Supabase (`supabase start`) also wants a current Docker — the installed version is old enough to be worth updating first.

---

## Part 2 — What to hand back

Once the consoles are done, fill this in. **Client-safe values only** — the `service_role` keys stay in your password manager and get set directly with `supabase secrets set` when we reach task 0.7.

```
SUPABASE DEV
  url:
  publishable key:

SUPABASE PROD
  url:
  publishable key:

SENTRY
  app DSN:
  functions DSN:

POSTHOG
  project key:
  host:
```

You can either paste these back, or — better — drop them straight into `.env.local` yourself and just say it's done. They're bundle-public either way, but there's no reason to spread them further than necessary.

**Only the dev values go in `.env.local`.** Production values stay in the password manager until EAS build secrets are configured, so a local dev build has no route to production data even by accident.

---

## Part 3 — Environment config (task 0.4) — **IMPLEMENTED 2026-09-01**

Built as described below. `app.config.ts`, `.env.example`, and `src/lib/env.ts` are the implementation; `.env.local` is yours and gitignored.

**How to switch environments.** Development is the default: `.env.local` sets `APP_ENV=development`, and every `npm run start` / `expo export` picks it up automatically, producing `NashFit (Dev)` / `com.nashfit.app.dev`. For a production build, `APP_ENV=production` comes from EAS build secrets rather than any local file — verify with `APP_ENV=production npx expo config --type public`.

**Convert `app.json` → `app.config.ts`.** Expo's static `app.json` can't read environment variables. A TypeScript config can, which is what lets the dev and prod builds differ in name, bundle identifier, and Sentry release without hand-editing a file before each build.

**Env files, all gitignored** (`.env*.local` is already covered by `.gitignore`):

```
.env.local              # your working values, never committed
.env.example            # committed, keys only, no values — onboarding reference
```

**The `EXPO_PUBLIC_` rule.** Expo inlines any variable with this prefix directly into the JS bundle at build time. It is not a secret store — it's a build-time constant. Everything in Part 2 is public-by-design, so the prefix is correct for all of it. Nothing else gets the prefix, ever.

**A typed, validated accessor** at `src/lib/env.ts`: reads the variables once, validates that each is present and well-formed, and throws a clear error at startup if not. The alternative — `process.env.X!` scattered across the codebase — fails silently at runtime in a way that's painful to diagnose on a device. One loud failure at boot beats a mystery `undefined` mid-session.

**Switching environments:** dev builds read `.env.local` pointing at `nashfit-dev`. Production builds get their values from EAS build secrets pointing at `nashfit-prod`. The app never chooses at runtime — the environment is baked in at build time, so a dev build cannot accidentally talk to production.

---

## Bundle identifiers — dev vs production

**What a bundle identifier is.** Every iOS and Android app has a unique string identifying it, by reverse-DNS convention: `ios.bundleIdentifier` (e.g. `com.nashfit.app`) and `android.package`. This is the app's identity to the operating system and to the stores. The OS uses it to decide where the app's private data lives, which keychain entries it can read, which permission grants belong to it, and which icon on the home screen is "this app."

**The consequence that matters: two apps with the same identifier cannot coexist on one device.** Installing one replaces the other, and the replacement inherits the original's local storage.

**Why that's a problem here.** During development you'll have a dev build pointing at `nashfit-dev`, and eventually the real app — via TestFlight or the store — pointing at `nashfit-prod`. If both carry `com.nashfit.app`:

- Installing the dev build **overwrites** the production app on your phone.
- You can't have both on one device, so you can't compare behaviour between them.
- Their on-device storage collides. The dev build inherits whatever the production app left behind — auth tokens, cached exercise lists, and (from Phase 8) the SQLite database of unsynced logged sessions. You get a dev build holding a production session token, or production data that a dev build has since half-rewritten.

That last point is the sharp one for this project specifically. Task 8.5 requires deliberately testing the offline→online path and confirming **no data loss and no duplicate ids**. That test is close to impossible if you can only have one build installed at a time and installs clobber each other's databases.

**With separate identifiers** — `com.nashfit.app` for production, `com.nashfit.app.dev` for development — the OS treats them as two unrelated apps. Both install side by side, each with its own icon, its own sandboxed storage, its own keychain. You can run a dev build against `nashfit-dev` and the production app against `nashfit-prod` on the same phone simultaneously. Pair it with a distinct display name (`NashFit (Dev)`) so the two icons are tellable apart.

**Why it must be decided now.** The identifier is baked into the native project, the provisioning profile, and the push certificates at first build, and into the App Store Connect / Play Console record when the app is registered. **An app's identifier cannot be changed after the store record exists** — changing it means creating a new app listing and losing reviews, ratings, and existing installs. RevenueCat products (task 2.1) are also configured per identifier.

Right now `app.json` sets **neither** `ios.bundleIdentifier` nor `android.package`. Expo requires both before any native build, so these have to be chosen regardless — the only question is whether dev gets its own.

**Recommendation:** two identifiers, `com.nashfit.app` and `com.nashfit.app.dev`, selected by build profile in `app.config.ts`. The cost is a few lines of config; the cost of the alternative is discovering it at task 8.5.

**Needs your input:** the reverse-DNS prefix should be a domain Nash controls. `com.nashfit.app` is a reasonable default, but if his site is e.g. `nashfit.co.uk` then `uk.co.nashfit.app` is the conventional form. Confirm the domain before we set it.

---

## Related

- `docs/nashfit-v1-tech-stack.md` — why Supabase, Edge Functions, PostHog and Sentry
- `docs/nashfit-build-plan.md` — tasks 0.3, 0.4, 0.7, 0.9, 0.10
- `CLAUDE.md` — the no-secrets-in-the-client rule this document implements
