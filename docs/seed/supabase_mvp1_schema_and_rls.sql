
-- Supabase MVP1 schema + RLS policies
-- Video Coaching Platform for Personal Trainers
-- Safe to run on a fresh Supabase Postgres project.
-- Review before use in production.

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('trainer', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'trainer_client_status') then
    create type public.trainer_client_status as enum ('invited', 'active', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('uploaded', 'ready_for_review', 'feedback_sent');
  end if;
end$$;

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role public.app_role not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainer_profiles (
  trainer_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text,
  business_name text,
  logo_path text,
  headshot_path text,
  website_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status public.trainer_client_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trainer_clients_unique_pair unique (trainer_id, client_id),
  constraint trainer_clients_client_unique unique (client_id)
);

create table if not exists public.exercises (
  id bigserial primary key,
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.video_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id bigint not null references public.exercises(id),
  video_path text not null,
  client_note text,
  status public.submission_status not null default 'uploaded',
  duration_seconds integer,
  file_size_bytes bigint,
  uploaded_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  feedback_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.video_submissions(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  timestamp_seconds numeric(10,2) not null check (timestamp_seconds >= 0),
  comment_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.submission_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.video_submissions(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  summary_text text,
  is_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.voice_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.video_submissions(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  audio_path text not null,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_trainer_clients_trainer_id on public.trainer_clients(trainer_id);
create index if not exists idx_trainer_clients_client_id on public.trainer_clients(client_id);
create index if not exists idx_video_submissions_client_id on public.video_submissions(client_id);
create index if not exists idx_video_submissions_trainer_id on public.video_submissions(trainer_id);
create index if not exists idx_video_submissions_status on public.video_submissions(status);
create index if not exists idx_submission_comments_submission_id on public.submission_comments(submission_id);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_trainer_profiles on public.trainer_profiles;
create trigger set_updated_at_trainer_profiles
before update on public.trainer_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_trainer_clients on public.trainer_clients;
create trigger set_updated_at_trainer_clients
before update on public.trainer_clients
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_video_submissions on public.video_submissions;
create trigger set_updated_at_video_submissions
before update on public.video_submissions
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_submission_comments on public.submission_comments;
create trigger set_updated_at_submission_comments
before update on public.submission_comments
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_submission_feedback on public.submission_feedback;
create trigger set_updated_at_submission_feedback
before update on public.submission_feedback
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_voice_feedback on public.voice_feedback;
create trigger set_updated_at_voice_feedback
before update on public.voice_feedback
for each row execute procedure public.set_updated_at();

-- =========================================================
-- HELPERS
-- =========================================================

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_trainer_for_client(_trainer_id uuid, _client_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.trainer_clients tc
    where tc.trainer_id = _trainer_id
      and tc.client_id = _client_id
      and tc.status = 'active'
  )
$$;

create or replace function public.current_trainer_id_for_client(_client_id uuid)
returns uuid
language sql
stable
as $$
  select tc.trainer_id
  from public.trainer_clients tc
  where tc.client_id = _client_id
    and tc.status = 'active'
  limit 1
$$;

-- =========================================================
-- AUTO PROFILE CREATION (OPTIONAL)
-- Reads from auth.users raw_user_meta_data:
--   role, full_name, display_name, business_name
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _role public.app_role;
begin
  _role := coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'client');

  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    _role,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  if _role = 'trainer' then
    insert into public.trainer_profiles (
      trainer_id,
      display_name,
      business_name
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'business_name', '')
    )
    on conflict (trainer_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================================================
-- SEED EXERCISES
-- =========================================================

insert into public.exercises (name, slug)
values
  ('Squat', 'squat'),
  ('Deadlift', 'deadlift'),
  ('Bench Press', 'bench-press'),
  ('Overhead Press', 'overhead-press'),
  ('Row', 'row'),
  ('Pull-Up', 'pull-up'),
  ('Other', 'other')
on conflict (slug) do nothing;

-- =========================================================
-- ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.trainer_profiles enable row level security;
alter table public.trainer_clients enable row level security;
alter table public.exercises enable row level security;
alter table public.video_submissions enable row level security;
alter table public.submission_comments enable row level security;
alter table public.submission_feedback enable row level security;
alter table public.voice_feedback enable row level security;

-- =========================================================
-- DROP EXISTING POLICIES (idempotent)
-- =========================================================

drop policy if exists "profiles_select_self_or_linked" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

drop policy if exists "trainer_profiles_select_self_or_client_view" on public.trainer_profiles;
drop policy if exists "trainer_profiles_upsert_self" on public.trainer_profiles;
drop policy if exists "trainer_profiles_update_self" on public.trainer_profiles;

drop policy if exists "trainer_clients_select_linked" on public.trainer_clients;
drop policy if exists "trainer_clients_insert_trainer" on public.trainer_clients;
drop policy if exists "trainer_clients_update_trainer" on public.trainer_clients;

drop policy if exists "exercises_select_all_authenticated" on public.exercises;

drop policy if exists "video_submissions_select_client_or_trainer" on public.video_submissions;
drop policy if exists "video_submissions_insert_client" on public.video_submissions;
drop policy if exists "video_submissions_update_client_or_trainer" on public.video_submissions;

drop policy if exists "submission_comments_select_client_or_trainer" on public.submission_comments;
drop policy if exists "submission_comments_insert_trainer" on public.submission_comments;
drop policy if exists "submission_comments_update_trainer" on public.submission_comments;
drop policy if exists "submission_comments_delete_trainer" on public.submission_comments;

drop policy if exists "submission_feedback_select_client_or_trainer" on public.submission_feedback;
drop policy if exists "submission_feedback_insert_trainer" on public.submission_feedback;
drop policy if exists "submission_feedback_update_trainer" on public.submission_feedback;

drop policy if exists "voice_feedback_select_client_or_trainer" on public.voice_feedback;
drop policy if exists "voice_feedback_insert_trainer" on public.voice_feedback;
drop policy if exists "voice_feedback_update_trainer" on public.voice_feedback;
drop policy if exists "voice_feedback_delete_trainer" on public.voice_feedback;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
create policy "profiles_select_self_or_linked"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or (
    current_user_role() = 'trainer'
    and exists (
      select 1
      from public.trainer_clients tc
      where tc.trainer_id = auth.uid()
        and tc.client_id = profiles.id
        and tc.status = 'active'
    )
  )
  or (
    current_user_role() = 'client'
    and exists (
      select 1
      from public.trainer_clients tc
      where tc.client_id = auth.uid()
        and tc.trainer_id = profiles.id
        and tc.status = 'active'
    )
  )
);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- trainer_profiles
create policy "trainer_profiles_select_self_or_client_view"
on public.trainer_profiles
for select
to authenticated
using (
  trainer_id = auth.uid()
  or (
    current_user_role() = 'client'
    and exists (
      select 1
      from public.trainer_clients tc
      where tc.client_id = auth.uid()
        and tc.trainer_id = trainer_profiles.trainer_id
        and tc.status = 'active'
    )
  )
);

create policy "trainer_profiles_upsert_self"
on public.trainer_profiles
for insert
to authenticated
with check (trainer_id = auth.uid() and current_user_role() = 'trainer');

create policy "trainer_profiles_update_self"
on public.trainer_profiles
for update
to authenticated
using (trainer_id = auth.uid() and current_user_role() = 'trainer')
with check (trainer_id = auth.uid() and current_user_role() = 'trainer');

-- trainer_clients
create policy "trainer_clients_select_linked"
on public.trainer_clients
for select
to authenticated
using (
  trainer_id = auth.uid() or client_id = auth.uid()
);

create policy "trainer_clients_insert_trainer"
on public.trainer_clients
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

create policy "trainer_clients_update_trainer"
on public.trainer_clients
for update
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
)
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

-- exercises
create policy "exercises_select_all_authenticated"
on public.exercises
for select
to authenticated
using (true);

-- video_submissions
create policy "video_submissions_select_client_or_trainer"
on public.video_submissions
for select
to authenticated
using (
  client_id = auth.uid()
  or trainer_id = auth.uid()
);

create policy "video_submissions_insert_client"
on public.video_submissions
for insert
to authenticated
with check (
  client_id = auth.uid()
  and current_user_role() = 'client'
  and trainer_id = current_trainer_id_for_client(auth.uid())
);

create policy "video_submissions_update_client_or_trainer"
on public.video_submissions
for update
to authenticated
using (
  client_id = auth.uid()
  or trainer_id = auth.uid()
)
with check (
  client_id = auth.uid()
  or trainer_id = auth.uid()
);

-- submission_comments
create policy "submission_comments_select_client_or_trainer"
on public.submission_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.video_submissions vs
    where vs.id = submission_comments.submission_id
      and (vs.client_id = auth.uid() or vs.trainer_id = auth.uid())
  )
);

