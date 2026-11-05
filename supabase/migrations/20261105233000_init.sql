-- Built by Liv. Apply this in the Supabase SQL editor, or with `supabase db push`.
-- Passwords are not stored here. Supabase Auth keeps a bcrypt hash in auth.users.
-- The hash cannot be reversed. This schema never sees the password.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  display_name text not null check (char_length(display_name) between 1 and 80),
  unit text not null default 'lb' check (unit in ('lb', 'kg')),
  role text not null default 'member' check (role in ('member', 'admin')),
  coaching_acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.entitlements (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null check (status in ('trialing', 'active', 'grace', 'expired')),
  provider text check (provider in ('stripe', 'apple', 'google')),
  trial_end timestamptz,
  current_period_end timestamptz,
  provider_customer_id text,
  updated_at timestamptz not null default now()
);

create table public.programs (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  published boolean not null default false,
  position integer not null default 0
);

create table public.workouts (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  program_id text not null references public.programs (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  summary text not null default '' check (char_length(summary) <= 300),
  published boolean not null default false,
  position integer not null default 0
);

create table public.exercises (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 80),
  coaching text not null default '' check (char_length(coaching) <= 2000),
  video_path text check (video_path is null or video_path ~ '^[a-z0-9-]{1,80}/[0-9a-f-]{36}$'),
  published boolean not null default true
);

create table public.workout_exercises (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  workout_id text not null references public.workouts (id) on delete restrict,
  exercise_id text not null references public.exercises (id) on delete restrict,
  position integer not null default 0,
  cue text check (cue is null or char_length(cue) <= 200),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'duration')),
  sets integer not null check (sets between 1 and 20),
  target_reps integer check (target_reps is null or target_reps between 1 and 500),
  target_duration_seconds integer check (
    target_duration_seconds is null or target_duration_seconds between 1 and 7200
  ),
  rest_seconds integer not null default 60 check (rest_seconds between 0 and 600)
);

