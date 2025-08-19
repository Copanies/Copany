-- Add skipped status; de-duplicate assignment_requested activity; auto-skip other requests after first decision

-- 1) Extend enum assignment_request_status with 'skipped'
do $$ begin
  alter type public.assignment_request_status add value if not exists 'skipped';
exception when duplicate_object then null; end $$;

-- 2) De-duplicate assignment_requested activity and simplify payload (no recipient fields)
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

  -- Only log a single activity per requester batch within a short window
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

-- 3) Auto-skip other in-progress requests when any recipient makes a decision (accepted or refused)
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

-- 4) When accepted, set issue.assignee = requester_id (server-side authoritative)
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


