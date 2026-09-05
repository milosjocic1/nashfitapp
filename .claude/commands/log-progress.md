---
description: Append this session's work to docs/nashfit-progress-log.md
---

Append an entry to `docs/nashfit-progress-log.md` recording the work completed in this session.

Before writing, gather the facts — do not reconstruct them from memory:

1. `git log --format="%h | %ad | %s" --date=format:"%Y-%m-%d %H:%M"` for commits and their real dates.
2. `git status --short` for work that is done but not yet committed — mark those commits as `_pending_`.
3. Re-read `docs/nashfit-build-plan.md` for the task numbers and current statuses.

Then write the entry:

- **New dated section at the top**, below the "Outstanding — waiting on the client" table. If an entry for today already exists, extend it rather than adding a second.
- **Task table** with the columns already in use: Task | Work | Status | Commit | Effort. Leave `Effort` blank.
- **Prose beneath the table** covering: what was delivered, what was *verified* and how, and anything flagged to the client. Distinguish verified from assumed — say so plainly when something is untested.
- **Update the "Outstanding" table**: add new client blockers, remove any that have landed.
- **Sync `docs/nashfit-build-plan.md` statuses** if they changed (⬜ / 🟨 / ✅ / ⏸️). Use 🟨 rather than ✅ when a task is only partly met, and say why in the log.

Constraints:

- **Append only.** Never edit or remove a previous entry; it is an invoicing record. A correction is a new entry stating what it corrects.
- **Never invent hours, durations, or effort estimates.**
- Keep narrative in the progress log and statuses in the build plan — don't duplicate across both.
- Do not commit. Report what changed and hand over a proposed commit message.
