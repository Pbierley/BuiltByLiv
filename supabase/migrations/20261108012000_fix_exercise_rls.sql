-- The exercise and workout-link policies queried each other, so Postgres
-- aborted member pages with "infinite recursion detected in policy".
drop policy workout_exercises_select on public.workout_exercises;

create policy workout_exercises_select on public.workout_exercises
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workouts workout
      where workout.id = workout_exercises.workout_id
        and workout.published
    )
  );
