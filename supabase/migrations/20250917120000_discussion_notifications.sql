-- Discussion notifications migration
-- This migration adds discussion notification support to the existing notification system
-- It includes new notification types, table schema updates, and trigger functions

-- 1) Add new notification types for discussion features
alter type public.notification_type add value if not exists 'discussion_created';
alter type public.notification_type add value if not exists 'discussion_voted';
alter type public.notification_type add value if not exists 'discussion_comment_created';
alter type public.notification_type add value if not exists 'discussion_comment_voted';
alter type public.notification_type add value if not exists 'discussion_comment_reply';

-- 2) Add discussion-related fields to notification table
alter table public.notification 
  add column if not exists discussion_id bigint,
  add column if not exists discussion_comment_id bigint;

-- 3) Add foreign key constraints for new fields
alter table public.notification
  drop constraint if exists notification_discussion_fkey,
  add constraint notification_discussion_fkey
  foreign key (discussion_id) references public.discussion(id) on update cascade on delete cascade;

alter table public.notification
  drop constraint if exists notification_discussion_comment_fkey,
  add constraint notification_discussion_comment_fkey
  foreign key (discussion_comment_id) references public.discussion_comment(id) on update cascade on delete cascade;

-- 4) Add indexes for new fields
create index if not exists idx_notification_discussion
  on public.notification (discussion_id);
create index if not exists idx_notification_discussion_comment
  on public.notification (discussion_comment_id);

-- 5) Update context constraint to include discussion fields
alter table public.notification
  drop constraint if exists notification_context_check,
  add constraint notification_context_check
  check (
    copany_id is not null or 
    issue_id is not null or 
    comment_id is not null or 
    discussion_id is not null or 
    discussion_comment_id is not null
  );

-- 6) Trigger function: notify on discussion_vote insert
create or replace function public.fn_notify_on_discussion_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discussion_creator uuid;
  v_discussion_title text;
  v_discussion_copany bigint;
  v_actor uuid := auth.uid();
begin
  -- Get discussion info
  select creator_id, title, copany_id
  into v_discussion_creator, v_discussion_title, v_discussion_copany
  from public.discussion
  where id = new.discussion_id;

  -- Notify discussion creator (if not self-vote)
  if v_discussion_creator is not null and v_discussion_creator <> v_actor then
    insert into public.notification(
      user_id, actor_id, copany_id, discussion_id, type, payload
    ) values (
      v_discussion_creator,
      v_actor,
      v_discussion_copany,
      new.discussion_id,
      'discussion_voted',
      jsonb_build_object(
        'discussion_title', coalesce(v_discussion_title, '')
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_discussion_vote on public.discussion_vote;
create trigger trg_notify_on_discussion_vote
after insert on public.discussion_vote
for each row
execute function public.fn_notify_on_discussion_vote();

-- 7) Trigger function: notify on discussion_comment insert
create or replace function public.fn_notify_on_discussion_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discussion_creator uuid;
  v_discussion_title text;
  v_discussion_copany bigint;
  v_parent_author uuid;
  v_actor uuid := auth.uid();
  v_comment_preview text;
begin
  -- Get discussion info
  select creator_id, title, copany_id
  into v_discussion_creator, v_discussion_title, v_discussion_copany
  from public.discussion
  where id = new.discussion_id;

  -- Create comment preview (first 100 chars)
  v_comment_preview := left(coalesce(new.content, ''), 100);

  -- Initialize parent_author to null for non-reply comments
  v_parent_author := null;

  -- If this is a reply to another comment
  if new.parent_id is not null then
    -- Get parent comment author
    select created_by
    into v_parent_author
    from public.discussion_comment
    where id = new.parent_id;

    -- Notify parent comment author (if not self-reply)
    if v_parent_author is not null and v_parent_author <> v_actor then
      insert into public.notification(
        user_id, actor_id, copany_id, discussion_id, discussion_comment_id, type, payload
      ) values (
        v_parent_author,
        v_actor,
        v_discussion_copany,
        new.discussion_id,
        new.id,
        'discussion_comment_reply',
        jsonb_build_object(
          'discussion_title', coalesce(v_discussion_title, ''),
          'preview', v_comment_preview
        )
      );
    end if;
  end if;

  -- Notify discussion creator (if not the commenter and not already notified as parent author)
  if v_discussion_creator is not null 
     and v_discussion_creator <> v_actor 
     and (v_parent_author is null or v_discussion_creator <> v_parent_author) then
    insert into public.notification(
      user_id, actor_id, copany_id, discussion_id, discussion_comment_id, type, payload
    ) values (
      v_discussion_creator,
      v_actor,
      v_discussion_copany,
      new.discussion_id,
      new.id,
      'discussion_comment_created',
      jsonb_build_object(
        'discussion_title', coalesce(v_discussion_title, ''),
        'preview', v_comment_preview
      )
    );
  end if;

  return new;
end;
$$;

-- Drop existing trigger if it exists and recreate it
drop trigger if exists trg_notify_on_discussion_comment on public.discussion_comment;
create trigger trg_notify_on_discussion_comment
after insert on public.discussion_comment
for each row
execute function public.fn_notify_on_discussion_comment();

-- 8) Trigger function: notify on discussion_comment_vote insert
create or replace function public.fn_notify_on_discussion_comment_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_author uuid;
  v_discussion_id bigint;
  v_discussion_title text;
  v_discussion_copany bigint;
  v_actor uuid := auth.uid();
  v_comment_preview text;
begin
  -- Get comment info
  select created_by, discussion_id, left(coalesce(content, ''), 100)
  into v_comment_author, v_discussion_id, v_comment_preview
  from public.discussion_comment
  where id = new.comment_id;

  -- Get discussion info
  if v_discussion_id is not null then
    select title, copany_id
    into v_discussion_title, v_discussion_copany
    from public.discussion
    where id = v_discussion_id;
  end if;

  -- Notify comment author (if not self-vote)
  if v_comment_author is not null and v_comment_author <> v_actor then
    insert into public.notification(
      user_id, actor_id, copany_id, discussion_id, discussion_comment_id, type, payload
    ) values (
      v_comment_author,
      v_actor,
      v_discussion_copany,
      v_discussion_id,
      new.comment_id,
      'discussion_comment_voted',
      jsonb_build_object(
        'discussion_title', coalesce(v_discussion_title, ''),
        'preview', v_comment_preview
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_discussion_comment_vote on public.discussion_comment_vote;
create trigger trg_notify_on_discussion_comment_vote
after insert on public.discussion_comment_vote
for each row
execute function public.fn_notify_on_discussion_comment_vote();

-- 9) Trigger function: notify copany owner on new discussion
create or replace function public.fn_notify_on_discussion_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_copany_owner uuid;
  v_actor uuid := auth.uid();
begin
  -- Get copany owner
  select created_by
  into v_copany_owner
  from public.copany
  where id = new.copany_id;

  -- Notify copany owner (if not self-created)
  if v_copany_owner is not null and v_copany_owner <> v_actor then
    insert into public.notification(
      user_id, actor_id, copany_id, discussion_id, type, payload
    ) values (
      v_copany_owner,
      v_actor,
      new.copany_id,
      new.id,
      'discussion_created',
      jsonb_build_object(
        'discussion_title', coalesce(new.title, '')
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_discussion_create on public.discussion;
create trigger trg_notify_on_discussion_create
after insert on public.discussion
for each row
execute function public.fn_notify_on_discussion_create();
