# NashFit — Exercise Taxonomy

**Status:** ⏸️ Seeding parked, awaiting the definitive video-backed exercise list.
**Feeds:** build-plan tasks 3.1 (seed `muscle_groups`, `equipment`) and 3.2 (seed `exercises`).

Nothing in this document has been seeded. No code depends on it yet.

---

## Why this matters more than it looks

The data model uses reference tables rather than free text because *"chest" / "Chest" / "pecs"* is how a taxonomy rots. Two things depend on the vocabulary being closed and consistent:

1. **The browse filters** (tasks 3.5, 3.6) — picking "Chest" must return every chest exercise, none missing because one was tagged "Pecs".
2. **The plan generator** (Epic 6) — Nash's rules include covering muscle groups across a training week. The AI can only reason about that if the names are fixed.

The expensive part of changing this later is not the list, it is **re-tagging every exercise** and re-checking every Principles Document rule that names a group.

---

## Muscle groups — eight

Taken from the headings Nash used in his own exercise breakdown (2026-09-22). `display_order` follows his ordering, not alphabetical, because that is how he groups his programming.

| # | Name | Slug |
|---|---|---|
| 1 | Chest | `chest` |
| 2 | Back | `back` |
| 3 | Legs | `legs` |
| 4 | Calves | `calves` |
| 5 | Shoulders | `shoulders` |
| 6 | Biceps | `biceps` |
| 7 | Triceps | `triceps` |
| 8 | Abdominals | `abdominals` |

**On the earlier six-group list.** On 2026-09-20 a sketch was given as *Chest, back, arms, shoulders, legs, abs*. Two days later the exercise breakdown arrived organised under eight headings — **arms split into biceps and triceps, calves separated from legs**. The eight are taken as the answer, on the grounds that how he organises his own programming is better evidence than a quick list.

**Worth confirming with Nash**, since it is an inference rather than something he stated.

The eight also resolve a concern raised against the six: biceps/triceps and legs/calves are exactly the distinctions a rule like *"direct calf work twice a week"* needs, and which an atomic "Arms" or "Legs" could not express.

---

## The catalogue is video-driven (decided 2026-09-24)

**An exercise exists in the library only if Nash has a video for it.** The PRD specifies one primary video per exercise in v1, so an exercise without one is a detail screen with nothing to show.

This also settles how to handle **variations**. Nash lists movements with variations in parentheses — *Horizontal Press (barbell, dumbbells, machines)* — and whether each becomes its own row or one row with several equipment links was an open modelling question. It is now answered by inventory: **each filmed variation is its own `exercises` row; unfilmed ones do not exist yet.**

That is also the better answer on its merits:

- **Per-exercise progress (7.7) stays honest.** A barbell press at 100kg and a dumbbell press at 40kg are different lifts. One shared row would plot both on one chart and read as a collapse in strength.
- **The equipment filter (3.6) stays truthful.** Filtering to "dumbbell" should not return an exercise whose video shows a barbell.
- **Siblings stay linked** via `movement_pattern`, so the generator can ask for "a horizontal press" and take whichever variation exists.

---

## Nash's breakdown, 2026-09-22 — reference only, not seeded

As sent, spelling normalised. **36 movements**, roughly **57** once variations are expanded.

| Group | Movements |
|---|---|
| Chest | Horizontal Press (barbell, dumbbell, machine) · Incline Press (barbell, dumbbell, machine) · Decline Press (barbell, dumbbell, machine) · Pec Deck (dumbbell flyes) · Cross Overs (cable, machine) |
| Back | Pull-ups · Wide Grip Pulldown · Close Grip Pulldown · Barbell Rowing (dumbbell, machine) · Cable Rowing · Hyperextensions |
| Legs | Squats · Hack Squats · Leg Press · Lunges · Leg Extensions · Leg Curls (seated, lying) · Straight Leg Deadlift |
| Calves | Standing Calf Raises · Seated Calf Raises |
| Shoulders | Shoulder Press (barbell, dumbbell, machine) · Lateral Raises (dumbbell, machine) · Barbell Upright Rows · Rear Delts (dumbbell, machine) · Shrugs (barbell, dumbbell) |
| Biceps | Barbell Curls (dumbbell) · Scott Curls (free weight, machine) · Hammer Curls (cable, dumbbell) |
| Triceps | Bar Pushdowns · Rope Pushdowns · Extensions Behind the Neck (barbell, dumbbell, cable) |
| Abdominals | Roman Chair Crunches · Floor Crunches · Lying Hip Raises · Hanging Leg/Hip Raises · V Sits |

---

## Equipment — proposed, not reviewed

Nash has not commented on this list. It is engineering's proposal.

| # | Name | Slug | Note |
|---|---|---|---|
| 1 | Barbell | `barbell` | |
| 2 | Dumbbell | `dumbbell` | |
| 3 | EZ Bar | `ez-bar` | |
| 4 | Cable | `cable` | Any cable station |
| 5 | Machine | `machine` | Selectorised and plate-loaded |
| 6 | Smith Machine | `smith-machine` | |
| 7 | Bodyweight | `bodyweight` | |
| 8 | Pull-up Bar | `pull-up-bar` | |
| 9 | Dip Station | `dip-station` | |
| 10 | Bench | `bench` | Flat, incline or decline |
| 11 | Roman Chair | `roman-chair` | Added for his ab work |
| 12 | Resistance Band | `resistance-band` | |

Equipment is a **link table** (decided at 0.5), so one exercise can need several: barbell bench press is `barbell` + `bench`.

**Attachments deliberately excluded** — rope, V-bar, ankle strap. Nobody filters a library by "do I own a rope", and the generator does not select by attachment. Note this means *Bar Pushdowns* and *Rope Pushdowns* are distinguished by **name**, not equipment, which is correct: they are different exercises with different videos.

**Lower stakes than muscle groups.** Per the onboarding template, v1 never asks what equipment a user has, and the Principles Document is expected to state its own assumption (e.g. full gym). Equipment only drives the browse filter at 3.6; it does not constrain plan generation.

---

## What is still needed

| Needed | Blocks | Who |
|---|---|---|
| **Definitive list of filmed exercises** | 3.1, 3.2 → all of Phase 3 | Nash |
| **Form cues per exercise**, as discrete points | 3.2, and the detail screen at 4.3 | Nash |
| Common mistakes per exercise (optional) | 3.2 | Nash |
| Confirmation of the eight muscle groups | 3.1 | Nash |
| Review of the equipment list | 3.1 | Nash |
| Movement pattern per exercise | 3.2, and generator coverage rules in Epic 6 | Nash, or inferred and confirmed |

**The cues are the gap that matters.** What exists today is a list of movement names, which every fitness app has. Nash's cues and common mistakes are what make the library *his* — the differentiator the PRD is built on. Exercise names can be seeded without them, but the detail screen has almost nothing to show until they arrive.

---

## Related

- `docs/nashfit-v1-data-model.md` — the `muscle_groups`, `equipment`, `exercises` and link-table schema this fills
- `docs/nashfit-build-plan.md` — tasks 3.1, 3.2
- Principles Document — the real test of whether this vocabulary is complete. If a rule there names a group not in the eight, the rule cannot be applied as written.
