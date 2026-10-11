-- Seed the controlled vocabularies (build-plan task 3.1).
--
-- A migration rather than supabase/seed.sql: seed.sql only runs on a local
-- `db reset` and would never reach dev or prod, but these are vocabulary the
-- app and the plan generator both depend on.
--
-- Idempotent — safe to re-run, and the source of truth for these lists is this
-- file plus docs/nashfit-exercise-taxonomy.md. Nash's vocabulary changes by
-- editing a migration, never by hand-editing rows in the dashboard.

-- Muscle groups ------------------------------------------------------------
-- The eight headings Nash organises his own programming under. display_order
-- follows his ordering, not alphabetical.
insert into muscle_groups (name, slug, display_order) values
  ('Chest',       'chest',       1),
  ('Back',        'back',        2),
  ('Legs',        'legs',        3),
  ('Calves',      'calves',      4),
  ('Shoulders',   'shoulders',   5),
  ('Biceps',      'biceps',      6),
  ('Triceps',     'triceps',     7),
  ('Abdominals',  'abdominals',  8)
on conflict (name) do update
  set slug = excluded.slug,
      display_order = excluded.display_order;

-- Equipment ----------------------------------------------------------------
-- Derived from what the filmed exercises actually use, rather than a generic
-- gym inventory. No Smith machine, dip station, kettlebell or resistance band
-- appears in Nash's list, so none are seeded — an empty filter option is worse
-- than a missing one.
--
-- Attachments (rope, V-bar) are deliberately absent: Bar Pushdowns and Rope
-- Pushdowns are distinguished by being separate exercises with separate
-- videos, which is the honest representation.
insert into equipment (name, slug, display_order) values
  ('Barbell',              'barbell',              1),
  ('EZ Bar',               'ez-bar',               2),
  ('Dumbbell',             'dumbbell',             3),
  ('Cable',                'cable',                4),
  ('Machine',              'machine',              5),
  ('Bodyweight',           'bodyweight',           6),
  ('Bench',                'bench',                7),
  ('Pull-up Bar',          'pull-up-bar',          8),
  ('Hyperextension Bench', 'hyperextension-bench', 9),
  ('Roman Chair',          'roman-chair',         10)
on conflict (name) do update
  set slug = excluded.slug,
      display_order = excluded.display_order;
