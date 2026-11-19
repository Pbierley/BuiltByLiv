-- Four phases of three weeks. A workout with a phase stays locked until the
-- member's signup date reaches that phase. Workouts with no phase stay open.

create table if not exists public.phases (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  program_id text not null references public.programs (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  summary text not null default '' check (char_length(summary) <= 300),
  position integer not null check (position between 1 and 4),
  starts_week integer not null check (starts_week between 1 and 12),
  ends_week integer not null check (ends_week between starts_week and 12),
  unique (program_id, position)
);

alter table public.workouts
  add column if not exists phase_id text references public.phases (id) on delete restrict;

alter table public.phases enable row level security;

grant select, insert, update, delete on public.phases to authenticated;

drop policy if exists phases_select on public.phases;
create policy phases_select on public.phases
  for select to authenticated
  using (true);

drop policy if exists phases_insert on public.phases;
create policy phases_insert on public.phases
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists phases_update on public.phases;
create policy phases_update on public.phases
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists phases_delete on public.phases;
create policy phases_delete on public.phases
  for delete to authenticated
  using (public.is_admin());

insert into public.phases (id, program_id, title, summary, position, starts_week, ends_week)
values
  ('phase-1', 'strength-foundations', 'Phase 1', 'The first three weeks.', 1, 1, 3),
  ('phase-2', 'strength-foundations', 'Phase 2', 'Weeks 4 through 6.', 2, 4, 6),
  ('phase-3', 'strength-foundations', 'Phase 3', 'Weeks 7 through 9.', 3, 7, 9),
  ('phase-4', 'strength-foundations', 'Phase 4', 'Weeks 10 through 12.', 4, 10, 12)
on conflict (id) do update set
  program_id = excluded.program_id,
  title = excluded.title,
  summary = excluded.summary,
  position = excluded.position,
  starts_week = excluded.starts_week,
  ends_week = excluded.ends_week;

-- Match "Phase 2" even when a line break sits between the word and the number.
update public.workouts
set phase_id = 'phase-4'
where regexp_replace(title, '[^[:alnum:]]', '', 'g') ~* 'phase4';

update public.workouts
set phase_id = 'phase-3'
where phase_id is null
  and regexp_replace(title, '[^[:alnum:]]', '', 'g') ~* 'phase3';

update public.workouts
set phase_id = 'phase-2'
where phase_id is null
  and regexp_replace(title, '[^[:alnum:]]', '', 'g') ~* 'phase2';

update public.workouts
set phase_id = 'phase-1'
where phase_id is null
  and (
    regexp_replace(title, '[^[:alnum:]]', '', 'g') ~* 'phase1'
    or summary ilike '%foundation to phase 2%'
  );
