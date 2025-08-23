-- Consolidated Schema & RLS updates

-- 1) Add copany_id to assignment request for copany-level listing and cleanup
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

-- 2) Drop indexes and column related to deprecated status workflow (schema part only)
DROP INDEX IF EXISTS idx_issue_assignment_request_issue_status;
DROP INDEX IF EXISTS uniq_issue_assignment_request_requested;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issue_assignment_request' AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER TABLE public.issue_assignment_request ALTER COLUMN status DROP DEFAULT';
  END IF;
END $$;

ALTER TABLE public.issue_assignment_request
  DROP COLUMN IF EXISTS status;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_request_status') THEN
    DROP TYPE public.assignment_request_status;
  END IF;
END $$;

-- 3) Add unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_issue_assignment_request_triplet
ON public.issue_assignment_request (issue_id, requester_id, recipient_id);

-- 4) RLS: issue update policy relaxation
drop policy if exists "issue_update_by_author_assignee_owner" on public.issue;

create policy "issue_update_by_author_assignee_owner"
on public.issue
for update
to authenticated
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or assignee = auth.uid()
    or exists (
      select 1 from public.copany c
      where c.id = copany_id and c.created_by = auth.uid()
    )
  )
)
with check (
  auth.uid() is not null
);

-- 5) RLS: allow recipients to delete all requests from the same requester for an issue
DROP POLICY IF EXISTS "issue_assignment_request_delete_recipient" ON public.issue_assignment_request;

CREATE POLICY "issue_assignment_request_delete_recipient"
ON public.issue_assignment_request
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.issue_assignment_request ar2
    WHERE ar2.issue_id = issue_assignment_request.issue_id
      AND ar2.requester_id = issue_assignment_request.requester_id
      AND ar2.recipient_id = auth.uid()
  )
);


