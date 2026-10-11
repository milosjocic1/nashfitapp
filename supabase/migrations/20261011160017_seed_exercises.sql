-- Seed the exercise library (build-plan task 3.2).
--
-- 35 exercises from Nash's filmed list (2026-10-11). Repeatable: every insert
-- upserts on `slug`, and the link tables are rebuilt per exercise, so running
-- this again converges rather than duplicating.
--
-- THE CATALOGUE IS VIDEO-DRIVEN. An exercise exists here only because Nash has
-- filmed it. Each name states the implement actually shown in the video, so
-- the equipment filter (task 3.6) never returns an exercise whose video shows
-- different kit. The "variations" Nash listed are NOT separate rows — they are
-- noted in `description` as alternatives, and become rows of their own if and
-- when they are filmed.
--
-- NOT YET POPULATED: `form_cues` and `common_mistakes`. Nash's coaching points
-- are the differentiator and have not been supplied. The exercise detail
-- screen (task 4.3) has little to show until they arrive; they land via a
-- follow-up migration.
--
-- `movement_pattern` is engineering's reading of standard terminology, not
-- Nash's. It matters more than usual because the muscle vocabulary is coarse:
-- with "Legs" atomic, hinge-vs-squat is what separates hamstring-dominant from
-- quad-dominant work for the plan generator. Worth Nash's review.

-- Exercises ----------------------------------------------------------------
insert into exercises (name, slug, description, movement_pattern) values
  -- Chest
  ('Flat Dumbbell Press',        'flat-dumbbell-press',        'Also performed with a barbell or on a machine.', 'horizontal-push'),
  ('Incline Dumbbell Press',     'incline-dumbbell-press',     'Also performed with a barbell or on a machine.', 'horizontal-push'),
  ('Decline Machine Press',      'decline-machine-press',      'Also performed with a barbell or dumbbells.',    'horizontal-push'),
  ('Machine Flyes',              'machine-flyes',              'Also performed with dumbbells.',                 'isolation'),
  ('Machine Cross Overs',        'machine-cross-overs',        'Also performed on cables.',                      'isolation'),

  -- Back
  ('Pull-ups',                   'pull-ups',                   null,                                             'vertical-pull'),
  ('Wide Grip Pulldown',         'wide-grip-pulldown',         null,                                             'vertical-pull'),
  ('Close Grip Pulldown',        'close-grip-pulldown',        null,                                             'vertical-pull'),
  ('Barbell Rowing',             'barbell-rowing',             'Also performed with dumbbells or on a machine.', 'horizontal-pull'),
  ('Cable Rowing',               'cable-rowing',               null,                                             'horizontal-pull'),
  ('Hyperextensions',            'hyperextensions',            null,                                             'hinge'),

  -- Legs
  ('Squats',                     'squats',                     null,                                             'squat'),
  ('Hack Squats',                'hack-squats',                null,                                             'squat'),
  ('Leg Press',                  'leg-press',                  null,                                             'squat'),
  ('Lunges',                     'lunges',                     null,                                             'squat'),
  ('Leg Extensions',             'leg-extensions',             null,                                             'isolation'),
  ('Lying Leg Curls',            'lying-leg-curls',            'Also performed seated.',                         'isolation'),
  ('Straight Leg Deadlift',      'straight-leg-deadlift',      null,                                             'hinge'),

  -- Calves
  ('Standing Calf Raises',       'standing-calf-raises',       null,                                             'isolation'),
  ('Seated Calf Raises',         'seated-calf-raises',         null,                                             'isolation'),

  -- Shoulders
  ('Machine Shoulder Press',     'machine-shoulder-press',     'Also performed with a barbell or dumbbells.',    'vertical-push'),
  ('Dumbbell Lateral Raises',    'dumbbell-lateral-raises',    'Also performed on a machine.',                   'isolation'),
  ('Barbell Upright Rows',       'barbell-upright-rows',       null,                                             'vertical-pull'),
  ('Dumbbell Shrugs',            'dumbbell-shrugs',            'Also performed with a barbell.',                 'isolation'),

  -- Biceps
  ('Barbell Curls',              'barbell-curls',              'Also performed with dumbbells.',                 'isolation'),
  ('Machine Scott Curls',        'machine-scott-curls',        'Also performed with free weights.',              'isolation'),
  ('Dumbbell Hammer Curls',      'dumbbell-hammer-curls',      'Also performed on a cable.',                     'isolation'),

  -- Triceps
  ('Bar Pushdowns',              'bar-pushdowns',              null,                                             'isolation'),
  ('Rope Pushdowns',             'rope-pushdowns',             null,                                             'isolation'),
  ('EZ Bar Extensions Behind the Neck', 'ez-bar-extensions-behind-the-neck', 'Also performed with a barbell, dumbbells or a cable.', 'isolation'),

  -- Abdominals
  ('Roman Chair Crunches',       'roman-chair-crunches',       null,                                             'core'),
  ('Floor Crunches',             'floor-crunches',             null,                                             'core'),
  ('Lying Hip Raises',           'lying-hip-raises',           null,                                             'core'),
  ('Hanging Leg Raises',         'hanging-leg-raises',         null,                                             'core'),
  ('V Sits',                     'v-sits',                     null,                                             'core')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      movement_pattern = excluded.movement_pattern;

