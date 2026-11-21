-- Optional circuits on a workout exercise. A circuit holds 2 or 3 movements.
-- Members log each movement on every round.

create table if not exists public.circuit_movements (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  workout_exercise_id text not null references public.workout_exercises (id) on delete cascade,
  position integer not null check (position between 1 and 3),
  name text not null check (char_length(name) between 1 and 80),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'duration')),
  target_reps integer check (target_reps is null or target_reps between 1 and 500),
  target_reps_label text check (
    target_reps_label is null or char_length(target_reps_label) between 1 and 80
  ),
  target_duration_seconds integer check (
    target_duration_seconds is null or target_duration_seconds between 1 and 7200
  ),
  unique (workout_exercise_id, position)
);

alter table public.circuit_movements enable row level security;

grant select, insert, update, delete on public.circuit_movements to authenticated;

drop policy if exists circuit_movements_select on public.circuit_movements;
create policy circuit_movements_select on public.circuit_movements
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workout_exercises link
      join public.workouts workout on workout.id = link.workout_id
      where link.id = circuit_movements.workout_exercise_id
        and workout.published
    )
  );

drop policy if exists circuit_movements_insert on public.circuit_movements;
create policy circuit_movements_insert on public.circuit_movements
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists circuit_movements_update on public.circuit_movements;
create policy circuit_movements_update on public.circuit_movements
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists circuit_movements_delete on public.circuit_movements;
create policy circuit_movements_delete on public.circuit_movements
  for delete to authenticated
  using (public.is_admin());

alter table public.session_sets
  add column if not exists movement_position integer not null default 1
  check (movement_position between 1 and 3);

alter table public.session_sets
  drop constraint if exists session_sets_session_id_workout_exercise_id_set_index_key;

alter table public.session_sets
  drop constraint if exists session_sets_round_movement_key;

alter table public.session_sets
  add constraint session_sets_round_movement_key
  unique (session_id, workout_exercise_id, set_index, movement_position);
