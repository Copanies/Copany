-- Issue Reviewer: schema, RLS and triggers

-- 1) Enum for reviewer status
do $$ begin
  create type public.reviewer_status as enum ('requested', 'approved');
exception
  when duplicate_object then null;
end $$;

-- 2) Extend issue_activity_type enum
do $$ begin
  alter type public.issue_activity_type add value if not exists 'review_requested';
  alter type public.issue_activity_type add value if not exists 'review_approved';
exception
  when duplicate_object then null;
end $$;

-- 3) Main table
create table if not exists public.issue_reviewer (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  issue_id     bigint not null,
  reviewer_id  uuid not null,
  status       public.reviewer_status not null default 'requested'
);

-- 4) FKs
alter table public.issue_reviewer
  drop constraint if exists issue_reviewer_issue_fkey,
  add constraint issue_reviewer_issue_fkey
  foreign key (issue_id) references public.issue(id) on update cascade on delete cascade;

alter table public.issue_reviewer
  drop constraint if exists issue_reviewer_reviewer_fkey,
  add constraint issue_reviewer_reviewer_fkey
  foreign key (reviewer_id) references auth.users(id) on update cascade on delete cascade;

-- 5) Unique to prevent duplicates
alter table public.issue_reviewer
  drop constraint if exists issue_reviewer_unique_issue_reviewer,
  add constraint issue_reviewer_unique_issue_reviewer unique (issue_id, reviewer_id);

-- 6) Indexes
create index if not exists idx_issue_reviewer_issue on public.issue_reviewer (issue_id);
create index if not exists idx_issue_reviewer_issue_status on public.issue_reviewer (issue_id, status);

-- 7) RLS
alter table public.issue_reviewer enable row level security;

-- Select readable to anyone (public)
drop policy if exists "issue_reviewer_select_all" on public.issue_reviewer;
create policy "issue_reviewer_select_all"
on public.issue_reviewer
for select
to public
using (true);

-- Insert allowed to authenticated for now (will be constrained by app logic and triggers)
drop policy if exists "issue_reviewer_insert_authenticated" on public.issue_reviewer;
create policy "issue_reviewer_insert_authenticated"
on public.issue_reviewer
for insert
to authenticated
with check (true);

-- Update allowed only to the reviewer themself
drop policy if exists "issue_reviewer_update_self" on public.issue_reviewer;
create policy "issue_reviewer_update_self"
on public.issue_reviewer
for update
to authenticated
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

-- 8) Triggers: updated_at maintainer
create or replace function public.fn_issue_reviewer_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_issue_reviewer_touch_updated_at on public.issue_reviewer;
create trigger trg_issue_reviewer_touch_updated_at
before update on public.issue_reviewer
for each row execute function public.fn_issue_reviewer_touch_updated_at();

-- 9) Activity logging triggers
create or replace function public.fn_log_review_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
  v_reviewer_name text := '';
begin
  -- try best-effort enrichments
  select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
  select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_reviewer_name from auth.users u where u.id = new.reviewer_id;

  insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
  values (
    (select i.copany_id from public.issue i where i.id = new.issue_id),
    new.issue_id,
    v_actor,
    'review_requested',
    jsonb_build_object('issue_title', v_issue_title, 'reviewer_id', new.reviewer_id, 'reviewer_name', v_reviewer_name)
  );
  return new;
end $$;

drop trigger if exists trg_log_review_requested on public.issue_reviewer;
create trigger trg_log_review_requested
after insert on public.issue_reviewer
for each row execute function public.fn_log_review_requested();

create or replace function public.fn_log_review_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
  v_reviewer_name text := '';
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
    select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_reviewer_name from auth.users u where u.id = new.reviewer_id;
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      (select i.copany_id from public.issue i where i.id = new.issue_id),
      new.issue_id,
      v_actor,
      'review_approved',
      jsonb_build_object('issue_title', v_issue_title, 'reviewer_id', new.reviewer_id, 'reviewer_name', v_reviewer_name)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_log_review_approved on public.issue_reviewer;
create trigger trg_log_review_approved
after update of status on public.issue_reviewer
for each row execute function public.fn_log_review_approved();

-- 10) Auto-add Copany owner as reviewer when Issue enters In Review
create or replace function public.fn_add_owner_as_reviewer_on_in_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if new.state = 7 and (old.state is distinct from new.state) then -- 7 = InReview
    select c.created_by into v_owner from public.copany c where c.id = new.copany_id;
    if v_owner is not null then
      insert into public.issue_reviewer (issue_id, reviewer_id, status)
      values (new.id, v_owner, 'requested')
      on conflict (issue_id, reviewer_id) do nothing;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_add_owner_as_reviewer_on_in_review on public.issue;
create trigger trg_add_owner_as_reviewer_on_in_review
after update of state on public.issue
for each row execute function public.fn_add_owner_as_reviewer_on_in_review();


