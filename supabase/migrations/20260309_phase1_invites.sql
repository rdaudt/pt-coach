-- Phase 1 invite lifecycle migration
-- Supports RELA-01/02 requirements:
-- - trainer invite send/resend
-- - 7-day expiry
-- - guided acceptance with one-trainer-per-client constraints

begin;

create table if not exists public.trainer_client_invites (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  client_email text not null,
  invite_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consumed_at timestamptz,
  consumed_by_client_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  constraint trainer_client_invites_email_normalized
    check (client_email = lower(client_email)),
  constraint trainer_client_invites_pending_state
    check (not (consumed_at is not null and revoked_at is not null)),
  constraint trainer_client_invites_expiry_window
    check (expires_at > created_at),
  constraint trainer_client_invites_token_length
    check (char_length(invite_token) >= 24)
);

create index if not exists idx_trainer_client_invites_trainer_id
  on public.trainer_client_invites(trainer_id);

create index if not exists idx_trainer_client_invites_email
  on public.trainer_client_invites(lower(client_email));

drop index if exists idx_trainer_client_invites_pending_unique;
create unique index idx_trainer_client_invites_pending_unique
  on public.trainer_client_invites(trainer_id, lower(client_email))
  where consumed_at is null and revoked_at is null;

drop trigger if exists set_updated_at_trainer_client_invites on public.trainer_client_invites;
create trigger set_updated_at_trainer_client_invites
before update on public.trainer_client_invites
for each row execute procedure public.set_updated_at();

alter table public.trainer_client_invites enable row level security;

drop policy if exists "trainer_client_invites_select_linked" on public.trainer_client_invites;
drop policy if exists "trainer_client_invites_insert_trainer" on public.trainer_client_invites;
drop policy if exists "trainer_client_invites_update_trainer" on public.trainer_client_invites;
drop policy if exists "trainer_client_invites_select_client_by_email" on public.trainer_client_invites;

create policy "trainer_client_invites_select_linked"
on public.trainer_client_invites
for select
to authenticated
using (
  trainer_id = auth.uid()
  or lower(client_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
);

create policy "trainer_client_invites_insert_trainer"
on public.trainer_client_invites
for insert
to authenticated
with check (
  trainer_id = auth.uid()
  and current_user_role() = 'trainer'
);

create policy "trainer_client_invites_update_trainer"
on public.trainer_client_invites
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

create policy "trainer_client_invites_select_client_by_email"
on public.trainer_client_invites
for select
to authenticated
using (
  lower(client_email) = lower(coalesce((select email from public.profiles where id = auth.uid()), ''))
);

commit;