create table public.body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weighed_on date not null,
  weight_kg numeric(6, 3) not null check (weight_kg > 0 and weight_kg < 500),
  created_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workout_id text not null references public.workouts (id) on delete restrict,
  title_snapshot text not null check (char_length(title_snapshot) between 1 and 80),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  workout_exercise_id text not null references public.workout_exercises (id) on delete restrict,
  set_index integer not null check (set_index between 0 and 39),
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'duration')),
  reps integer check (reps is null or reps between 0 and 500),
  weight_kg numeric(6, 3) check (weight_kg is null or (weight_kg >= 0 and weight_kg < 500)),
  duration_seconds integer check (
    duration_seconds is null or duration_seconds between 0 and 7200
  ),
  skipped boolean not null default false,
  unique (session_id, workout_exercise_id, set_index)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index body_weight_user_date_idx
  on public.body_weight_entries (user_id, weighed_on desc);

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create index messages_member_created_idx
  on public.messages (member_id, created_at);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_entitled(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlements
    where user_id = uid
      and status in ('trialing', 'active', 'grace')
      and (current_period_end is null or current_period_end > now())
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
  chosen_unit text;
  provider text;
  acknowledged timestamptz;
begin
  provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  if provider = 'email' and coalesce(new.raw_user_meta_data ->> 'coaching_ack', '') <> 'yes' then
    raise exception 'Coaching acknowledgement is required';
  end if;
  if new.raw_user_meta_data ->> 'coaching_ack' = 'yes' then
    acknowledged := now();
  end if;

  chosen_name := left(
    regexp_replace(
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
      '[[:cntrl:]]',
      '',
      'g'
    ),
    80
  );
  if chosen_name = '' then
    chosen_name := 'Member';
  end if;

  chosen_unit := case
    when new.raw_user_meta_data ->> 'unit' = 'kg' then 'kg'
    else 'lb'
  end;

  insert into public.profiles (id, email, display_name, unit, role, coaching_acknowledged_at)
  values (new.id, coalesce(new.email, ''), chosen_name, chosen_unit, 'member', acknowledged);

  insert into public.entitlements (user_id, status, trial_end, current_period_end)
  values (new.id, 'trialing', now() + interval '7 days', now() + interval '7 days');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') and coalesce(auth.role(), '') <> 'service_role' then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.created_at := old.created_at;
    new.coaching_acknowledged_at := old.coaching_acknowledged_at;
  end if;
  return new;
end;
$$;

create trigger protect_profile_row
  before update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.acknowledge_coaching()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  update public.profiles
  set coaching_acknowledged_at = now()
  where id = auth.uid()
    and coaching_acknowledged_at is null;
end;
$$;

create or replace function public.limit_message_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
begin
  select count(*)
  into recent_count
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';

  if recent_count >= 10 then
    raise exception 'Too many messages. Wait a minute and try again.';
  end if;
  return new;
end;
$$;

create trigger limit_messages
  before insert on public.messages
  for each row execute function public.limit_message_rate();

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.body_weight_entries enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;
alter table public.messages enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select (id, email, display_name, unit, role, coaching_acknowledged_at, created_at)
  on public.profiles to authenticated;
grant update (display_name, unit) on public.profiles to authenticated;
grant select on public.entitlements to authenticated;
grant select, insert, update, delete on public.programs to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.body_weight_entries to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.session_sets to authenticated;
grant select, insert on public.messages to authenticated;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_entitled(uuid) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile() from public, anon, authenticated;
revoke all on function public.acknowledge_coaching() from public, anon;
revoke all on function public.limit_message_rate() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_entitled(uuid) to authenticated;
grant execute on function public.acknowledge_coaching() to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy entitlements_select on public.entitlements
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy programs_select on public.programs
  for select to authenticated
  using (published or public.is_admin());

create policy programs_insert on public.programs
  for insert to authenticated
  with check (public.is_admin());

create policy programs_update on public.programs
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy programs_delete on public.programs
  for delete to authenticated
  using (public.is_admin());

create policy workouts_select on public.workouts
  for select to authenticated
  using (published or public.is_admin());

create policy workouts_insert on public.workouts
  for insert to authenticated
  with check (public.is_admin());

create policy workouts_update on public.workouts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy workouts_delete on public.workouts
  for delete to authenticated
  using (public.is_admin());

create policy exercises_select on public.exercises
  for select to authenticated
  using (
    public.is_admin()
    or (
      published
      and exists (
        select 1
        from public.workout_exercises link
        join public.workouts workout on workout.id = link.workout_id
        where link.exercise_id = exercises.id
          and workout.published
      )
    )
  );

create policy exercises_insert on public.exercises
  for insert to authenticated
  with check (public.is_admin());

create policy exercises_update on public.exercises
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy exercises_delete on public.exercises
  for delete to authenticated
  using (public.is_admin());

create policy workout_exercises_select on public.workout_exercises
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.workouts workout
      join public.exercises exercise on exercise.id = workout_exercises.exercise_id
      where workout.id = workout_exercises.workout_id
        and workout.published
        and exercise.published
    )
  );

create policy workout_exercises_insert on public.workout_exercises
  for insert to authenticated
  with check (public.is_admin());

create policy workout_exercises_update on public.workout_exercises
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy workout_exercises_delete on public.workout_exercises
  for delete to authenticated
  using (public.is_admin());

create policy weights_select on public.body_weight_entries
  for select to authenticated
  using (user_id = auth.uid());

