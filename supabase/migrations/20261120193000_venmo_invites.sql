-- Venmo details and manual invites. Run this in the Supabase SQL editor.
-- The site does not charge Venmo. Liv confirms a payment, then invites the person.
-- invited_at is set by Supabase Auth on an admin invite. Signup metadata cannot set it.

create table if not exists public.payment_settings (
  id integer primary key check (id = 1),
  venmo_username text check (
    venmo_username is null
    or venmo_username ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$'
  ),
  qr_path text check (
    qr_path is null
    or qr_path ~ '^[0-9a-f-]{36}\.(png|jpe?g|webp)$'
  ),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.invites (
  email text primary key check (
    char_length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  invited_at timestamptz not null default now(),
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'invited' check (status in ('invited', 'already_had_account'))
);

create index if not exists invites_invited_at_idx
  on public.invites (invited_at desc);

alter table public.payment_settings enable row level security;
alter table public.invites enable row level security;

revoke all on public.payment_settings from anon, authenticated;
revoke all on public.invites from anon, authenticated;

grant select on public.payment_settings to anon, authenticated;
grant update (venmo_username, qr_path, updated_at)
  on public.payment_settings to authenticated;
grant select, insert, update on public.invites to authenticated;
grant all on public.payment_settings to service_role;
grant all on public.invites to service_role;

drop policy if exists payment_settings_select on public.payment_settings;
create policy payment_settings_select on public.payment_settings
  for select to anon, authenticated
  using (true);

drop policy if exists payment_settings_update on public.payment_settings;
create policy payment_settings_update on public.payment_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (public.is_admin());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated
  with check (public.is_admin() and invited_by = auth.uid());

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and invited_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-qr',
  'payment-qr',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_qr_select on storage.objects;
create policy payment_qr_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'payment-qr');

drop policy if exists payment_qr_insert on storage.objects;
create policy payment_qr_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-qr'
    and public.is_admin()
    and name ~ '^[0-9a-f-]{36}\.(png|jpe?g|webp)$'
  );

drop policy if exists payment_qr_update on storage.objects;
create policy payment_qr_update on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-qr' and public.is_admin())
  with check (
    bucket_id = 'payment-qr'
    and public.is_admin()
    and name ~ '^[0-9a-f-]{36}\.(png|jpe?g|webp)$'
  );

drop policy if exists payment_qr_delete on storage.objects;
create policy payment_qr_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-qr' and public.is_admin());

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
  invited boolean;
begin
  provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  invited := new.invited_at is not null;
  if provider = 'email'
     and not invited
     and coalesce(new.raw_user_meta_data ->> 'coaching_ack', '') <> 'yes' then
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

  if invited then
    insert into public.entitlements (user_id, status, provider, trial_end, current_period_end)
    values (new.id, 'active', null, null, null);
  else
    insert into public.entitlements (user_id, status, trial_end, current_period_end)
    values (new.id, 'trialing', now() + interval '7 days', now() + interval '7 days');
  end if;

  return new;
end;
$$;

create or replace function public.user_id_by_email(target text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id
  from auth.users
  where lower(email) = lower(target)
  limit 1;
$$;

revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
