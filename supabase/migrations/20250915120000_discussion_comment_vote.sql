-- Discussion comment vote schema
-- This migration creates discussion_comment_vote table for supporting upvote feature on comments
-- Similar to discussion_vote but for individual comments

-- 1) discussion_comment_vote table (similar to discussion_vote)
create table if not exists public.discussion_comment_vote (
  id               bigserial primary key,
  created_at       timestamptz not null default now(),
  comment_id       bigint not null,
  user_id          uuid not null
);

-- Add vote_up_count column to discussion_comment table if not exists
alter table public.discussion_comment 
  add column if not exists vote_up_count integer not null default 0;

-- FKs for discussion_comment_vote
alter table public.discussion_comment_vote
  drop constraint if exists discussion_comment_vote_comment_fkey,
  add constraint discussion_comment_vote_comment_fkey
  foreign key (comment_id) references public.discussion_comment(id) on update cascade on delete cascade;

alter table public.discussion_comment_vote
  drop constraint if exists discussion_comment_vote_user_fkey,
  add constraint discussion_comment_vote_user_fkey
  foreign key (user_id) references auth.users(id) on update cascade on delete cascade;

-- Indexes & unique for discussion_comment_vote
create unique index if not exists idx_discussion_comment_vote_unique
  on public.discussion_comment_vote(comment_id, user_id);
create index if not exists idx_discussion_comment_vote_comment
  on public.discussion_comment_vote(comment_id);

-- RLS & policies for discussion_comment_vote
alter table public.discussion_comment_vote enable row level security;

drop policy if exists discussion_comment_vote_select_own on public.discussion_comment_vote;
create policy discussion_comment_vote_select_own
on public.discussion_comment_vote
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists discussion_comment_vote_insert_own on public.discussion_comment_vote;
create policy discussion_comment_vote_insert_own
on public.discussion_comment_vote
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists discussion_comment_vote_delete_own on public.discussion_comment_vote;
create policy discussion_comment_vote_delete_own
on public.discussion_comment_vote
for delete
to authenticated
using (user_id = (select auth.uid()));

grant all on table public.discussion_comment_vote to anon;
grant all on table public.discussion_comment_vote to authenticated;
grant all on table public.discussion_comment_vote to service_role;

-- Function to update vote count on discussion_comment
create or replace function public.update_discussion_comment_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.discussion_comment
    set vote_up_count = vote_up_count + 1,
        updated_at = now()
    where id = NEW.comment_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.discussion_comment
    set vote_up_count = greatest(0, vote_up_count - 1),
        updated_at = now()
    where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$$;

-- Trigger to automatically update vote count
drop trigger if exists discussion_comment_vote_count_trigger on public.discussion_comment_vote;
create trigger discussion_comment_vote_count_trigger
  after insert or delete on public.discussion_comment_vote
  for each row execute function update_discussion_comment_vote_count();