create policy weights_insert on public.body_weight_entries
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy weights_update on public.body_weight_entries
  for update to authenticated
  using (user_id = auth.uid() and public.is_entitled(auth.uid()))
  with check (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy weights_delete on public.body_weight_entries
  for delete to authenticated
  using (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy sessions_select on public.workout_sessions
  for select to authenticated
  using (user_id = auth.uid());

create policy sessions_insert on public.workout_sessions
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy sessions_update on public.workout_sessions
  for update to authenticated
  using (user_id = auth.uid() and public.is_entitled(auth.uid()))
  with check (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy sessions_delete on public.workout_sessions
  for delete to authenticated
  using (user_id = auth.uid() and public.is_entitled(auth.uid()));

create policy sets_select on public.session_sets
  for select to authenticated
  using (
    exists (
      select 1
      from public.workout_sessions session
      where session.id = session_sets.session_id
        and session.user_id = auth.uid()
    )
  );

create policy sets_insert on public.session_sets
  for insert to authenticated
  with check (
    public.is_entitled(auth.uid())
    and exists (
      select 1
      from public.workout_sessions session
      where session.id = session_sets.session_id
        and session.user_id = auth.uid()
    )
  );

create policy sets_update on public.session_sets
  for update to authenticated
  using (
    public.is_entitled(auth.uid())
    and exists (
      select 1
      from public.workout_sessions session
      where session.id = session_sets.session_id
        and session.user_id = auth.uid()
    )
  )
  with check (
    public.is_entitled(auth.uid())
    and exists (
      select 1
      from public.workout_sessions session
      where session.id = session_sets.session_id
        and session.user_id = auth.uid()
    )
  );

create policy sets_delete on public.session_sets
  for delete to authenticated
  using (
    public.is_entitled(auth.uid())
    and exists (
      select 1
      from public.workout_sessions session
      where session.id = session_sets.session_id
        and session.user_id = auth.uid()
    )
  );

create policy messages_select on public.messages
  for select to authenticated
  using (member_id = auth.uid() or public.is_admin());

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      member_id = auth.uid()
      or public.is_admin()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']::text[]
);

create policy exercise_videos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'exercise-videos'
    and public.is_admin()
    and name ~ '^[a-z0-9-]{1,80}/[0-9a-f-]{36}$'
  );

create policy exercise_videos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'exercise-videos' and public.is_admin())
  with check (
    bucket_id = 'exercise-videos'
    and public.is_admin()
    and name ~ '^[a-z0-9-]{1,80}/[0-9a-f-]{36}$'
  );

create policy exercise_videos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'exercise-videos' and public.is_admin());

-- Members do not get a select policy on storage. Playback uses a short-lived
-- signed URL created after the server checks the session and entitlement.

insert into public.programs (id, title, description, published, position)
values
  (
    'strength-foundations',
    'Strength Foundations',
    'Four lifting days. Every exercise has a demo, a set and rep target, and a place to write down what you actually did.',
    true,
    0
  ),
  (
    'engine',
    'Engine',
    'Shorter conditioning sessions for days you want to sweat without a long barbell workout.',
    true,
    1
  );

insert into public.workouts (id, program_id, title, summary, published, position)
values
  ('lower-a', 'strength-foundations', 'Lower A', 'Squat, hinge, lunge, then a plank.', true, 0),
  ('upper-a', 'strength-foundations', 'Upper A', 'Bench, row, push-ups, and a short plank.', true, 1),
  ('lower-b', 'strength-foundations', 'Lower B', 'Front squat, hip thrust, side plank.', true, 2),
  ('upper-b', 'strength-foundations', 'Upper B', 'Press, pull, and a carry.', true, 3),
  ('mixed-engine', 'engine', 'Mixed engine', 'Row intervals and push-ups.', true, 0);

