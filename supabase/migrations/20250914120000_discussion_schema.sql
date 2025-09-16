-- Discussion feature schema with labels support
-- This migration creates discussion, discussion_vote, discussion_comment, and discussion_label tables
-- It also includes the necessary triggers and functions

-- 1) discussion table
create table if not exists public.discussion (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  copany_id       bigint not null,
  title           text not null,
  description     text,
  creator_id      uuid,
  labels          bigint[] not null default '{}'::bigint[],
  issue_id        bigint,
  vote_up_count   integer not null default 0,
  comment_count   integer not null default 0
);

-- FKs for discussion
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

-- Indexes for discussion
create index if not exists idx_discussion_copany on public.discussion(copany_id);
create index if not exists idx_discussion_issue on public.discussion(issue_id);

-- RLS & policies for discussion
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

-- FKs for discussion_vote
alter table public.discussion_vote
  drop constraint if exists discussion_vote_discussion_fkey,
  add constraint discussion_vote_discussion_fkey
  foreign key (discussion_id) references public.discussion(id) on update cascade on delete cascade;

alter table public.discussion_vote
  drop constraint if exists discussion_vote_user_fkey,
  add constraint discussion_vote_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

-- Indexes & unique for discussion_vote
create unique index if not exists idx_discussion_vote_unique
  on public.discussion_vote(discussion_id, user_id);
create index if not exists idx_discussion_vote_discussion
  on public.discussion_vote(discussion_id);

-- RLS & policies for discussion_vote
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
  parent_id    bigint,
  deleted_at   timestamptz
);

-- FKs for discussion_comment
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
  foreign key (parent_id) references public.discussion_comment(id) on update cascade on delete set null;

-- Index for discussion_comment
create index if not exists idx_discussion_comment_discussion on public.discussion_comment(discussion_id);
create index if not exists idx_discussion_comment_parent on public.discussion_comment(parent_id);

-- RLS & policies for discussion_comment
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

-- 4) discussion_label table
create table if not exists public.discussion_label (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  copany_id       bigint not null,
  creator_id      uuid not null,
  name            text not null,
  color           text not null default '#6B7280', -- Default gray color
  description     text
);

-- FKs
alter table public.discussion_label
  drop constraint if exists discussion_label_copany_fkey,
  add constraint discussion_label_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

alter table public.discussion_label
  drop constraint if exists discussion_label_creator_fkey,
  add constraint discussion_label_creator_fkey
  foreign key (creator_id) references auth.users(id) on update cascade on delete cascade;

-- Indexes
create index if not exists idx_discussion_label_copany on public.discussion_label(copany_id);
create unique index if not exists idx_discussion_label_copany_name 
  on public.discussion_label(copany_id, name);

-- RLS & policies
alter table public.discussion_label enable row level security;

drop policy if exists discussion_label_select_all on public.discussion_label;
create policy discussion_label_select_all
on public.discussion_label
for select
using (true);

drop policy if exists discussion_label_insert_auth on public.discussion_label;
create policy discussion_label_insert_auth
on public.discussion_label
for insert
to authenticated
with check (true);

drop policy if exists discussion_label_update_auth on public.discussion_label;
create policy discussion_label_update_auth
on public.discussion_label
for update
to authenticated
using (true)
with check (true);

drop policy if exists discussion_label_delete_auth on public.discussion_label;
create policy discussion_label_delete_auth
on public.discussion_label
for delete
to authenticated
using (true);

grant all on table public.discussion_label to anon;
grant all on table public.discussion_label to authenticated;
grant all on table public.discussion_label to service_role;

-- 5) Counter trigger functions for discussion voting and commenting

-- Vote count ++ on discussion_vote insert
create or replace function public.fn_inc_discussion_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.discussion
  set vote_up_count = vote_up_count + 1,
      updated_at = now()
  where id = new.discussion_id;
  return new;
end;
$$;

-- Vote count -- on discussion_vote delete
create or replace function public.fn_dec_discussion_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.discussion
  set vote_up_count = greatest(vote_up_count - 1, 0),
      updated_at = now()
  where id = old.discussion_id;
  return old;
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

-- Function to update discussion comment count based on soft delete status
-- This function counts only non-deleted comments (where deleted_at IS NULL)
create or replace function public.fn_update_discussion_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discussion_id bigint;
  v_total_count integer;
begin
  -- Get the discussion_id from either NEW or OLD record
  if TG_OP = 'INSERT' then
    v_discussion_id := NEW.discussion_id;
  elsif TG_OP = 'UPDATE' then
    v_discussion_id := COALESCE(NEW.discussion_id, OLD.discussion_id);
  else
    v_discussion_id := OLD.discussion_id;
  end if;
  
  -- Count all non-deleted comments for this discussion (including nested replies)
  select count(*)
  into v_total_count
  from public.discussion_comment
  where discussion_id = v_discussion_id 
    and deleted_at IS NULL;
  
  -- Update the discussion table with the correct count
  update public.discussion
  set comment_count = v_total_count,
      updated_at = now()
  where id = v_discussion_id;
  
  if TG_OP = 'INSERT' then
    return NEW;
  elsif TG_OP = 'UPDATE' then
    return NEW;
  else
    return OLD;
  end if;
end;
$$;

-- Create triggers that handle insert, update (for soft delete), and physical delete
drop trigger if exists trg_inc_discussion_comment_count on public.discussion_comment;
drop trigger if exists trg_dec_discussion_comment_count on public.discussion_comment;
create trigger trg_update_discussion_comment_count
after insert or update or delete on public.discussion_comment
for each row
execute function public.fn_update_discussion_comment_count();

-- 6) Function to create default discussion labels for a new copany
create or replace function public.fn_create_default_discussion_labels(
  p_copany_id bigint,
  p_creator_id uuid
)
returns void
language plpgsql
as $$
begin
  -- Create default discussion labels
  insert into public.discussion_label (copany_id, creator_id, name, color, description)
  values 
    (p_copany_id, p_creator_id, 'Begin idea', '#323231', 'Ideas for starting the copany'),
    (p_copany_id, p_creator_id, 'New idea', '#447FFF', 'Fresh ideas and suggestions'),
    (p_copany_id, p_creator_id, 'BUG', '#D1401C', 'Bug reports and issues');
end;
$$;

-- 7) Trigger to automatically create default labels when a copany is created
create or replace function public.fn_trigger_create_default_discussion_labels()
returns trigger
language plpgsql
as $$
begin
  perform public.fn_create_default_discussion_labels(new.id, new.created_by);
  return new;
end;
$$;

drop trigger if exists trg_create_default_discussion_labels on public.copany;
drop trigger if exists trg_create_default_discussion_content on public.copany;
create trigger trg_create_default_discussion_labels
after insert on public.copany
for each row
execute function public.fn_trigger_create_default_discussion_labels();

-- 8) Update existing discussions to have correct comment counts (only non-deleted comments)
-- This ensures any existing data has the correct counts
update public.discussion
set comment_count = (
  select count(*)
  from public.discussion_comment dc
  where dc.discussion_id = discussion.id
    and dc.deleted_at IS NULL
);
