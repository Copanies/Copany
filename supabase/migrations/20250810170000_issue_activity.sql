-- Issue Activity: schema, RLS and triggers

-- 1) Enum for issue activity types
do $$ begin
  create type public.issue_activity_type as enum (
    'issue_created',
    'title_changed',
    'state_changed',
    'priority_changed',
    'level_changed',
    'assignee_changed',
    'issue_closed'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Main table
create table if not exists public.issue_activity (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  copany_id    bigint,
  issue_id     bigint not null,
  actor_id     uuid,
  type         public.issue_activity_type not null,
  payload      jsonb not null default '{}'::jsonb
);

-- 3) FKs
alter table public.issue_activity
  drop constraint if exists issue_activity_issue_fkey,
  add constraint issue_activity_issue_fkey
  foreign key (issue_id) references public.issue(id) on update cascade on delete cascade;

alter table public.issue_activity
  drop constraint if exists issue_activity_copany_fkey,
  add constraint issue_activity_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete set null;

alter table public.issue_activity
  drop constraint if exists issue_activity_actor_fkey,
  add constraint issue_activity_actor_fkey
  foreign key (actor_id) references auth.users(id) on update cascade on delete set null;

-- 4) Indexes
create index if not exists idx_issue_activity_issue_created_at
  on public.issue_activity (issue_id, created_at asc);

create index if not exists idx_issue_activity_copany_created_at
  on public.issue_activity (copany_id, created_at desc);

-- 5) RLS
alter table public.issue_activity enable row level security;

-- Allow select for ANYONE (authenticated or anon)
drop policy if exists "issue_activity_select_all" on public.issue_activity;
create policy "issue_activity_select_all"
on public.issue_activity
for select
to public
using (true);

-- Inserts come from triggers; prevent direct insert (except service role)
revoke insert on public.issue_activity from authenticated, anon;
grant insert on public.issue_activity to service_role;

-- 6) Trigger functions

-- Function: log on issue create
create or replace function public.fn_log_issue_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
  values (
    new.copany_id,
    new.id,
    v_actor,
    'issue_created',
    jsonb_build_object('issue_title', coalesce(new.title, ''))
  );
  return new;
end $$;

drop trigger if exists trg_log_issue_create on public.issue;
create trigger trg_log_issue_create
after insert on public.issue
for each row
execute function public.fn_log_issue_create();


-- Function: log on issue update
create or replace function public.fn_log_issue_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_from_name text;
  v_to_name text;
begin
  -- title change
  if new.title is distinct from old.title then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'title_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_title', coalesce(old.title, ''),
        'to_title', coalesce(new.title, '')
      )
    );
  end if;

  -- state change
  if new.state is distinct from old.state then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'state_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_state', old.state,
        'to_state', new.state
      )
    );
  end if;

  -- priority change
  if new.priority is distinct from old.priority then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'priority_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_priority', old.priority,
        'to_priority', new.priority
      )
    );
  end if;

  -- level change
  if new.level is distinct from old.level then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'level_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_level', old.level,
        'to_level', new.level
      )
    );
  end if;

  -- assignee change (enrich names)
  if new.assignee is distinct from old.assignee then
    if old.assignee is not null then
      select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_from_name from auth.users u where u.id = old.assignee;
    else
      v_from_name := 'Unassigned';
    end if;
    if new.assignee is not null then
      select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_to_name from auth.users u where u.id = new.assignee;
    else
      v_to_name := 'Unassigned';
    end if;
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'assignee_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_user_id', old.assignee,
        'to_user_id', new.assignee,
        'from_user_name', v_from_name,
        'to_user_name', v_to_name
      )
    );
  end if;

  -- closed
  if new.closed_at is not null and (old.closed_at is null) then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'issue_closed',
      jsonb_build_object('issue_title', coalesce(new.title, ''))
    );
  end if;

  return new;
end $$;

drop trigger if exists trg_log_issue_update on public.issue;
create trigger trg_log_issue_update
after update of title, state, priority, level, assignee, closed_at on public.issue
for each row
execute function public.fn_log_issue_update();

