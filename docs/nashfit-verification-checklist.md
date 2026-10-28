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

### B6 — Exercise library (tasks 3.4–3.7)

| | Check | Expected |
|---|---|---|
| ⬜ | Library tab shows **36 exercises** | Names in a serif face, metadata in sans |
| ⬜ | Count in the header matches the list | "36 exercises" with no filters |
| ⬜ | Tap a muscle group chip, e.g. **Chest** | List narrows to 5; chip turns red; count updates |
| ⬜ | With Chest active, check the equipment row | Options that would return nothing are dimmed |
| ⬜ | Add **Machine** on top of Chest | Narrows to 1 (Decline Machine Press) |
| ⬜ | Filter to **Triceps** | Returns presses too — secondary muscle groups match deliberately |
| ⬜ | Search `curl` | Matches regardless of case |
| ⬜ | Search `barbell` | Does **not** return machine exercises whose description mentions a barbell |
| ⬜ | Combine a filter and a search that match nothing | Empty state with a working "Clear filters" |
| ⬜ | Pull down to refresh | Spinner, then the list stays correct |
| ⬜ | **Kill the network, force-quit, reopen** | Library still lists all 36 from cache — the point of caching it |
| ⬜ | Legibility at arm's length | Names readable with the phone on a bench |

### B7 — Onboarding and settings (tasks 5.1–5.5)

Needs a **fresh account** — an already-onboarded user skips the flow.

| | Check | Expected |
|---|---|---|
| ⬜ | Sign up a new account | Lands on onboarding, **not** the tabs |
| ⬜ | Four steps, one question each | Progress bar fills as you advance |
| ⬜ | Enter age `12` | "Age must be between 16 and 90." |
| ⬜ | Enter `32kg` | Rejected — not silently read as 32 |
| ⬜ | Each experience band shows helper text | Task 5.2's whole point; without it people misjudge their level |
| ⬜ | Training days offers **only 3, 4, 5, 6** | No 2-day or 7-day; the DB would reject them anyway |
| ⬜ | "Back" preserves earlier answers | |
| ⬜ | Finish the last step | Moves into the app automatically, no manual navigation |
| ⬜ | **Supabase → Table Editor → `users`** | All four inputs saved on your row |
| ⬜ | **Force-quit and reopen** | Straight to the app — no onboarding flash |
| ⬜ | Settings shows your four inputs | Under "Your plan inputs" |
| ⬜ | Switch units **kg → lb** | Saves; the four plan inputs are **unchanged**. A preference must never behave like a plan input |
| ⬜ | "Update my details" | Reopens onboarding pre-filled with current answers |
| ⬜ | Sign out, sign in as a *different* user | No trace of the previous user's profile at any point |

### B8 — Session logging (tasks 7.2–7.8)

| | Check | Expected |
|---|---|---|
| ⬜ | Train tab → "Start a workout" | Opens an empty session |
| ⬜ | Add an exercise | Search works; tapping adds it and returns |
| ⬜ | Log a set: weight, reps, no RPE | Appears in the list; RPE omitted, not shown as 0 |
| ⬜ | Log a second set | Weight and reps **pre-filled** from the previous set; RPE **blank** |
| ⬜ | Enter weight `0` | Accepted — bodyweight exercises must be loggable |
| ⬜ | Enter weight `82,5` (comma) | Accepted as 82.5 |
| ⬜ | Enter RPE `8.25` | Rejected — half points only |
| ⬜ | Add a second exercise, use ↑ / ↓ | Order changes and persists after leaving and returning |
| ⬜ | Long-press a logged set | Deletes it |
| ⬜ | Remove an exercise | It and its sets disappear |
| ⬜ | "Finish workout" with zero sets logged | Button is disabled |
| ⬜ | Finish with sets logged | Returns to Train; the resume card is gone |
| ⬜ | **Force-quit mid-workout, reopen** | Train shows "Workout in progress" with the right set count |
| ⬜ | Train → Workout history | The finished session is listed with date, exercises and set count |
| ⬜ | Open it | Sets shown per exercise, read-only |
| ⬜ | "See progress" on an exercise | Every session containing it, oldest first, with the heaviest set highlighted |
| ⬜ | **Settings → Weight units** | Now **disabled**, with an explanation — this is task 7.8's lock |
| ⬜ | Sign up a *fresh* account, go to Settings before logging anything | Units **are** changeable |

### B9 — Account deletion (task 1.8)

**Requires section F first** — the Edge Function must be deployed to dev or nothing here works.

**Use a throwaway account.** This section destroys data on purpose, and it cannot be undone. Do not use the account carrying your B6–B8 history unless you are finished with it.

