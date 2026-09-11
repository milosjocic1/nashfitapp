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
| Xcode + Android Studio, for a development build | 0.9, 0.10, 2.1 | Three verifications are blocked on it, and RevenueCat makes it mandatory at 2.1 anyway. |
| Confirm a `$screen` event reached PostHog | 0.10 (final ✅) | The app ran on device; checking PostHog → Activity for a `$screen` event alongside `setup_verification` is the last step to close 0.10. |
| Nash's domain (for deep links + privacy policy URL) | 1.3, 9.5 | Universal Links / App Links need files hosted on a controlled domain. Not needed for the bundle identifier, which is set. |
| Nash's Principles Document | Phase 6 (6.1–6.5) | Listed in CLAUDE.md as source of truth but absent from `/docs`. Hard prerequisite for plan generation; the longest lead-time item in the project. |

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
