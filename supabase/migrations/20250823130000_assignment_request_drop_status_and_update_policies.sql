-- Drop status from issue_assignment_request and related objects; add delete policy for recipient

-- 1) Drop triggers that depend on status updates
DROP TRIGGER IF EXISTS trg_log_assignment_request_status_change ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_auto_skip_other_assignment_requests ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_set_issue_assignee_on_request_accepted ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_notify_on_assignment_request_update ON public.issue_assignment_request;

-- 2) Drop indexes that reference status
DROP INDEX IF EXISTS idx_issue_assignment_request_issue_status;
DROP INDEX IF EXISTS uniq_issue_assignment_request_requested;

-- 3) Remove default before dropping column (safety)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issue_assignment_request' AND column_name = 'status'
  ) THEN
    EXECUTE 'ALTER TABLE public.issue_assignment_request ALTER COLUMN status DROP DEFAULT';
  END IF;
END $$;

-- 4) Drop status column if exists
ALTER TABLE public.issue_assignment_request
  DROP COLUMN IF EXISTS status;

-- 5) Drop enum type if exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_request_status') THEN
    DROP TYPE public.assignment_request_status;
  END IF;
END $$;

-- 6) Add a non-partial unique index to prevent exact duplicates in a batch
CREATE UNIQUE INDEX IF NOT EXISTS uniq_issue_assignment_request_triplet
ON public.issue_assignment_request (issue_id, requester_id, recipient_id);

-- 7) RLS: allow recipients to delete their own rows (accept/refuse handled by deletion)
DROP POLICY IF EXISTS "issue_assignment_request_delete_recipient" ON public.issue_assignment_request;
CREATE POLICY "issue_assignment_request_delete_recipient"
ON public.issue_assignment_request
FOR DELETE
TO authenticated
USING (auth.uid() = recipient_id);

-- Note:
-- We keep existing select/insert policies and insert/notify triggers on insert.
-- Assignee updates and accept/refuse activities are now handled in application layer.