create policy "submission_comments_insert_trainer"
on public.submission_comments
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
  and exists (
    select 1
    from public.video_submissions vs
    where vs.id = submission_comments.submission_id
      and vs.trainer_id = auth.uid()
  )
);

create policy "submission_comments_update_trainer"
on public.submission_comments
for update
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
)
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

create policy "submission_comments_delete_trainer"
on public.submission_comments
for delete
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

-- submission_feedback
create policy "submission_feedback_select_client_or_trainer"
on public.submission_feedback
for select
to authenticated
using (
  trainer_id = auth.uid()
  or exists (
    select 1
    from public.video_submissions vs
    where vs.id = submission_feedback.submission_id
      and vs.client_id = auth.uid()
  )
);

create policy "submission_feedback_insert_trainer"
on public.submission_feedback
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
  and exists (
    select 1
    from public.video_submissions vs
    where vs.id = submission_feedback.submission_id
      and vs.trainer_id = auth.uid()
  )
);

create policy "submission_feedback_update_trainer"
on public.submission_feedback
for update
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
)
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

-- voice_feedback
create policy "voice_feedback_select_client_or_trainer"
on public.voice_feedback
for select
to authenticated
using (
  trainer_id = auth.uid()
  or exists (
    select 1
    from public.video_submissions vs
    where vs.id = voice_feedback.submission_id
      and vs.client_id = auth.uid()
  )
);

