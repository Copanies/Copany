-- Extend notification types and add triggers for assignment requests and reviews

do $$ begin
  alter type public.notification_type add value if not exists 'assignment_request_received';
  alter type public.notification_type add value if not exists 'assignment_request_accepted';
  alter type public.notification_type add value if not exists 'assignment_request_refused';
  alter type public.notification_type add value if not exists 'review_requested';
  alter type public.notification_type add value if not exists 'review_approved';
exception when duplicate_object then null; end $$;

-- Notify recipients when a new assignment request is created
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

-- Notify requester on status change
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

-- Review notifications: when a reviewer is requested or approves
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
    perform 1;
    -- creator
    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    select i.created_by, v_actor, i.copany_id, i.id, 'review_approved', jsonb_build_object('issue_title', v_issue_title)
    from public.issue i where i.id = new.issue_id and i.created_by is not null and i.created_by <> v_actor;
    -- assignee
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


