-- The 36th exercise: Machine Rear Delts (task 3.2).
--
-- Completes Nash's filmed list. Added as its own migration rather than by
-- editing 20261011160017, which is already applied to dev — editing an applied
-- migration is how local and remote quietly diverge.
--
-- Same idempotent shape as the main seed, so re-running converges.

insert into exercises (name, slug, description, movement_pattern) values
  ('Machine Rear Delts', 'machine-rear-delts', 'Also performed with dumbbells.', 'isolation')
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      movement_pattern = excluded.movement_pattern;

insert into exercise_muscle_groups (exercise_id, muscle_group_id, role)
select e.id, m.id, v.role::muscle_group_role
from (values
  ('machine-rear-delts', 'shoulders', 'primary'),
  -- Rear delt work pulls the upper back in alongside, consistent with how
  -- shrugs and upright rows are tagged.
  ('machine-rear-delts', 'back',      'secondary')
) as v(exercise_slug, muscle_slug, role)
join exercises e on e.slug = v.exercise_slug
join muscle_groups m on m.slug = v.muscle_slug
on conflict (exercise_id, muscle_group_id) do update
  set role = excluded.role;

insert into exercise_equipment (exercise_id, equipment_id)
select e.id, q.id
from (values
  ('machine-rear-delts', 'machine')
) as v(exercise_slug, equipment_slug)
join exercises e on e.slug = v.exercise_slug
join equipment q on q.slug = v.equipment_slug
on conflict (exercise_id, equipment_id) do nothing;
