-- TEMPORARY placeholder form cues (task 3.2) — DELETE BEFORE LAUNCH.
--
-- Nash has not supplied his coaching points yet, and the exercise detail
-- screen (task 4.3) cannot be built or laid out against an empty field. These
-- exist so that screen can be developed; they are not content.
--
-- ============================================================================
-- EVERY STRING BELOW STARTS WITH THE MARKER `[PLACEHOLDER]`.
--
-- That is deliberate and must not be "tidied up". CLAUDE.md requires that the
-- app never present cues Nash did not write — the failure mode this guards
-- against is plausible-sounding coaching quietly shipping under his name, or
-- Nash seeing invented words attributed to him. Text that could be mistaken
-- for real coaching is the dangerous kind of placeholder, so these are written
-- to be impossible to mistake.
--
-- TO FIND THEM:
--   select slug from exercises
--   where form_cues::text like '%[PLACEHOLDER]%'
--      or common_mistakes::text like '%[PLACEHOLDER]%';
--
-- TO REMOVE THEM: write a migration that replaces these with Nash's real cues,
-- or resets the columns to '[]'. Pre-launch checklist item E1 in
-- docs/nashfit-verification-checklist.md fails the release if any survive.
-- ============================================================================
--
-- Lengths vary deliberately: a detail screen laid out against four identical
-- short strings looks fine and then breaks on Nash's actual longer cues.

update exercises
set
  form_cues = jsonb_build_array(
    '[PLACEHOLDER] First coaching point for ' || name || ' — awaiting Nash.',
    '[PLACEHOLDER] Second coaching point. This one is deliberately longer so the detail screen is laid out against a cue that wraps onto two or three lines, which Nash''s real cues often will.',
    '[PLACEHOLDER] Third coaching point — awaiting Nash.',
    '[PLACEHOLDER] Fourth coaching point, medium length, awaiting Nash''s wording.'
  ),
  common_mistakes = jsonb_build_array(
    '[PLACEHOLDER] A common mistake on this movement — awaiting Nash.',
    '[PLACEHOLDER] A second common mistake, written longer so the list is tested against uneven item heights.'
  )
where form_cues = '[]'::jsonb or form_cues is null;
