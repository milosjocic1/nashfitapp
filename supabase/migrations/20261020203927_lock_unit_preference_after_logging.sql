-- Lock unit_preference once the user has logged a set (task 7.8).
--
-- Weight is stored exactly as entered, with no conversion. If a user switched
-- from kg to lb, every historical set would keep its raw number and silently
-- change meaning — 100kg becoming 100lb. The data model recorded two possible
-- fixes; the decision on 2026-10-20 was to lock the preference rather than
-- denormalise the unit onto each set.
--
-- Enforced here rather than only in the UI: a disabled toggle is a suggestion,
-- not a rule, and the REST API is directly reachable with the publishable key.
--
-- The check is on *current* existence of sets, so it self-heals — a user who
-- deletes all their history can change units again. A one-way flag could
-- disagree with the data it describes.

create or replace function public.prevent_unit_change_after_logging()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only interested in an actual change to this one column.
  if new.unit_preference is not distinct from old.unit_preference then
    return new;
  end if;

  if exists (
    select 1
    from public.sets s
    join public.session_exercises se on se.id = s.session_exercise_id
    join public.sessions sess on sess.id = se.session_id
    where sess.user_id = old.id
  ) then
    raise exception
      'unit_preference cannot be changed once sets have been logged'
      using errcode = 'check_violation',
            hint = 'Weights are stored as entered, so changing units would silently rewrite the meaning of existing history.';
  end if;

  return new;
end;
$$;

create trigger users_lock_unit_preference
  before update of unit_preference on public.users
  for each row execute function public.prevent_unit_change_after_logging();

-- Lets the client disable the Settings toggle without pulling every set down
-- to count them. security definer + a user_id filter rather than exposing a
-- count of someone else's rows.
create or replace function public.has_logged_sets()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sets s
    join public.session_exercises se on se.id = s.session_exercise_id
    join public.sessions sess on sess.id = se.session_id
    where sess.user_id = (select auth.uid())
  );
$$;

grant execute on function public.has_logged_sets() to authenticated;
