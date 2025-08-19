-- Auto-refuse other assignment requests when one is accepted

create or replace function public.fn_auto_refuse_other_assignment_requests()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only act when a request becomes accepted
  if new.status = 'accepted' and old.status is distinct from new.status then
    -- Refuse all other pending requests for the same issue
    update public.issue_assignment_request r
    set status = 'refused', updated_at = now()
    where r.issue_id = new.issue_id
      and r.id <> new.id
      and r.status = 'requested';
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_refuse_other_assignment_requests on public.issue_assignment_request;
create trigger trg_auto_refuse_other_assignment_requests
after update of status on public.issue_assignment_request
for each row execute function public.fn_auto_refuse_other_assignment_requests();


