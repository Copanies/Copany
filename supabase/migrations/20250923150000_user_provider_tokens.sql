-- User Provider Tokens: Store OAuth provider access tokens
-- This table stores access tokens for different OAuth providers (GitHub, Google, Figma)
-- to solve the issue where Supabase only stores the most recent provider's token

-- 1) Main table
create table if not exists public.user_provider_tokens (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_id       uuid not null,
  provider      text not null check (provider in ('github', 'google', 'figma')),
  access_token  text not null,
  token_type    text not null default 'bearer',
  expires_at    timestamptz,
  scope         text,
  refresh_token text
);

-- 2) FKs
alter table public.user_provider_tokens
  add constraint user_provider_tokens_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

-- 3) Indexes
create unique index if not exists idx_user_provider_tokens_user_provider_unique
  on public.user_provider_tokens (user_id, provider);

create index if not exists idx_user_provider_tokens_user_id
  on public.user_provider_tokens (user_id);

create index if not exists idx_user_provider_tokens_provider
  on public.user_provider_tokens (provider);

-- 4) RLS
alter table public.user_provider_tokens enable row level security;

-- Users can only access their own tokens
drop policy if exists "user_provider_tokens_select_own" on public.user_provider_tokens;
create policy "user_provider_tokens_select_own"
on public.user_provider_tokens
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_provider_tokens_insert_own" on public.user_provider_tokens;
create policy "user_provider_tokens_insert_own"
on public.user_provider_tokens
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_provider_tokens_update_own" on public.user_provider_tokens;
create policy "user_provider_tokens_update_own"
on public.user_provider_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_provider_tokens_delete_own" on public.user_provider_tokens;
create policy "user_provider_tokens_delete_own"
on public.user_provider_tokens
for delete
to authenticated
using (user_id = auth.uid());

-- 5) Trigger for updated_at
create or replace function public.fn_update_user_provider_tokens_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_user_provider_tokens_updated_at on public.user_provider_tokens;
create trigger trigger_update_user_provider_tokens_updated_at
  before update on public.user_provider_tokens
  for each row
  execute function public.fn_update_user_provider_tokens_updated_at();

-- 6) Helper function to upsert provider token
create or replace function public.fn_upsert_user_provider_token(
  p_user_id uuid,
  p_provider text,
  p_access_token text,
  p_token_type text default 'bearer',
  p_expires_at timestamptz default null,
  p_scope text default null,
  p_refresh_token text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_provider_tokens (
    user_id, provider, access_token, token_type, expires_at, scope, refresh_token
  ) values (
    p_user_id, p_provider, p_access_token, p_token_type, p_expires_at, p_scope, p_refresh_token
  )
  on conflict (user_id, provider)
  do update set
    access_token = excluded.access_token,
    token_type = excluded.token_type,
    expires_at = excluded.expires_at,
    scope = excluded.scope,
    refresh_token = excluded.refresh_token,
    updated_at = now();
end;
$$;

-- 7) Helper function to get provider token
create or replace function public.fn_get_user_provider_token(
  p_user_id uuid,
  p_provider text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
begin
  select access_token into token
  from public.user_provider_tokens
  where user_id = p_user_id and provider = p_provider;
  
  return token;
end;
$$;
