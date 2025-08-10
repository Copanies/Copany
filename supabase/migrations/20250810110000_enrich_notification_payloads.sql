-- Enrich notification payloads with issue title and from/to details

-- 1) Update comment trigger to include issue_title in payload
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
  v_issue_title text;
  v_actor uuid := auth.uid();
begin
  -- load issue context
  select created_by, assignee, copany_id, title
    into v_issue_creator, v_issue_assignee, v_issue_copany, v_issue_title
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
        jsonb_build_object(
          'issue_title', coalesce(v_issue_title, ''),
          'preview', left(coalesce(new.content, ''), 120)
        )
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
        jsonb_build_object(
          'issue_title', coalesce(v_issue_title, ''),
          'preview', left(coalesce(new.content, ''), 120)
        )
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
        jsonb_build_object(
          'issue_title', coalesce(v_issue_title, ''),
          'preview', left(coalesce(new.content, ''), 120)
        )
      );
    end if;
  end if;

  return new;
end $$;


-- 2) Update issue update trigger to enrich payloads
create or replace function public.fn_notify_on_issue_update()
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
  -- assignment change
  if new.assignee is distinct from old.assignee then
    -- Resolve user names (may be null)
    if old.assignee is not null then
      select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text)
        into v_from_name
      from auth.users u where u.id = old.assignee;
    else
      v_from_name := 'Unassigned';
    end if;

    if new.assignee is not null then
      select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text)
        into v_to_name
      from auth.users u where u.id = new.assignee;
    else
      v_to_name := 'Unassigned';
    end if;

    if new.assignee is not null and new.assignee <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.assignee,
        v_actor,
        new.copany_id,
        new.id,
        'issue_assigned',
        jsonb_build_object(
          'issue_title', coalesce(new.title, ''),
          'from_user_id', old.assignee,
          'to_user_id', new.assignee,
          'from_user_name', v_from_name,
          'to_user_name', v_to_name
        )
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
        jsonb_build_object(
          'issue_title', coalesce(new.title, ''),
          'from_state', old.state,
          'to_state', new.state
        )
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
        jsonb_build_object(
          'issue_title', coalesce(new.title, ''),
          'from_state', old.state,
          'to_state', new.state
        )
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
        jsonb_build_object(
          'issue_title', coalesce(new.title, ''),
          'from_priority', old.priority,
          'to_priority', new.priority
        )
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
        jsonb_build_object(
          'issue_title', coalesce(new.title, ''),
          'from_level', old.level,
          'to_level', new.level
        )
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
        jsonb_build_object('issue_title', coalesce(new.title, ''))
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
        jsonb_build_object('issue_title', coalesce(new.title, ''))
      );
    end if;
  end if;

  return new;
end $$;

