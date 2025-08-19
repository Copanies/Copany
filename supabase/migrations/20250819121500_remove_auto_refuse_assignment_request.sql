-- Remove auto-refuse behavior: accepting one assignment request should NOT auto-refuse others

-- Drop trigger if exists
drop trigger if exists trg_auto_refuse_other_assignment_requests on public.issue_assignment_request;

-- Drop function if exists
drop function if exists public.fn_auto_refuse_other_assignment_requests();


