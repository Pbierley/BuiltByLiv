-- Optional warmup text on a workout. Members see it above the exercises.

alter table public.workouts
  add column if not exists warmup text
  check (warmup is null or char_length(warmup) between 1 and 2000);