-- Muscle group links -------------------------------------------------------
-- Rebuilt rather than merged, so removing a link in this file actually removes
-- it from the database on the next run.
delete from exercise_muscle_groups
where exercise_id in (select id from exercises);

insert into exercise_muscle_groups (exercise_id, muscle_group_id, role)
select e.id, m.id, v.role::muscle_group_role
from (values
  -- Chest: pressing hits triceps and front delts secondarily; flyes are isolated
  ('flat-dumbbell-press',    'chest',      'primary'),
  ('flat-dumbbell-press',    'triceps',    'secondary'),
  ('flat-dumbbell-press',    'shoulders',  'secondary'),
  ('incline-dumbbell-press', 'chest',      'primary'),
  ('incline-dumbbell-press', 'shoulders',  'secondary'),
  ('incline-dumbbell-press', 'triceps',    'secondary'),
  ('decline-machine-press',  'chest',      'primary'),
  ('decline-machine-press',  'triceps',    'secondary'),
  ('machine-flyes',          'chest',      'primary'),
  ('machine-cross-overs',    'chest',      'primary'),

  -- Back: every pull works biceps secondarily
  ('pull-ups',               'back',       'primary'),
  ('pull-ups',               'biceps',     'secondary'),
  ('wide-grip-pulldown',     'back',       'primary'),
  ('wide-grip-pulldown',     'biceps',     'secondary'),
  ('close-grip-pulldown',    'back',       'primary'),
  ('close-grip-pulldown',    'biceps',     'secondary'),
  ('barbell-rowing',         'back',       'primary'),
  ('barbell-rowing',         'biceps',     'secondary'),
  ('cable-rowing',           'back',       'primary'),
  ('cable-rowing',           'biceps',     'secondary'),
  ('hyperextensions',        'back',       'primary'),
  ('hyperextensions',        'legs',       'secondary'),

  -- Legs
  ('squats',                 'legs',       'primary'),
  ('hack-squats',            'legs',       'primary'),
  ('leg-press',              'legs',       'primary'),
  ('lunges',                 'legs',       'primary'),
  ('leg-extensions',         'legs',       'primary'),
  ('lying-leg-curls',        'legs',       'primary'),
  ('straight-leg-deadlift',  'legs',       'primary'),
  ('straight-leg-deadlift',  'back',       'secondary'),

  -- Calves
  ('standing-calf-raises',   'calves',     'primary'),
  ('seated-calf-raises',     'calves',     'primary'),

  -- Shoulders
  ('machine-shoulder-press', 'shoulders',  'primary'),
  ('machine-shoulder-press', 'triceps',    'secondary'),
  ('dumbbell-lateral-raises','shoulders',  'primary'),
  ('barbell-upright-rows',   'shoulders',  'primary'),
  ('barbell-upright-rows',   'back',       'secondary'),
  ('dumbbell-shrugs',        'shoulders',  'primary'),
  ('dumbbell-shrugs',        'back',       'secondary'),

  -- Biceps
  ('barbell-curls',          'biceps',     'primary'),
  ('machine-scott-curls',    'biceps',     'primary'),
  ('dumbbell-hammer-curls',  'biceps',     'primary'),

  -- Triceps
  ('bar-pushdowns',          'triceps',    'primary'),
  ('rope-pushdowns',         'triceps',    'primary'),
  ('ez-bar-extensions-behind-the-neck', 'triceps', 'primary'),

  -- Abdominals
  ('roman-chair-crunches',   'abdominals', 'primary'),
  ('floor-crunches',         'abdominals', 'primary'),
  ('lying-hip-raises',       'abdominals', 'primary'),
  ('hanging-leg-raises',     'abdominals', 'primary'),
  ('v-sits',                 'abdominals', 'primary')
) as v(exercise_slug, muscle_slug, role)
join exercises e on e.slug = v.exercise_slug
join muscle_groups m on m.slug = v.muscle_slug;

