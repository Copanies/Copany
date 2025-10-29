-- Fix issue assignee update RLS to allow assignees to unassign themselves
-- The problem: WITH CHECK validates the new row values, so when a user tries to set assignee to null,
-- the condition "assignee = auth.uid()" fails because the new assignee is null.
-- Solution: Using clause checks permissions based on OLD values, WITH CHECK only validates basic constraints.

DROP POLICY IF EXISTS "issue_update_by_author_assignee_owner" ON public.issue;

CREATE POLICY "issue_update_by_author_assignee_owner"
ON public.issue
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND (
    created_by = (select auth.uid())
    OR assignee = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.copany c
      WHERE c.id = copany_id AND c.created_by = (select auth.uid())
    )
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
);