| | Check | Expected |
|---|---|---|
| ⬜ | Settings → scroll to the bottom | "Delete account" sits apart from Sign out, with a one-line warning |
| ⬜ | Tap "Delete my account" | A full screen opens, not an alert |
| ⬜ | Read the three consequences | History erased · subscription **not** cancelled · signing up again starts empty |
| ⬜ | The subscription text names your platform | "Apple" and the iOS path on an iPhone; "Google"/Play Store on Android |
| ⬜ | The delete button before typing anything | **Disabled** |
| ⬜ | Type `DELE` | Still disabled |
| ⬜ | Type `delete` in lower case | **Enabled** — case and surrounding spaces are tolerated deliberately |
| ⬜ | Tap "Keep my account" | Returns to Settings, nothing deleted |
| ⬜ | Reopen, type `DELETE`, turn on airplane mode, tap delete | "Could not reach the server…" — not a crash, and the account survives |
| ⬜ | Turn the network back on and delete for real | Lands on the **sign-in** screen with no error flash |
| ⬜ | Try to sign in with that email and password | Fails — the account is gone |
| ⬜ | **Supabase → Authentication → Users** | The user is absent, not greyed out or marked deleted |
| ⬜ | **Table Editor → `users`** | No row with that id |
| ⬜ | **Table Editor → `sessions`, `sets`** | None of that user's rows remain. This is the cascade; it was verified locally, this confirms it on the hosted project |
| ⬜ | Sign up again with the **same email** | Works, and the account is empty — no old history, onboarding runs from the start |
| ⬜ | **Force-quit and reopen** after deleting | Still signed out. The encrypted session store was cleared, not just the in-memory session |
| ⬜ | Sign up, reach **onboarding**, and look at the bottom of the screen | A quiet "Delete my account" link. Without it a user who abandons onboarding is trapped with an account they cannot remove — Apple 5.1.1(v) |
| ⬜ | Delete from inside onboarding | Works the same way and returns to sign-in |

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

## E — Pre-launch content gate (BLOCKING — must pass before any production release)

| | Check | How | Expected |
|---|---|---|---|
| ⬜ | **E1** | **No placeholder content reaches production** | Run against prod: `select slug from exercises where form_cues::text like '%[PLACEHOLDER]%' or common_mistakes::text like '%[PLACEHOLDER]%';` | **Zero rows.** Any result means invented coaching would ship under Nash's name — see migration `20261011175220_placeholder_form_cues.sql`. This is a release blocker, not a warning |
| ⬜ | E2 | Every exercise has real form cues | `select slug from exercises where jsonb_array_length(form_cues) = 0;` | Zero rows |
| ⬜ | E3 | Every exercise has a primary video | `select e.slug from exercises e where not exists (select 1 from exercise_media m where m.exercise_id = e.id and m.media_type = 'video' and m.is_primary);` | Zero rows — the catalogue is video-driven, so an exercise without one is a broken detail screen |
| ⬜ | E4 | `nashfit-prod` is on a **paid plan** | Supabase dashboard | Free projects pause after inactivity and can come back **empty** — this was observed on dev 2026-10-11. For production that is data loss, not an inconvenience |

---

## F — Edge Function deployment (task 1.8)

The `delete-account` function is written and was verified end-to-end against **local** Supabase on 2026-10-24. It has not been deployed anywhere, so account deletion does not work in the app until F1 is done.

| | Check | How | Expected |
|---|---|---|---|
| ⬜ | **F1** | Deploy to **dev** | `npx supabase functions deploy delete-account` | Appears under Edge Functions in the dev dashboard. Prerequisite for section B9 |
| ⬜ | F2 | The secret key is available to it | No action expected — Supabase injects the service-role key into every Edge Function automatically. Confirm by running B9 rather than by inspecting config | The function's `supabaseAdmin` client works. **If it fails on the hosted project but worked locally, this is the first thing to suspect** |
| ⬜ | F3 | Deploy to **prod** | Same command against the prod project | Deferred: `nashfit-prod` has no schema yet (gate E). Do this as part of the release, and do not ship a build pointing at a project where this function is missing — the app would offer a delete button that always fails |
| ⬜ | F4 | Confirm Apple guideline **5.1.1(v)** still reads as expected | App Store Review Guidelines, section 5.1.1 | We built immediate deletion with no grace period, which satisfies the strictest reading. Worth re-reading before submission in case the requirements around *confirming* deletion or offering a wind-down have changed |

---

## Completed sections

*Move sections here once every item passes, with the date. This is the evidence trail behind ✅ statuses in the build plan.*
