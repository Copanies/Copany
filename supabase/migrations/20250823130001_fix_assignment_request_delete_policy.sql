-- Fix assignment request delete policy to allow recipients to delete all requests from the same requester

-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "issue_assignment_request_delete_recipient" ON public.issue_assignment_request;

-- Create a new policy that allows recipients to delete all requests from the same requester
-- This is needed because when accepting/refusing a request, we want to clean up all requests
-- from that requester to avoid orphaned requests
CREATE POLICY "issue_assignment_request_delete_recipient"
ON public.issue_assignment_request
FOR DELETE
TO authenticated
USING (
  -- Allow deletion if the current user is a recipient of ANY request from this requester for this issue
  -- This allows cleaning up all requests from the same requester when accepting/refusing one
  EXISTS (
    SELECT 1 FROM public.issue_assignment_request ar2
    WHERE ar2.issue_id = issue_assignment_request.issue_id
      AND ar2.requester_id = issue_assignment_request.requester_id
      AND ar2.recipient_id = auth.uid()
  )
);
