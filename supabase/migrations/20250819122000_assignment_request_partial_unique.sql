-- Allow multiple historical requests to the same recipient across batches
-- while ensuring at most one in-progress (requested) row per (issue, requester, recipient)

-- Drop the strict unique constraint on (issue_id, requester_id, recipient_id)
alter table public.issue_assignment_request
  drop constraint if exists issue_assignment_request_unique;

-- Create a partial unique index that only applies to rows where status = 'requested'
create unique index if not exists uniq_issue_assignment_request_requested
on public.issue_assignment_request (issue_id, requester_id, recipient_id)
where status = 'requested';


