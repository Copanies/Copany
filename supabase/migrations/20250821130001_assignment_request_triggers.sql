-- Assignment Request: Triggers (merged)

-- Clean up deprecated auto-refuse behavior if it exists
drop trigger if exists trg_auto_refuse_other_assignment_requests on public.issue_assignment_request;
drop function if exists public.fn_auto_refuse_other_assignment_requests();

-- 1) updated_at maintainer
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

-- 2) Activity: assignment requested (deduplicated, simplified payload)
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
begin
  select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
  select coalesce(u.raw_user_meta_data->>'name', u.email, u.id::text) into v_requester_name from auth.users u where u.id = new.requester_id;

  if not exists (
    select 1 from public.issue_activity ia
    where ia.issue_id = new.issue_id
      and ia.type = 'assignment_requested'
      and (ia.payload->>'requester_id') = new.requester_id::text
      and ia.created_at >= now() - interval '10 seconds'
  ) then
    insert into public.issue_activity (copany_id, issue_id, actor_id, type, payload)
    values (
      (select i.copany_id from public.issue i where i.id = new.issue_id),
      new.issue_id,
      v_actor,
      'assignment_requested',
      jsonb_build_object(
        'issue_title', v_issue_title,
        'requester_id', new.requester_id,
        'requester_name', v_requester_name
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_log_assignment_requested on public.issue_assignment_request;
create trigger trg_log_assignment_requested
after insert on public.issue_assignment_request
for each row execute function public.fn_log_assignment_requested();

-- 3) Activity: status change (accepted/refused)
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

-- 4) Auto-skip other pending requests in the same requester batch when one decision is made
create or replace function public.fn_auto_skip_other_assignment_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('accepted', 'refused') and (old.status is distinct from new.status) then
    update public.issue_assignment_request r
    set status = 'skipped', updated_at = now()
    where r.issue_id = new.issue_id
      and r.requester_id = new.requester_id
      and r.id <> new.id
      and r.status = 'requested';
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_skip_other_assignment_requests on public.issue_assignment_request;
create trigger trg_auto_skip_other_assignment_requests
after update of status on public.issue_assignment_request
for each row execute function public.fn_auto_skip_other_assignment_requests();

-- 5) When accepted, set issue.assignee = requester_id
create or replace function public.fn_set_issue_assignee_on_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from new.status) then
    update public.issue
    set assignee = new.requester_id,
        updated_at = now()
    where id = new.issue_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_set_issue_assignee_on_request_accepted on public.issue_assignment_request;
create trigger trg_set_issue_assignee_on_request_accepted
after update of status on public.issue_assignment_request
for each row execute function public.fn_set_issue_assignee_on_request_accepted();

-- 6) Notifications
create or replace function public.fn_notify_on_assignment_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
begin
  select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
  if new.recipient_id is not null and new.recipient_id <> v_actor then
    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    values (
      new.recipient_id,
      v_actor,
      (select i.copany_id from public.issue i where i.id = new.issue_id),
      new.issue_id,
      'assignment_request_received',
      jsonb_build_object('issue_title', v_issue_title)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_assignment_request_insert on public.issue_assignment_request;
create trigger trg_notify_on_assignment_request_insert
after insert on public.issue_assignment_request
for each row execute function public.fn_notify_on_assignment_request_insert();

create or replace function public.fn_notify_on_assignment_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
  v_type public.notification_type;
begin
  if new.status is distinct from old.status then
    select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
    if new.status = 'accepted' then
      v_type := 'assignment_request_accepted';
    elsif new.status = 'refused' then
      v_type := 'assignment_request_refused';
    else
      return new;
    end if;
    if new.requester_id is not null and new.requester_id <> v_actor then
      insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
      values (
        new.requester_id,
        v_actor,
        (select i.copany_id from public.issue i where i.id = new.issue_id),
        new.issue_id,
        v_type,
        jsonb_build_object('issue_title', v_issue_title)
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_assignment_request_update on public.issue_assignment_request;
create trigger trg_notify_on_assignment_request_update
after update of status on public.issue_assignment_request
for each row execute function public.fn_notify_on_assignment_request_update();

create or replace function public.fn_notify_on_review_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
begin
  select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
  if new.reviewer_id is not null and new.reviewer_id <> v_actor then
    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    values (
      new.reviewer_id,
      v_actor,
      (select i.copany_id from public.issue i where i.id = new.issue_id),
      new.issue_id,
      'review_requested',
      jsonb_build_object('issue_title', v_issue_title)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_review_requested on public.issue_reviewer;
create trigger trg_notify_on_review_requested
after insert on public.issue_reviewer
for each row execute function public.fn_notify_on_review_requested();

create or replace function public.fn_notify_on_review_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_issue_title text := '';
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    select coalesce(i.title, '') into v_issue_title from public.issue i where i.id = new.issue_id;
    -- notify issue creator and assignee (if different from actor)
    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    select i.created_by, v_actor, i.copany_id, i.id, 'review_approved', jsonb_build_object('issue_title', v_issue_title)
    from public.issue i where i.id = new.issue_id and i.created_by is not null and i.created_by <> v_actor;

    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    select i.assignee, v_actor, i.copany_id, i.id, 'review_approved', jsonb_build_object('issue_title', v_issue_title)
    from public.issue i where i.id = new.issue_id and i.assignee is not null and i.assignee <> v_actor and (i.created_by is null or i.assignee <> i.created_by);
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_review_approved on public.issue_reviewer;
create trigger trg_notify_on_review_approved
after update of status on public.issue_reviewer
for each row execute function public.fn_notify_on_review_approved();


