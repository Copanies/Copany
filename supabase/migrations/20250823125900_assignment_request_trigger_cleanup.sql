-- Cleanup: drop assignment request triggers that depended on the old status workflow

DROP TRIGGER IF EXISTS trg_log_assignment_request_status_change ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_auto_skip_other_assignment_requests ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_set_issue_assignee_on_request_accepted ON public.issue_assignment_request;
DROP TRIGGER IF EXISTS trg_notify_on_assignment_request_update ON public.issue_assignment_request;


