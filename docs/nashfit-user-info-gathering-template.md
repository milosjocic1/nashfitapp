# NashFit — User Information Gathering (Onboarding) Template
 
**Purpose.** Defines what the app asks the user, and why. Two clearly separated groups:
 
1. **Plan-generation inputs** — the facts the AI needs to build a plan. Kept minimal and deliberate: every input here must be *used* by a rule in the Principles Document.
2. **Preferences** — settings that shape *display and app behaviour*, not the plan. These never affect plan generation.
Keeping these separate matters: mixing "what shapes my plan" with "what unit I see weights in" confuses both the user and the system. A change to a preference should never regenerate a plan.
 
---
 
## Group 1 — Plan-Generation Inputs
 
These four are the *only* things the AI knows about the user. Every rule in the Principles Document keys off this set.
 
### 1. Age
- **Type:** number (years)
- **Why:** drives the age-adjustment rules (§7 of the Principles Document), central to the over-40 methodology.
- **Data model:** stored on the user profile (new field; not in the v1 data model's `users` table yet — add when the AI layer lands).
- **Validation:** sensible range (e.g. 16–90); consider a minimum age for the product.
### 2. Fitness level / experience
- **Type:** single choice — Beginner (0–1 yr) / Intermediate (1–3 yr) / Advanced (3+ yr)
- **Why:** the primary driver of split, volume, rep ranges, and progression.
- **Data model:** enum on the user profile.
- **Note:** keep the bands identical to the ones the Principles Document uses, so input maps cleanly to rules.
### 3. Sex
- **Type:** single choice — Male / Female
- **Why:** feeds the sex-adjustment rules (§8). If Nash applies no differences, it's still collected but changes nothing.
- **Data model:** enum on the user profile.
### 4. Training days per week
- **Type:** single choice — 3 / 4 / 5 / 6 (match whatever the Principles Document supports)
- **Why:** changes the structural shape of the plan (the split table in §1). High-impact input.
- **Data model:** int on the user profile.
- **Note:** only offer values the Principles Document has rules for. If Nash doesn't support 2-day or 7-day, don't offer them.
**Deliberately NOT collected:**
- **Goal** — by decision, the app does not ask goal; the plan follows Nash's default objective (§0 of the Principles Document). This is a brand stance: Nash's methodology decides what you train for.
- **Equipment / injuries / history** — not collected in this version. If the Principles Document assumes equipment (e.g. full gym), state that assumption there. Revisit if plans suffer without it.
---
 
## Group 2 — Preferences (display & behaviour only)
 
These do **not** feed plan generation. They can change any time with no effect on the plan.
 
### Unit preference
- **Type:** single choice — kg / lb
- **Effect:** how weights display and are entered throughout the app.
- **Data model:** `unit_preference` on `users` (already in the v1 data model).
- **Note:** see the data model's units edge case — weight is stored as entered; decide the switch-after-logging behaviour before launch.
### (Room for future preferences)
- Notifications on/off, theme, etc. — add as needed. All belong here, not in Group 1.
---
 
## How this maps to plan generation
 
The flow at generation time:
 
1. User completes Group 1 (age, experience, sex, training days).
2. Those four values + the Principles Document go to the plan-generation Edge Function.
3. The function applies the Principles rules to the inputs, selects exercises from the library, and produces a structured plan.
4. The plan is written into the session/prescription fields (per the data model's prescribed vs. actual split).
5. Group 2 preferences affect only how that plan is *displayed* (e.g. loads shown in kg or lb).
**Design rule:** if adding a question doesn't change a rule in the Principles Document, it doesn't belong in Group 1. If it changes the plan, it must not be in Group 2.
 
---
 
## Open questions to resolve
 
- **Minimum age / eligibility** — is there a floor for who can use the plan generator?
- **Experience self-assessment** — users often misjudge their level. Worth a short helper text under each option so "Intermediate" means the same to the user as to Nash's rules.
- **Re-onboarding** — can a user change these inputs later and regenerate a plan? (Almost certainly yes — decide how that interacts with an in-progress plan.)