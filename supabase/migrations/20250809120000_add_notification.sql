-- Notification table, RLS and triggers

-- 1) Enum for notification types
do $$ begin
  create type public.notification_type as enum (
    'comment_reply',
    'new_comment',
    'issue_assigned',
    'issue_state_changed',
    'issue_priority_changed',
    'issue_level_changed',
    'issue_closed',
    'mention'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Main table
create table if not exists public.notification (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  user_id       uuid not null,
  actor_id      uuid,
  copany_id     bigint,
  issue_id      bigint,
  comment_id    bigint,
  type          public.notification_type not null,
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  is_read       boolean generated always as (read_at is not null) stored
);

-- 3) FKs
alter table public.notification
  drop constraint if exists notification_user_fkey,
  add constraint notification_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

alter table public.notification
  drop constraint if exists notification_actor_fkey,
  add constraint notification_actor_fkey
  foreign key (actor_id) references auth.users(id) on update cascade on delete set null;

alter table public.notification
  drop constraint if exists notification_copany_fkey,
  add constraint notification_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

alter table public.notification
  drop constraint if exists notification_issue_fkey,
  add constraint notification_issue_fkey
  foreign key (issue_id) references public.issue(id) on update cascade on delete cascade;

alter table public.notification
  drop constraint if exists notification_comment_fkey,
  add constraint notification_comment_fkey
  foreign key (comment_id) references public.issue_comment(id) on update cascade on delete cascade;

-- 4) Indexes
create index if not exists idx_notification_user_created_at
  on public.notification (user_id, created_at desc);

create index if not exists idx_notification_user_unread
  on public.notification (user_id)
  where read_at is null;

-- 5) Context constraint: require at least one of copany/issue/comment
alter table public.notification
  drop constraint if exists notification_context_check,
  add constraint notification_context_check
  check (copany_id is not null or issue_id is not null or comment_id is not null);

-- 6) RLS
alter table public.notification enable row level security;

drop policy if exists "notification_select_own" on public.notification;
create policy "notification_select_own"
on public.notification
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notification_update_own" on public.notification;
create policy "notification_update_own"
on public.notification
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Ensure only service role can insert directly; inserts normally come from triggers
revoke insert on public.notification from authenticated, anon;
grant insert on public.notification to service_role;

-- 7) Trigger functions

-- Function: notify on issue_comment insert
create or replace function public.fn_notify_on_issue_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
  v_issue_creator uuid;
  v_issue_assignee uuid;
  v_issue_copany bigint;
  v_actor uuid := auth.uid();
begin
  -- load issue context
  select created_by, assignee, copany_id
    into v_issue_creator, v_issue_assignee, v_issue_copany
  from public.issue where id = new.issue_id;

  -- reply -> notify parent comment author
  if new.parent_id is not null then
    select created_by into v_parent_author from public.issue_comment where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.created_by then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, comment_id, type, payload)
      values (
        v_parent_author,
        new.created_by,
        v_issue_copany,
        new.issue_id,
        new.id,
        'comment_reply',
        jsonb_build_object('preview', left(coalesce(new.content, ''), 120))
      );
    end if;
  else
    -- top-level comment -> notify issue creator and assignee (dedupe and exclude self)
    if v_issue_creator is not null and v_issue_creator <> new.created_by then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, comment_id, type, payload)
      values (
        v_issue_creator,
        new.created_by,
        v_issue_copany,
        new.issue_id,
        new.id,
        'new_comment',
        jsonb_build_object('preview', left(coalesce(new.content, ''), 120))
      );
    end if;

    if v_issue_assignee is not null and v_issue_assignee <> new.created_by and v_issue_assignee <> v_issue_creator then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, comment_id, type, payload)
      values (
        v_issue_assignee,
        new.created_by,
        v_issue_copany,
        new.issue_id,
        new.id,
        'new_comment',
        jsonb_build_object('preview', left(coalesce(new.content, ''), 120))
      );
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_notify_on_issue_comment on public.issue_comment;
create trigger trg_notify_on_issue_comment
after insert on public.issue_comment
for each row
execute function public.fn_notify_on_issue_comment();


-- Function: notify on issue updates
create or replace function public.fn_notify_on_issue_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- assignment change
  if new.assignee is distinct from old.assignee and new.assignee is not null then
    if new.assignee <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_assigned',
        jsonb_build_object('title', coalesce(new.title, ''), 'from', old.assignee, 'to', new.assignee)
      );
    end if;
  end if;

  -- state change
  if new.state is distinct from old.state then
    if new.created_by is not null and new.created_by <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.created_by,
        v_actor,
        new.copany_id,
        new.id,
        'issue_state_changed',
        jsonb_build_object('from', old.state, 'to', new.state)
      );
    end if;
    if new.assignee is not null and new.assignee <> v_actor and new.assignee <> new.created_by then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_state_changed',
        jsonb_build_object('from', old.state, 'to', new.state)
      );
    end if;
  end if;

  -- priority change
  if new.priority is distinct from old.priority then
    if new.assignee is not null and new.assignee <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_priority_changed',
        jsonb_build_object('from', old.priority, 'to', new.priority)
      );
    end if;
  end if;

  -- level change
  if new.level is distinct from old.level then
    if new.assignee is not null and new.assignee <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_level_changed',
        jsonb_build_object('from', old.level, 'to', new.level)
      );
    end if;
  end if;

  -- closed
  if new.closed_at is not null and (old.closed_at is null) then
    if new.created_by is not null and new.created_by <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.created_by,
        v_actor,
        new.copany_id,
        new.id,
        'issue_closed',
        jsonb_build_object('title', coalesce(new.title, ''))
      );
    end if;
    if new.assignee is not null and new.assignee <> v_actor and new.assignee <> new.created_by then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_closed',
        jsonb_build_object('title', coalesce(new.title, ''))
      );
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_notify_on_issue_update on public.issue;
create trigger trg_notify_on_issue_update
after update of state, priority, level, assignee, closed_at on public.issue
for each row
execute function public.fn_notify_on_issue_update();

