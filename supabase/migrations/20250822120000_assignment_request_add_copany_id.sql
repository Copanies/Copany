-- Add copany_id to assignment request for copany-level listing and cleanup

alter table public.issue_assignment_request
  add column if not exists copany_id bigint;

-- Backfill copany_id from issue table
update public.issue_assignment_request r
set copany_id = i.copany_id
from public.issue i
where r.issue_id = i.id and r.copany_id is null;

-- Index for copany-level query
create index if not exists idx_issue_assignment_request_copany_id
  on public.issue_assignment_request (copany_id);

-- Enforce NOT NULL after backfill (assumes backfill completed or manual fix)
alter table public.issue_assignment_request
  alter column copany_id set not null;

-- RLS policies may already exist on this table; we keep them unchanged since access is controlled via issue_id and copany visibility


