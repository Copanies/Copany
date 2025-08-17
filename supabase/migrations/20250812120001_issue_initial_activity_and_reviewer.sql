-- Log initial properties on issue create; add owner as reviewer on insert when state = InReview

-- 1) Extend the create trigger function to log initial non-null fields
create or replace function public.fn_log_issue_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_to_name text;
begin
  -- base create event
  insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
  values (
    new.copany_id,
    new.id,
    v_actor,
    'issue_created',
    jsonb_build_object('issue_title', coalesce(new.title, ''))
  );

  -- initial state
  if new.state is not null then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'state_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_state', null,
        'to_state', new.state
      )
    );
  end if;

  -- initial priority
  if new.priority is not null then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'priority_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_priority', null,
        'to_priority', new.priority
      )
    );
  end if;

  -- initial level
  if new.level is not null then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'level_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_level', null,
        'to_level', new.level
      )
    );
  end if;

  -- initial assignee
  if new.assignee is not null then
    select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_to_name from auth.users u where u.id = new.assignee;
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'assignee_changed',
      jsonb_build_object(
        'issue_title', coalesce(new.title, ''),
        'from_user_id', null,
        'to_user_id', new.assignee,
        'from_user_name', 'Unassigned',
        'to_user_name', v_to_name
      )
    );
  end if;

  -- initial closed
  if new.closed_at is not null then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      new.copany_id,
      new.id,
      v_actor,
      'issue_closed',
      jsonb_build_object('issue_title', coalesce(new.title, ''))
    );
  end if;

  return new;
end $$;

-- 2) Reuse reviewer function on INSERT as well
create or replace function public.fn_add_owner_as_reviewer_on_in_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  -- On UPDATE
  if tg_op = 'UPDATE' then
    if new.state = 7 and (old.state is distinct from new.state) then
      select c.created_by into v_owner from public.copany c where c.id = new.copany_id;
      if v_owner is not null then
        insert into public.issue_reviewer (issue_id, reviewer_id, status)
        values (new.id, v_owner, 'requested')
        on conflict (issue_id, reviewer_id) do nothing;
      end if;
    end if;
  else
    -- On INSERT
    if new.state = 7 then
      select c.created_by into v_owner from public.copany c where c.id = new.copany_id;
      if v_owner is not null then
        insert into public.issue_reviewer (issue_id, reviewer_id, status)
        values (new.id, v_owner, 'requested')
        on conflict (issue_id, reviewer_id) do nothing;
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_add_owner_as_reviewer_on_in_review_insert on public.issue;
create trigger trg_add_owner_as_reviewer_on_in_review_insert
after insert on public.issue
for each row execute function public.fn_add_owner_as_reviewer_on_in_review();


