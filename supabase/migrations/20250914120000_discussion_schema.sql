-- 0) Discussion feature schema: discussion, discussion_vote, discussion_comment
-- This migration follows existing conventions (RLS, constraints, counters, triggers)

-- 1) discussion table
create table if not exists public.discussion (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  copany_id       bigint not null,
  title           text not null,
  description     text,
  creator_id      uuid,
  labels          text[] not null default '{}'::text[],
  issue_id        bigint,
  vote_up_count   integer not null default 0,
  comment_count   integer not null default 0
);

-- FKs
alter table public.discussion
  drop constraint if exists discussion_copany_fkey,
  add constraint discussion_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

alter table public.discussion
  drop constraint if exists discussion_issue_fkey,
  add constraint discussion_issue_fkey
  foreign key (issue_id) references public.issue(id) on update cascade on delete set null;

alter table public.discussion
  drop constraint if exists discussion_creator_fkey,
  add constraint discussion_creator_fkey
  foreign key (creator_id) references auth.users(id) on update cascade on delete set null;

-- Indexes
create index if not exists idx_discussion_copany on public.discussion(copany_id);
create index if not exists idx_discussion_issue on public.discussion(issue_id);

-- RLS & policies
alter table public.discussion enable row level security;

drop policy if exists discussion_select_all on public.discussion;
create policy discussion_select_all
on public.discussion
for select
using (true);

drop policy if exists discussion_insert_auth on public.discussion;
create policy discussion_insert_auth
on public.discussion
for insert
to authenticated
with check (true);

drop policy if exists discussion_update_own on public.discussion;
create policy discussion_update_own
on public.discussion
for update
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

drop policy if exists discussion_delete_own on public.discussion;
create policy discussion_delete_own
on public.discussion
for delete
using ((select auth.uid()) = creator_id);

grant all on table public.discussion to anon;
grant all on table public.discussion to authenticated;
grant all on table public.discussion to service_role;

-- 2) discussion_vote table (similar to stars)
create table if not exists public.discussion_vote (
  id             bigserial primary key,
  created_at     timestamptz not null default now(),
  discussion_id  bigint not null,
  user_id        uuid not null
);

-- FKs
alter table public.discussion_vote
  drop constraint if exists discussion_vote_discussion_fkey,
  add constraint discussion_vote_discussion_fkey
  foreign key (discussion_id) references public.discussion(id) on update cascade on delete cascade;

alter table public.discussion_vote
  drop constraint if exists discussion_vote_user_fkey,
  add constraint discussion_vote_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

-- Indexes & unique
create unique index if not exists idx_discussion_vote_unique
  on public.discussion_vote(discussion_id, user_id);
create index if not exists idx_discussion_vote_discussion
  on public.discussion_vote(discussion_id);

-- RLS & policies
alter table public.discussion_vote enable row level security;

drop policy if exists discussion_vote_select_own on public.discussion_vote;
create policy discussion_vote_select_own
on public.discussion_vote
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists discussion_vote_insert_own on public.discussion_vote;
create policy discussion_vote_insert_own
on public.discussion_vote
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists discussion_vote_delete_own on public.discussion_vote;
create policy discussion_vote_delete_own
on public.discussion_vote
for delete
to authenticated
using (user_id = (select auth.uid()));

grant all on table public.discussion_vote to anon;
grant all on table public.discussion_vote to authenticated;
grant all on table public.discussion_vote to service_role;

-- 3) discussion_comment table (similar to issue_comment)
create table if not exists public.discussion_comment (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  discussion_id bigint,
  content      text,
  created_by   uuid,
  is_edited    boolean not null default false,
  parent_id    bigint
);

-- FKs
alter table public.discussion_comment
  drop constraint if exists discussion_comment_discussion_fkey,
  add constraint discussion_comment_discussion_fkey
  foreign key (discussion_id) references public.discussion(id) on update cascade on delete cascade;

alter table public.discussion_comment
  drop constraint if exists discussion_comment_user_fkey,
  add constraint discussion_comment_user_fkey
  foreign key (created_by) references auth.users(id) on update cascade on delete set null;

alter table public.discussion_comment
  drop constraint if exists discussion_comment_parent_fkey,
  add constraint discussion_comment_parent_fkey
  foreign key (parent_id) references public.discussion_comment(id) on update cascade on delete cascade;

-- Index
create index if not exists idx_discussion_comment_discussion on public.discussion_comment(discussion_id);
create index if not exists idx_discussion_comment_parent on public.discussion_comment(parent_id);

-- RLS & policies
alter table public.discussion_comment enable row level security;

drop policy if exists discussion_comment_select_all on public.discussion_comment;
create policy discussion_comment_select_all
on public.discussion_comment
for select
using (true);

drop policy if exists discussion_comment_insert_auth on public.discussion_comment;
create policy discussion_comment_insert_auth
on public.discussion_comment
for insert
to authenticated
with check (true);

drop policy if exists discussion_comment_update_own on public.discussion_comment;
create policy discussion_comment_update_own
on public.discussion_comment
for update
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists discussion_comment_delete_own on public.discussion_comment;
create policy discussion_comment_delete_own
on public.discussion_comment
for delete
using ((select auth.uid()) = created_by);

grant all on table public.discussion_comment to anon;
grant all on table public.discussion_comment to authenticated;
grant all on table public.discussion_comment to service_role;

-- 4) Counter trigger functions

-- Vote count ++ on discussion_vote insert
create or replace function public.fn_inc_discussion_vote_count()
returns trigger
language plpgsql
as $$
begin
  update public.discussion
  set vote_up_count = vote_up_count + 1
  where id = new.discussion_id;
  return null;
end;
$$;

-- Vote count -- on discussion_vote delete
create or replace function public.fn_dec_discussion_vote_count()
returns trigger
language plpgsql
as $$
begin
  update public.discussion
  set vote_up_count = greatest(vote_up_count - 1, 0)
  where id = old.discussion_id;
  return null;
end;
$$;

drop trigger if exists trg_inc_discussion_vote_count on public.discussion_vote;
create trigger trg_inc_discussion_vote_count
after insert on public.discussion_vote
for each row
execute function public.fn_inc_discussion_vote_count();

drop trigger if exists trg_dec_discussion_vote_count on public.discussion_vote;
create trigger trg_dec_discussion_vote_count
after delete on public.discussion_vote
for each row
execute function public.fn_dec_discussion_vote_count();

-- Comment count ++ on discussion_comment insert
create or replace function public.fn_inc_discussion_comment_count()
returns trigger
language plpgsql
as $$
begin
  update public.discussion
  set comment_count = comment_count + 1
  where id = new.discussion_id;
  return null;
end;
$$;

-- Comment count -- on discussion_comment delete
create or replace function public.fn_dec_discussion_comment_count()
returns trigger
language plpgsql
as $$
begin
  update public.discussion
  set comment_count = greatest(comment_count - 1, 0)
  where id = old.discussion_id;
  return null;
end;
$$;

drop trigger if exists trg_inc_discussion_comment_count on public.discussion_comment;
create trigger trg_inc_discussion_comment_count
after insert on public.discussion_comment
for each row
execute function public.fn_inc_discussion_comment_count();

drop trigger if exists trg_dec_discussion_comment_count on public.discussion_comment;
create trigger trg_dec_discussion_comment_count
after delete on public.discussion_comment
for each row
execute function public.fn_dec_discussion_comment_count();