create policy "voice_feedback_insert_trainer"
on public.voice_feedback
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
  and exists (
    select 1
    from public.video_submissions vs
    where vs.id = voice_feedback.submission_id
      and vs.trainer_id = auth.uid()
  )
);

create policy "voice_feedback_update_trainer"
on public.voice_feedback
for update
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
)
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

create policy "voice_feedback_delete_trainer"
on public.voice_feedback
for delete
to authenticated
using (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

-- =========================================================
-- STORAGE BUCKETS
-- Path conventions:
--   videos/<client_id>/<submission_id>/<filename>
--   trainer-logos/<trainer_id>/<filename>
--   trainer-headshots/<trainer_id>/<filename>
--   voice-feedback/<trainer_id>/<submission_id>/<filename>
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('videos', 'videos', false),
  ('trainer-logos', 'trainer-logos', false),
  ('trainer-headshots', 'trainer-headshots', false),
  ('voice-feedback', 'voice-feedback', false)
on conflict (id) do nothing;

-- Drop existing storage policies if they exist
drop policy if exists "videos_select_owner_or_trainer" on storage.objects;
drop policy if exists "videos_insert_client" on storage.objects;
drop policy if exists "videos_update_client" on storage.objects;
drop policy if exists "videos_delete_client" on storage.objects;

drop policy if exists "trainer_logos_select_linked" on storage.objects;
drop policy if exists "trainer_logos_insert_trainer" on storage.objects;
drop policy if exists "trainer_logos_update_trainer" on storage.objects;
drop policy if exists "trainer_logos_delete_trainer" on storage.objects;

drop policy if exists "trainer_headshots_select_linked" on storage.objects;
drop policy if exists "trainer_headshots_insert_trainer" on storage.objects;
drop policy if exists "trainer_headshots_update_trainer" on storage.objects;
drop policy if exists "trainer_headshots_delete_trainer" on storage.objects;

drop policy if exists "voice_feedback_select_client_or_trainer" on storage.objects;
drop policy if exists "voice_feedback_insert_trainer" on storage.objects;
drop policy if exists "voice_feedback_update_trainer" on storage.objects;
drop policy if exists "voice_feedback_delete_trainer" on storage.objects;

-- videos bucket
create policy "videos_select_owner_or_trainer"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'videos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.trainer_clients tc
      where tc.client_id::text = (storage.foldername(name))[1]
        and tc.trainer_id = auth.uid()
        and tc.status = 'active'
    )
  )
);

create policy "videos_insert_client"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'videos'
  and current_user_role() = 'client'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "videos_update_client"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'videos'
  and current_user_role() = 'client'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'videos'
  and current_user_role() = 'client'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "videos_delete_client"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'videos'
  and current_user_role() = 'client'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- trainer-logos bucket
create policy "trainer_logos_select_linked"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trainer-logos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.trainer_clients tc
      where tc.client_id = auth.uid()
        and tc.trainer_id::text = (storage.foldername(name))[1]
        and tc.status = 'active'
    )
  )
);

create policy "trainer_logos_insert_trainer"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trainer-logos'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trainer_logos_update_trainer"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trainer-logos'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'trainer-logos'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trainer_logos_delete_trainer"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trainer-logos'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- trainer-headshots bucket
create policy "trainer_headshots_select_linked"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'trainer-headshots'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.trainer_clients tc
      where tc.client_id = auth.uid()
        and tc.trainer_id::text = (storage.foldername(name))[1]
        and tc.status = 'active'
    )
  )
);

create policy "trainer_headshots_insert_trainer"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trainer-headshots'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trainer_headshots_update_trainer"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'trainer-headshots'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'trainer-headshots'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "trainer_headshots_delete_trainer"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'trainer-headshots'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- voice-feedback bucket
create policy "voice_feedback_select_client_or_trainer"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'voice-feedback'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.video_submissions vs
      where vs.id::text = (storage.foldername(name))[2]
        and (vs.client_id = auth.uid() or vs.trainer_id = auth.uid())
    )
  )
);

create policy "voice_feedback_insert_trainer"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'voice-feedback'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "voice_feedback_update_trainer"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'voice-feedback'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'voice-feedback'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "voice_feedback_delete_trainer"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'voice-feedback'
  and current_user_role() = 'trainer'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