insert into public.exercises (id, name, coaching, published)
values
  ('back-squat', 'Back squat', 'Feet about shoulder width. Brace before you descend, sit between your hips, and stand tall. Knees track over the mid-foot.', true),
  ('rdl', 'Romanian deadlift', 'Soft knees, push the hips back until the hamstrings load, and keep the bar close to your legs.', true),
  ('walking-lunge', 'Walking lunge', 'Take a long step, let the back knee kiss the floor, and drive through the front heel.', true),
  ('plank', 'Plank', 'Ribs down, glutes squeezed, neck long. Breathe. Stop the set if your lower back sags.', true),
  ('bench', 'Bench press', 'Shoulder blades set, feet planted, bar lowered to the lower chest, then pressed back over the shoulders.', true),
  ('row', 'One-arm row', 'Hand and knee on the bench, pull the dumbbell toward the hip, and pause for a beat.', true),
  ('push-up', 'Push-up', 'Body in one line from head to heel. Chest travels to the floor, elbows about 45 degrees from your sides.', true),
  ('plank-upper', 'Plank', 'Same brace as Lower A. Shorter holds, cleaner position.', true),
  ('front-squat', 'Front squat', 'Elbows high, bar on the fingertips and front delts. Stay tall as you sit down.', true),
  ('hip-thrust', 'Hip thrust', 'Upper back on the bench, drive through the heels, and lock the hips out without flaring the ribs.', true),
  ('side-plank', 'Side plank', 'Hips forward, bottom shoulder stacked under the elbow.', true),
  ('press', 'Overhead press', 'Squeeze the glutes, ribs down, bar travels close to the face and finishes over the mid-foot.', true),
  ('pull-up', 'Pull-up', 'Dead hang to start, pull the chest toward the bar, lower under control.', true),
  ('carry', 'Farmer carry', 'Heavy dumbbells, tall walk, quiet shoulders.', true),
  ('row-erg', 'Row', 'Hard but repeatable. Sit tall on the recovery, then push the footplates before you pull.', true),
  ('engine-push-up', 'Push-up', 'Same position as Strength Foundations. Move smoothly.', true);

insert into public.workout_exercises (
  id, workout_id, exercise_id, position, cue, tracking_type, sets, target_reps, target_duration_seconds, rest_seconds
)
values
  ('back-squat', 'lower-a', 'back-squat', 0, 'Slow eccentric', 'weight_reps', 3, 8, null, 120),
  ('rdl', 'lower-a', 'rdl', 1, null, 'weight_reps', 3, 10, null, 90),
  ('walking-lunge', 'lower-a', 'walking-lunge', 2, 'Use dumbbells if the bar is busy', 'reps', 3, 12, null, 60),
  ('plank', 'lower-a', 'plank', 3, null, 'duration', 3, null, 45, 45),
  ('bench', 'upper-a', 'bench', 0, null, 'weight_reps', 4, 6, null, 150),
  ('row', 'upper-a', 'row', 1, null, 'weight_reps', 3, 10, null, 75),
  ('push-up', 'upper-a', 'push-up', 2, null, 'reps', 3, 10, null, 60),
  ('plank-upper', 'upper-a', 'plank-upper', 3, null, 'duration', 3, null, 40, 40),
  ('front-squat', 'lower-b', 'front-squat', 0, null, 'weight_reps', 3, 6, null, 150),
  ('hip-thrust', 'lower-b', 'hip-thrust', 1, null, 'weight_reps', 3, 10, null, 90),
  ('side-plank', 'lower-b', 'side-plank', 2, 'Each side', 'duration', 3, null, 30, 30),
  ('press', 'upper-b', 'press', 0, null, 'weight_reps', 4, 5, null, 120),
  ('pull-up', 'upper-b', 'pull-up', 1, 'A band or an assisted machine is fine', 'reps', 4, 5, null, 90),
  ('carry', 'upper-b', 'carry', 2, null, 'duration', 3, null, 40, 60),
  ('row-erg', 'mixed-engine', 'row-erg', 0, null, 'duration', 5, null, 120, 60),
  ('engine-push-up', 'mixed-engine', 'engine-push-up', 1, null, 'reps', 5, 8, null, 45);

-- Promote Liv after she creates an account. Run this in the SQL editor as the
-- database owner. The app cannot grant admin, and a member cannot set their own role.
-- update public.profiles set role = 'admin' where email = 'liv@example.com';
