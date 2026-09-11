# NashFit — Verification Checklist

**Purpose.** Work is written and statically verified (typecheck, lint, bundle, and against a local database where possible) but some things can only be confirmed by a human with a device, a dashboard, or a store account. Those accumulate here instead of blocking the build.

**How to use it.** Work through a section when you have time. Tick items off, and tell Claude what passed or failed — anything that fails becomes a fix, anything that passes moves its build-plan task from 🟨 to ✅. Delete nothing: a completed section is the evidence the task was genuinely done.

**Status key:** ⬜ not yet checked · ✅ passed · ❌ failed (tell Claude what happened)

---

## A — Supabase dashboard (5 minutes, no device needed)

Settings that change app behaviour but live outside the repo. **Do this section first** — the answers change what the auth screens should do.

| | Check | Where | Expected / decide |
|---|---|---|---|
| ⬜ | A1 | Is **email confirmation** required? | Authentication → Sign In / Providers → Email → "Confirm email". Note which it is — on means sign-up shows "check your email"; off means the user is signed in immediately. Both are handled in code; we just need to know which. |
| ⬜ | A2 | **Minimum password length** | Same screen | Set to **8** to match the client. Supabase defaults to 6; if they disagree the server accepts something the app rejects. |
| ⬜ | A3 | **Redirect URLs** allow the app scheme | Authentication → URL Configuration | Add `nashfit-dev://` and `nashfit://`. Password reset (1.3) cannot return to the app without this. |
| ⬜ | A4 | Email provider is **enabled** | Authentication → Sign In / Providers | Should be on by default. |

---

## B — Device run via Expo Go (15 minutes)

`npx expo start --clear`, scan the QR. Covers tasks 0.10, 0.11, 1.1, 1.2, 1.6, 1.7.

### B1 — Brand and boot (task 0.11)

| | Check | Expected |
|---|---|---|
| ⬜ | App launches without a red error screen | |
| ⬜ | Splash is **near-black**, not white | No white flash before the app appears |
| ⬜ | Heading "NashFit" renders in a **serif** face | Lora. If it looks like the system sans, font loading failed |
| ⬜ | Labels and values render in a **sans** face | Inter |
| ⬜ | Page background is near-black, card slightly lighter | `#090708` page, `#161314` card |
| ⬜ | Tab bar active item is **red** | `#ED070D` |
| ⬜ | Phone in light mode still shows the **dark** app | The app is dark-only by design |

### B2 — Analytics (task 0.10)

| | Check | Expected |
|---|---|---|
| ⬜ | Navigate around for ~30s, then open PostHog → Activity, **date filter: Last 7 days** | A `$screen` event appears alongside `setup_verification`. This is what proves the real SDK sends — the earlier curl only proved the key |

### B3 — Sign-up (task 1.1)

| | Check | Expected |
|---|---|---|
| ⬜ | Submit with an empty form | Two inline errors; no network call |
| ⬜ | Enter `notanemail` and submit | "That does not look like an email address." |
| ⬜ | Valid email, password `short` | "Use at least 8 characters." |
| ⬜ | Valid email + 8+ char password | Button shows a spinner, then either signed in or "Check your email" — depending on A1 |
| ⬜ | **In Supabase → Authentication → Users**, the new user exists | |
| ⬜ | **In Table Editor → `users`**, a matching profile row exists with the same id | This proves the `handle_new_user` trigger fired — the reason no client code creates profiles |
| ⬜ | That row has `unit_preference` = `kg` and all four onboarding inputs null | Correct pre-onboarding state |
| ⬜ | Sign up again with the **same email** | "That email already has an account. Try signing in instead." — not a raw Supabase error |
| ⬜ | Turn on airplane mode and submit | "Could not reach the server…" — not a crash |

### B4 — Routing, sign-in, persistence and sign-out (tasks 1.2, 1.6, 1.7)

Do B3 first — you need an account.

| | Check | Expected |
|---|---|---|
| ⬜ | Launch signed out | Lands on **sign-in**, not the home tab |
| ⬜ | Sign in with the wrong password | "That email and password do not match an account." Deliberately does not say which half was wrong — that would let someone test which emails have accounts |
| ⬜ | Sign in correctly | Moves straight to the home tab; no manual navigation |
| ⬜ | Home shows "Signed in as \<your email\>" | Session is readable through context |
| ⬜ | **Force-quit and reopen** | Goes straight to home, **no flash of the sign-in screen** — this is the session being read out of encrypted storage, task 1.6 |
| ⬜ | Tap **Sign out** | Returns to sign-in |
| ⬜ | Force-quit and reopen after signing out | Still signed out — the encrypted store was cleared, not just the in-memory session |

### B5 — Password reset (task 1.3)

Requires checklist item **A3** (redirect URLs) first, or the email link will be refused.

| | Check | Expected |
|---|---|---|
| ⬜ | Sign-in → "Forgot your password?" → enter your email | "Check your email" — worded so it does not confirm whether an account exists |
| ⬜ | Enter an email with **no** account | Same message. If it differs, that is an account-enumeration leak worth fixing |
| ⬜ | Open the emailed link on the device | Opens the app at "Set a new password" |
| ⬜ | Enter mismatched passwords | "Passwords do not match." |
| ⬜ | Enter a valid matching password | Updates, and you land in the app already signed in |
| ⬜ | Sign out, then sign in with the **new** password | Works |
| ⬜ | Open the **same** reset link a second time | "That reset link has expired. Request a new one." — links are single-use |

---

## C — Development build (needed before Phase 2)

`@sentry/react-native` and RevenueCat ship native code that Expo Go cannot run. Requires Xcode and Android Studio (~15GB, first build 10–20 minutes).

| | Check | Expected |
|---|---|---|
| ⬜ | C1 | `npx expo run:ios` builds and launches | Confirms the bundle identifier work from 0.4 — the app installs as **NashFit (Dev)** |
| ⬜ | C2 | Production and dev builds coexist on one device | Separate icons, separate storage. Prerequisite for offline-sync testing at 8.5 |
| ⬜ | C3 | Sentry captures a deliberate crash | Note: Sentry is disabled in `__DEV__`, so this needs a release build |
| ⬜ | C4 | Source maps resolve in Sentry | Stack trace names `HomeScreen (app/(tabs)/index.tsx:24)`, not `index.bundle:1:284719`. Needs `SENTRY_AUTH_TOKEN` in the build environment |

---

## D — Schema integrity (optional, 2 minutes)

| | Check | Command | Expected |
|---|---|---|---|
| ⬜ | D1 | Remote schema matches the migrations | `SUPABASE_DB_PASSWORD='<dev db password>' npx supabase db diff --linked --schema public` | Empty output. The migration ledger already confirms all five applied; this additionally catches hand-edits made in the dashboard |

---

## Completed sections

*Move sections here once every item passes, with the date. This is the evidence trail behind ✅ statuses in the build plan.*
