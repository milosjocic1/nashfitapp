# NashFit — v1 Product Requirements Document
 
**Status:** Living document — update as decisions change
**Scope:** Version 1 — the exercise video library, AI-generated Nash-style training plans, and session logging. v1 delivers the full loop: onboard → get a plan → follow it (with video/instruction per exercise) → log what you did.
 
**Scope note (expanded).** An earlier version of this doc treated AI plan generation as a later, revenue-funded phase. Following discussion with Nash, **AI plan generation is now part of v1**, driven by a hand-authored **Principles Document** (Nash's methodology as an explicit source of truth) rather than the full corpus/RAG decomposition — that larger corpus work remains deferred. v1 is bigger than the original cut, but still "v1."
 
---
 
## Problem & Goal
 
**Problem.** Dr. Nash's community buys his eBooks and programs as static PDFs. They get his methodology as text, but nothing that (a) builds them a plan the way Nash would, and (b) shows them how to perform each exercise correctly, his way, mid-workout. Generic apps do plans and videos, but none carry *his* methodology, his cues, or his perspective.
 
**Goal of v1.** Ship a focused, branded mobile app that onboards a user, generates a Nash-style training plan from his authored methodology, shows instructional video + cues for every exercise in that plan, and lets the user log their actual performance against it — opening a new recurring revenue stream via subscription.
 
**North star.** A working, easy-to-use app that provides genuine value. Engineering effort is focused here. (Business success metrics are owned by Nash, deliberately out of scope for this document.)
 
---
 
## Target User
 
The primary user is **someone who wants to train the way Nash teaches — to be given a Nash-style plan and shown how to perform each exercise correctly.**
 
This user is **not gated by age or natural/enhanced status.** Nash's over-40 and natural-lifter positioning is brand and marketing — it is not a limit on who the app is for or how it is designed. The app's utility is general; the marketing angle is specific.
 
Reached primarily through Nash's existing community (eBook/program buyers, coaching clients) and discovery via his YouTube channel.
 
---
 
## Pricing
 
- **Subscription model.** No one-time purchase.
- **Annual plan as the headline value**, with a **monthly option** at a deliberately higher effective rate.
- **Hard paywall — no free content or preview.** The app is gated after signup.
**Rationale.** Subscription aligns revenue with the ongoing cost of running the app (OS upgrades, hosting, AI/API costs, maintenance) and produces the compounding, predictable revenue the roadmap needs — unlike a one-time payment, which spikes then declines. The annual plan blunts the "subscribe once, screen-record everything, cancel" concern (committing for a year to rip content is rare and amounts to a one-time price anyway). The video-ripping risk is addressed technically (stream rather than bundle; don't expose raw URLs), not by distorting the pricing model. AI plan generation adds a per-user compute cost, reinforcing the subscription logic.
 
---
 
## In Scope for v1
 
**Onboarding — plan-generation inputs.**
Collect the four inputs the plan generator uses: **age, fitness level/experience, sex, training days per week.** Goal is deliberately *not* collected — the plan follows Nash's default objective (a brand stance: his methodology decides what you train for). Kept separate from preferences (below). See the User Information Gathering template.
 
**AI plan generation.**
On completing onboarding, the app generates a **polished, Nash-style plan the user follows.** The generator's source of truth is Nash's **Principles Document** (his methodology as explicit rules + reasoning). The AI applies those rules to the user's inputs and assembles a plan from the app's exercise library — it selects and structures from vetted exercises, not free-form invention. Output is written into the session/prescription fields (see data model).
 
**Human review of plans — two-phase.**
- **Phase 1 (launch / early):** every generated plan is reviewed *before* it reaches the user. This protects Nash's reputation while the system is least proven, and generates the review/test-run signal that improves the Principles Document.
- **Phase 2 (once plans are consistently good):** plans go straight to the user; a **notification on plan creation** lets Nash/dev audit after the fact as a standing safety net.
- The phase is a **toggle** (auto-approve on/off), so switching costs nothing. The notification exists in both phases.
**Exercise library — browse & search.**
Browse exercises; filter by muscle group and equipment; search by name. (Filtering limited to muscle group + equipment in v1; richer taxonomy may exist in data without UI.) The library is both a standalone browse experience and the pool the plan generator draws from.
 
**Exercise detail + video.**
Detail screen per exercise: streamed instructional video, Nash's form cues (text), target muscles, equipment. **One primary video per exercise** in v1 — schema allows multiple (angles, variations) but UI shows one. Reached both by browsing the library and by tapping an exercise inside a generated plan.
 
**Session logging.**
Users log sets/weights/reps per exercise and save sessions to history, seeing per-exercise progress over time. Logging works against a **plan the AI prescribed** (the core adaptive loop: agent prescribes → user logs actual → future adjustment) **and** ad hoc (user assembles a session on the fly). **No user-built saved templates or multi-week manual program-building** — plan structure comes from the AI, not a manual builder.
 
**Auth & accounts.**
Email/password signup (with **password reset via email**), plus Apple sign-in and Google sign-in. (Apple sign-in is effectively required by Apple when other social logins are offered.)
 
**Subscription / paywall.**
Implemented via RevenueCat. Paywall gates the whole app after signup.
 
**Offline behavior.**
Logging works offline and syncs when the connection returns (gym connectivity is unreliable; losing a logged set is unacceptable). Video and plan *generation* require a connection — offline video download is a priority v2 fast-follow.
 
**Platforms.**
Cross-platform iOS + Android from day one, built with Expo / React Native.
 
---
 
## Dependencies
 
- **Nash's Principles Document.** Plan quality is capped by how specifically Nash authors his methodology. This document is a hard prerequisite for the plan-generation feature and is owned by Nash (see the Principles Document template). It must be versioned — plans should be traceable to the ruleset that produced them.
- **Exercise library populated with the vocabulary the Principles Document references.** Exercises named or implied by Nash's rules must exist in the library, with consistent taxonomy, or substitution rules must point to ones that do.
---
 
## Out of Scope for v1 (Deferred)
 
- Full corpus/RAG decomposition of Nash's eBooks, videos, and programs (the Principles Document replaces it as source of truth for now)
- Nutrition tools or tracking
- Community / social features
- User-built workout templates and manual multi-week program-building
- Offline video download (priority v2 fast-follow)
- Custom admin panel (developer operates the Supabase dashboard in v1)
- Fine-tuning / training a model in Nash's voice
These are deferred and funded by v1 revenue.
 
---
 
## Non-Goals (Boundary Lines)
 
- **v1 is not a nutrition tool.**
- **v1 demonstrates exercises and generates training plans, but is not medical, injury, or physiotherapy advice.** This matters more now that the app *prescribes* plans (not just demonstrates exercises) to an audience that includes older lifters — the Principles Document's hard-constraints/safety section and the human-review phase are the guardrails, and the app should carry appropriate disclaimers.
---
 
## Adaptive Loop — What v1 Builds vs. What Comes Later
 
v1 builds the *full* prescribe→log loop mechanically: the AI prescribes a plan, the user logs actual performance against it. What v1 does **not** yet do is **automatically adjust the next plan from logged history** — that closed-loop adaptation is a later enhancement. In v1, regeneration/progression is driven by Nash's progression rules and re-onboarding, not by the AI reading back a user's logged sets. The data already supports the closed loop; v1 simply doesn't automate it yet.
 
---
 
## Risks Noted
 
- **Plan quality is capped by the Principles Document.** Vague methodology → inconsistent plans. Mitigation: the template pushes for explicit decision rules; Phase 1 review surfaces gaps fast.
- **Auto-generated plans carry duty-of-care.** Prescribing to a partly-over-40 audience raises the stakes of a bad plan vs. merely showing a video. Mitigation: hard-constraints section in the Principles Document, two-phase review, disclaimers.
- **LLM consistency.** Even with a good document, an LLM can produce variable or off-method output. Mitigation: constrain generation to selecting/assembling from vetted library exercises; validate structured output; Phase 1 review.
- **Dual-platform launch increases first-release surface.** Two review processes, two sets of store assets, platform-specific bugs at once. Expo makes the *code* cross-platform; the launch is still heavier than a single-platform debut — plan the timeline accordingly.
- **v1 is now larger than the original cut.** Onboarding + generation + review is meaningful added scope over "library + logger." Sequencing and honest scoping matter more than before.
---
 
## Constraints
 
None fixed at this time.
 