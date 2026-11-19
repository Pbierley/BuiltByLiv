-- Short rep instruction on a prescription, such as 6-12 or 8-10 each leg.
-- target_reps stays for a single number and for rows saved before this column.
-- A blank instruction is stored as null so the app can keep showing target_reps.

alter table public.workout_exercises
  add column if not exists target_reps_label text;

alter table public.workout_exercises
  drop constraint if exists workout_exercises_target_reps_label_check;

alter table public.workout_exercises
  add constraint workout_exercises_target_reps_label_check
  check (
    target_reps_label is null
    or char_length(target_reps_label) between 1 and 80
  );
