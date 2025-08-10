-- Add new notification type and trigger for issue creation

-- 1) Extend enum with new_issue
do $$ begin
  alter type public.notification_type add value if not exists 'new_issue';
exception
  when duplicate_object then null;
end $$;

-- 2) Function: notify copany contributors on issue create
create or replace function public.fn_notify_on_issue_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- Only when copany_id exists
  if new.copany_id is not null then
    insert into public.notification(user_id, actor_id, copany_id, issue_id, type, payload)
    select
      c.user_id,
      v_actor,
      new.copany_id,
      new.id,
      'new_issue',
      jsonb_build_object('issue_title', coalesce(new.title, ''))
    from public.copany_contributor c
    where c.copany_id = new.copany_id
      and (v_actor is null or c.user_id <> v_actor); -- exclude actor if present
  end if;

  return new;
end $$;

drop trigger if exists trg_notify_on_issue_create on public.issue;
create trigger trg_notify_on_issue_create
after insert on public.issue
for each row
execute function public.fn_notify_on_issue_create();

