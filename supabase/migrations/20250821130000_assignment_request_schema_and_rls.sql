-- Assignment Request: Schema and RLS (merged)

-- 1) Enum for assignment request status (ensure base values and 'skipped')
do $$ begin
  create type public.assignment_request_status as enum ('requested', 'accepted', 'refused');
exception
  when duplicate_object then null;
end $$;

alter type public.assignment_request_status add value if not exists 'skipped';

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

-- 4) Foreign keys
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

-- 5) Indexes (final design uses a partial unique index, no strict unique constraint)
create index if not exists idx_issue_assignment_request_issue on public.issue_assignment_request (issue_id);
create index if not exists idx_issue_assignment_request_issue_status on public.issue_assignment_request (issue_id, status);

-- Drop legacy strict unique constraint if present
alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_unique;

-- At most one in-progress (requested) row per (issue, requester, recipient)
create unique index if not exists uniq_issue_assignment_request_requested
on public.issue_assignment_request (issue_id, requester_id, recipient_id)
where status = 'requested';

-- 6) RLS
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

-- 7) Extend notification types required by triggers/flows
do $$ begin
  alter type public.notification_type add value if not exists 'assignment_request_received';
  alter type public.notification_type add value if not exists 'assignment_request_accepted';
  alter type public.notification_type add value if not exists 'assignment_request_refused';
  alter type public.notification_type add value if not exists 'review_requested';
  alter type public.notification_type add value if not exists 'review_approved';
exception when duplicate_object then null; end $$;


