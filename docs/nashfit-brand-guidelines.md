# NashFit — Brand Guidelines (App)
 
**Status:** Living document — v1 draft for review with Nash
**Purpose.** Translate Nash's existing brand (logo, colours, editorial type) into an app-ready system: exact tokens, type roles, and usage rules the app and Claude Code build against. Flags clearly where this **matches** Nash's existing identity vs. **extends** it into surfaces his current brand doesn't cover (app UI states, dark theme, touch targets).
 
---
 
## 1. Brand essence
 
Nash's identity, read from his logo, site, and eBooks: **authoritative, science-backed, no-nonsense, premium, and mature.** The voice is a knowledgeable coach — a "walking encyclopedia," not a hype merchant. The app must feel like *his* — serious and credible — not like a neon consumer fitness app.
 
**Design principles that follow:**
- **Dark, high-contrast, confident.** The logo is white + red on black. The app is dark-first.
- **Red is a scalpel, not a paintbrush.** Black dominates, white carries the text, red punctuates (one accent at a time). Preserve that ratio.
- **Editorial gravitas.** Nash's eBooks use a classical serif (Palatino). The app carries that through in headings and reading surfaces, giving it a considered, "authored" feel most fitness apps lack.
- **Legible in motion.** Used mid-workout at arm's length — legibility outranks decoration.
---
 
## 2. Colour
 
### Core brand colours (matched — from the logo)
 
| Token | Hex | Role |
|---|---|---|
| `brand-red` | `#ED070D` | The single accent. Primary actions, active states, key highlights, the "Fit" energy. |
| `brand-black` | `#090708` | The logo's field. Deepest background. |
| `brand-white` | `#FFFFFF` | Primary text on dark, logo wordmark. |
 
### Extended palette (extended — app UI needs these; not in Nash's kit)
 
A dark theme needs layered greys between pure black and white — for elevated surfaces (cards above the page), borders, and muted text. These are proposed to fill that gap; flag for Nash's approval.
 
| Token | Hex | Role |
|---|---|---|
| `surface-0` | `#090708` | Page background (the brand black). |
| `surface-1` | `#161314` | Cards / raised surfaces one level up. |
| `surface-2` | `#211D1E` | Higher elevation (modals, sheets, inputs). |
| `border` | `#2E2A2B` | Hairline dividers, card edges. |
| `text-primary` | `#FFFFFF` | Headings, key text. |
| `text-secondary` | `#B8B2B4` | Supporting text, labels. |
| `text-muted` | `#7A7476` | Hints, captions, metadata. |
 
### Semantic colours (extended — for logging/state feedback)
 
The core palette has no green/amber, but logging and forms need success/warning/error. Red is reserved for the *brand accent*, so error uses a distinct, slightly deeper red to avoid clashing with actionable red.
 
| Token | Hex | Role |
|---|---|---|
| `success` | `#3B9E5E` | Set logged, plan approved, positive progress. |
| `warning` | `#E0A82E` | Caution, pending states. |
| `error` | `#C0392B` | Validation errors, destructive actions. |
 
**Usage rules.**
- **One red action per screen.** If everything is red, nothing reads as the primary action. The main CTA is `brand-red`; secondary actions are outlined/ghost on the dark surface.
- **Red on black is the signature.** Keep white as the workhorse for text; let red mark the one thing that matters most on each screen.
- Text on `brand-red` fills should be `brand-white` (the red is dark enough to carry white legibly).
---
 
## 3. Typography
 
**The decision (locked): Lora (serif) + Inter (sans).** Nash's eBooks use Palatino, and that editorial identity carries into the app — but Palatino isn't reliably available on Android and isn't app-licensed by default, so the app uses **Lora** as the serif: a warm, calligraphic, humanist serif close in spirit to Palatino, free, Google-hosted, app-licensed, and identical across iOS and Android. **Inter** carries the functional UI: designed for small-size on-screen legibility, with tabular figures for the logger. This pairing gives the app Nash's book-like character where it's read and crisp legibility where it's used.
 
*(Matched: the serif, editorial feel. Extended: the specific app-safe family, and a sans for functional UI — see below.)*
 
### Type roles
 
| Role | Family | Use |
|---|---|---|
| **Display / headings** | Lora (serif) | Screen titles, exercise names, plan headings, Nash's cues — the editorial, "authored" surfaces. |
| **Body / reading** | Lora (serif) | Descriptions, cue text, longer reading. |
| **Functional UI** | Inter (sans) | Buttons, form fields, tab bars, numbers, the logging keypad — where small-size legibility rules. |
| **Numeric (logging)** | Inter (sans), tabular figures | Weights, reps, set counts — tabular so columns align. |
 
