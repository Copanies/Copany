-- Stars (favorite) relation between auth.users and public.copany

-- 0) Add notification type for copany starred
do $$ begin
  alter type public.notification_type add value if not exists 'copany_starred';
exception when duplicate_object then null; end $$;

-- 1) Add star_count column to copany
alter table public.copany
  add column if not exists star_count integer not null default 0;

-- 2) Stars table
create table if not exists public.stars (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid not null,
  copany_id   bigint not null
);

-- 3) FKs
alter table public.stars
  drop constraint if exists stars_user_fkey,
  add constraint stars_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

alter table public.stars
  drop constraint if exists stars_copany_fkey,
  add constraint stars_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

-- 4) Indexes
create unique index if not exists idx_stars_user_copany_unique
  on public.stars (user_id, copany_id);

create index if not exists idx_stars_copany
  on public.stars (copany_id);

-- 5) RLS
alter table public.stars enable row level security;

drop policy if exists stars_select_own on public.stars;
create policy stars_select_own
on public.stars
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists stars_insert_own on public.stars;
create policy stars_insert_own
on public.stars
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists stars_delete_own on public.stars;
create policy stars_delete_own
on public.stars
for delete
to authenticated
using (user_id = auth.uid());

-- 6) Trigger functions for maintaining copany.star_count
create or replace function public.fn_inc_copany_star_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.copany
    set star_count = star_count + 1,
        updated_at = now()
    where id = new.copany_id;
  return new;
end $$;

create or replace function public.fn_dec_copany_star_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.copany
    set star_count = greatest(star_count - 1, 0),
        updated_at = now()
    where id = old.copany_id;
  return old;
end $$;

drop trigger if exists trg_inc_copany_star_count on public.stars;
create trigger trg_inc_copany_star_count
after insert on public.stars
for each row
execute function public.fn_inc_copany_star_count();

drop trigger if exists trg_dec_copany_star_count on public.stars;
create trigger trg_dec_copany_star_count
after delete on public.stars
for each row
execute function public.fn_dec_copany_star_count();

-- 7) Notification trigger on star insert
create or replace function public.fn_notify_on_copany_star()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_actor uuid := auth.uid();
begin
  select created_by into v_owner from public.copany where id = new.copany_id;
  if v_owner is not null and v_owner <> new.user_id then
    insert into public.notification(user_id, actor_id, copany_id, type, payload)
    values (
      v_owner,
      new.user_id,
      new.copany_id,
      'copany_starred',
      '{}'::jsonb
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_copany_star on public.stars;
create trigger trg_notify_on_copany_star
after insert on public.stars
for each row
execute function public.fn_notify_on_copany_star();


