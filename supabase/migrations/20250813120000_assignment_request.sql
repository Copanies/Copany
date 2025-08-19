-- Assignment Request: schema, RLS, and activity triggers

-- 1) Enum for assignment request status
do $$ begin
  create type public.assignment_request_status as enum ('requested', 'accepted', 'refused');
exception
  when duplicate_object then null;
end $$;

-- 2) Extend issue_activity_type enum for assignment request events
do $$ begin
  alter type public.issue_activity_type add value if not exists 'assignment_requested';
  alter type public.issue_activity_type add value if not exists 'assignment_request_accepted';
  alter type public.issue_activity_type add value if not exists 'assignment_request_refused';
exception
  when duplicate_object then null;
end $$;

-- 3) Main table
create table if not exists public.issue_assignment_request (
  id             bigserial primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  issue_id       bigint not null,
  requester_id   uuid not null,
  recipient_id   uuid not null,
  message        text,
  status         public.assignment_request_status not null default 'requested'
);

-- 4) FKs
alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_issue_fkey,
  add constraint issue_assignment_request_issue_fkey
  foreign key (issue_id) references public.issue(id) on update cascade on delete cascade;

alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_requester_fkey,
  add constraint issue_assignment_request_requester_fkey
  foreign key (requester_id) references auth.users(id) on update cascade on delete cascade;

alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_recipient_fkey,
  add constraint issue_assignment_request_recipient_fkey
  foreign key (recipient_id) references auth.users(id) on update cascade on delete cascade;

-- 5) Uniqueness per (issue, requester, recipient)
alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_unique,
  add constraint issue_assignment_request_unique unique (issue_id, requester_id, recipient_id);

-- 6) Indexes
create index if not exists idx_issue_assignment_request_issue on public.issue_assignment_request (issue_id);
create index if not exists idx_issue_assignment_request_issue_status on public.issue_assignment_request (issue_id, status);

-- 7) RLS
alter table public.issue_assignment_request enable row level security;

-- Allow select for anyone (public) to render timeline
drop policy if exists "issue_assignment_request_select_all" on public.issue_assignment_request;
create policy "issue_assignment_request_select_all"
on public.issue_assignment_request
for select
to public
using (true);

-- Allow insert for authenticated users only when they are the requester
drop policy if exists "issue_assignment_request_insert_self" on public.issue_assignment_request;
create policy "issue_assignment_request_insert_self"
on public.issue_assignment_request
for insert
to authenticated
with check (auth.uid() = requester_id);

-- Allow update for authenticated users only when they are the recipient
drop policy if exists "issue_assignment_request_update_recipient" on public.issue_assignment_request;
create policy "issue_assignment_request_update_recipient"
on public.issue_assignment_request
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

-- 8) Triggers: updated_at maintainer
create or replace function public.fn_issue_assignment_request_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_issue_assignment_request_touch_updated_at on public.issue_assignment_request;
create trigger trg_issue_assignment_request_touch_updated_at
before update on public.issue_assignment_request
for each row execute function public.fn_issue_assignment_request_touch_updated_at();

-- 9) Activity logging triggers
create or replace function public.fn_log_assignment_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
  v_requester_name text := '';
  v_recipient_name text := '';
begin
  select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
  select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_requester_name from auth.users u where u.id = new.requester_id;
  select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_recipient_name from auth.users u where u.id = new.recipient_id;

  insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
  values (
    (select i.copany_id from public.issue i where i.id = new.issue_id),
    new.issue_id,
    v_actor,
    'assignment_requested',
    jsonb_build_object(
      'issue_title', v_issue_title,
      'requester_id', new.requester_id,
      'requester_name', v_requester_name,
      'recipient_id', new.recipient_id,
      'recipient_name', v_recipient_name
    )
  );
  return new;
end $$;

drop trigger if exists trg_log_assignment_requested on public.issue_assignment_request;
create trigger trg_log_assignment_requested
after insert on public.issue_assignment_request
for each row execute function public.fn_log_assignment_requested();

create or replace function public.fn_log_assignment_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
  v_requester_name text := '';
  v_recipient_name text := '';
begin
  if new.status is distinct from old.status then
    select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
    select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_requester_name from auth.users u where u.id = new.requester_id;
    select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_recipient_name from auth.users u where u.id = new.recipient_id;
    if new.status = 'accepted' then
      insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
      values (
        (select i.copany_id from public.issue i where i.id = new.issue_id),
        new.issue_id,
        v_actor,
        'assignment_request_accepted',
        jsonb_build_object(
          'issue_title', v_issue_title,
          'requester_id', new.requester_id,
          'requester_name', v_requester_name,
          'recipient_id', new.recipient_id,
          'recipient_name', v_recipient_name
        )
      );
    elsif new.status = 'refused' then
      insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
      values (
        (select i.copany_id from public.issue i where i.id = new.issue_id),
        new.issue_id,
        v_actor,
        'assignment_request_refused',
        jsonb_build_object(
          'issue_title', v_issue_title,
          'requester_id', new.requester_id,
          'requester_name', v_requester_name,
          'recipient_id', new.recipient_id,
          'recipient_name', v_recipient_name
        )
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_log_assignment_request_status_change on public.issue_assignment_request;
create trigger trg_log_assignment_request_status_change
after update of status on public.issue_assignment_request
for each row execute function public.fn_log_assignment_request_status_change();