**Why the split:** the serif gives the app Nash's book-like gravitas where it's read; the sans keeps buttons, inputs, and mid-workout numbers crisp at small sizes. This is an *extension* of Nash's brand — his books are pure serif; an app can't be without hurting usability. If Nash wants the serif pushed further (or pulled back), it's a token change, not a redesign.
 
### Scale (starting point)
 
| Level | Size / weight |
|---|---|
| Display | 28px / 600 serif |
| H1 | 22px / 600 serif |
| H2 | 18px / 500 serif |
| Body | 16px / 400 serif |
| Label | 14px / 500 sans |
| Caption | 13px / 400 sans |
| Numeric (logging) | 20–24px / 500 sans tabular |
 
---
 
## 4. Logo usage
 
Two assets exist in the supplied logo:
 
- **Full wordmark** ("Nash Fit Training" + NF swoosh mark) — splash screen, paywall header, onboarding welcome, marketing.
- **NF monogram** (the letters in the red swoosh) — the **app icon** candidate, small headers, loading states, favicon.
**Rules.**
- Always on a dark field (`surface-0`/`brand-black`) — the logo is designed for dark; never place the standard logo on white.
- Preserve clear space around it (min. the height of the "N" on all sides).
- Never recolour the red, stretch, or add effects.
- **App icon:** the NF monogram in red/white on the brand black, per platform icon specs. (A light-background variant may be needed if a store requires one — flag to source from Nash if so.)
---
 
## 5. Component styling primitives
 
Starting rules the wireframes and Claude Code build against.
 
- **Buttons.** Primary: `brand-red` fill, white text, ~12px radius, comfortable touch height (≥48px). Secondary: transparent with a `border` hairline, white text. Only one primary (red) per screen.
- **Cards.** `surface-1` on the `surface-0` page, hairline `border`, ~12px radius, generous padding.
- **Inputs.** `surface-2` fill, `border` hairline, white text, red focus ring. Large touch targets.
- **Tab bar / nav.** Dark (`surface-0`/`surface-1`), active item marked in `brand-red`, inactive in `text-secondary`.
- **Lists (exercise library).** Row or card items on the dark page, thumbnail + serif name + sans metadata (muscle group, equipment).
- **Video surfaces.** Dark chrome so the video is the brightest thing on screen.
---
 
## 6. Voice & tone (in-app copy)
 
Draws from Nash's site voice: authoritative, direct, motivating without hype.
 
- **Confident and plain.** "Log your set," not "Let's crush it!" Nash's brand is credibility, not gym-bro energy.
- **Instructional.** Copy teaches — it reflects that every session with Nash "is like a lecture."
- **Respectful of the user's seriousness.** The audience trains with intent; the copy assumes competence.
- **Sentence case**, minimal exclamation, no filler.
---
 
## 7. Matched vs. extended — summary for Nash
 
**Matched to your existing brand:** the red (#ED070D), black, and white; the dark-first identity; the editorial serif feel from your eBooks; the logo and its two forms.
 
**Extended (needs your sign-off):** the grey surface ramp for a dark app UI; semantic success/warning/error colours; **Lora** as the app-safe serif standing in for Palatino; **Inter** for functional UI; the component and copy rules. These fill gaps a website/eBook brand doesn't cover but an app requires — all reversible token changes, not identity changes. (The Palatino→Lora substitution is the one most worth walking Nash through, since Palatino is core to his eBooks; Lora is chosen to preserve that character while working across both app platforms.)
 
---
 
## 8. Design tokens (for the codebase)
 
These become the app's theme. Provided as a starting `theme` object for Claude Code.
 
```
colors:
  brandRed:      "#ED070D"
  brandBlack:    "#090708"
  surface0:      "#090708"
  surface1:      "#161314"
  surface2:      "#211D1E"
  border:        "#2E2A2B"
  textPrimary:   "#FFFFFF"
  textSecondary: "#B8B2B4"
  textMuted:     "#7A7476"
  success:       "#3B9E5E"
  warning:       "#E0A82E"
  error:         "#C0392B"
fonts:
  serif:  "Lora"        (headings, reading — the Palatino-family stand-in)
  sans:   "Inter"       (functional UI, numbers)
radius:
  control: 12
  card:    12
theme: dark (primary)
```
 