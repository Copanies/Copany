-- De-duplicate noisy issue activity when rapid consecutive updates occur
-- Strategy: Before inserting an activity, check if the last activity of the same
-- type for the same issue already records the same target value within a short window.

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
    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'title_changed'
        and ia.payload->>'to_title' = coalesce(new.title, '')
        and ia.created_at >= now() - interval '5 seconds'
    ) then
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
  end if;

  -- state change
  if new.state is distinct from old.state then
    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'state_changed'
        and (ia.payload->>'to_state')::int = new.state
        and ia.created_at >= now() - interval '5 seconds'
    ) then
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
  end if;

  -- priority change
  if new.priority is distinct from old.priority then
    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'priority_changed'
        and (ia.payload->>'to_priority')::int = new.priority
        and ia.created_at >= now() - interval '5 seconds'
    ) then
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
  end if;

  -- level change
  if new.level is distinct from old.level then
    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'level_changed'
        and (ia.payload->>'to_level')::int = new.level
        and ia.created_at >= now() - interval '5 seconds'
    ) then
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

    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'assignee_changed'
        and ia.payload->>'to_user_id' = coalesce(new.assignee::text, 'null')
        and ia.created_at >= now() - interval '5 seconds'
    ) then
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
  end if;

  -- closed
  if new.closed_at is not null and (old.closed_at is null) then
    if not exists (
      select 1 from public.issue_activity ia
      where ia.issue_id = new.id
        and ia.type = 'issue_closed'
        and ia.created_at >= now() - interval '5 seconds'
    ) then
      insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
      values (
        new.copany_id,
        new.id,
        v_actor,
        'issue_closed',
        jsonb_build_object('issue_title', coalesce(new.title, ''))
      );
    end if;
  end if;

  return new;
end $$;