-- Equipment links ----------------------------------------------------------
delete from exercise_equipment
where exercise_id in (select id from exercises);

insert into exercise_equipment (exercise_id, equipment_id)
select e.id, q.id
from (values
  ('flat-dumbbell-press',    'dumbbell'),
  ('flat-dumbbell-press',    'bench'),
  ('incline-dumbbell-press', 'dumbbell'),
  ('incline-dumbbell-press', 'bench'),
  ('decline-machine-press',  'machine'),
  ('machine-flyes',          'machine'),
  ('machine-cross-overs',    'machine'),

  ('pull-ups',               'bodyweight'),
  ('pull-ups',               'pull-up-bar'),
  ('wide-grip-pulldown',     'cable'),
  ('close-grip-pulldown',    'cable'),
  ('barbell-rowing',         'barbell'),
  ('cable-rowing',           'cable'),
  ('hyperextensions',        'bodyweight'),
  ('hyperextensions',        'hyperextension-bench'),

  ('squats',                 'barbell'),
  ('hack-squats',            'machine'),
  ('leg-press',              'machine'),
  ('lunges',                 'dumbbell'),
  ('leg-extensions',         'machine'),
  ('lying-leg-curls',        'machine'),
  ('straight-leg-deadlift',  'barbell'),

  ('standing-calf-raises',   'machine'),
  ('seated-calf-raises',     'machine'),

  ('machine-shoulder-press', 'machine'),
  ('dumbbell-lateral-raises','dumbbell'),
  ('barbell-upright-rows',   'barbell'),
  ('dumbbell-shrugs',        'dumbbell'),

  ('barbell-curls',          'barbell'),
  ('machine-scott-curls',    'machine'),
  ('dumbbell-hammer-curls',  'dumbbell'),

  ('bar-pushdowns',          'cable'),
  ('rope-pushdowns',         'cable'),
  ('ez-bar-extensions-behind-the-neck', 'ez-bar'),

  ('roman-chair-crunches',   'roman-chair'),
  ('floor-crunches',         'bodyweight'),
  ('lying-hip-raises',       'bodyweight'),
  ('hanging-leg-raises',     'bodyweight'),
  ('hanging-leg-raises',     'pull-up-bar'),
  ('v-sits',                 'bodyweight')
) as v(exercise_slug, equipment_slug)
join exercises e on e.slug = v.exercise_slug
join equipment q on q.slug = v.equipment_slug;
