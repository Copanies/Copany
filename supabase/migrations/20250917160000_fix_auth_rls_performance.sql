-- Fix Auth RLS Performance Issues
-- Replace auth.uid() with (select auth.uid()) in RLS policies to prevent re-evaluation for each row
-- This improves query performance at scale

-- 1. Fix issue_reviewer table policies
DROP POLICY IF EXISTS "issue_reviewer_update_self" ON public.issue_reviewer;
CREATE POLICY "issue_reviewer_update_self"
ON public.issue_reviewer
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = reviewer_id)
WITH CHECK ((select auth.uid()) = reviewer_id);

-- 2. Fix issue_assignment_request table policies
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
      AND ar2.recipient_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "issue_assignment_request_insert_self" ON public.issue_assignment_request;
CREATE POLICY "issue_assignment_request_insert_self"
ON public.issue_assignment_request
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = requester_id);

DROP POLICY IF EXISTS "issue_assignment_request_update_recipient" ON public.issue_assignment_request;
CREATE POLICY "issue_assignment_request_update_recipient"
ON public.issue_assignment_request
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = recipient_id)
WITH CHECK ((select auth.uid()) = recipient_id);

-- 3. Fix distribute table policies
DROP POLICY IF EXISTS "distribute_insert_auth" ON public.distribute;
CREATE POLICY "distribute_insert_auth"
ON public.distribute
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.copany c WHERE c.id = distribute.copany_id AND (c.created_by = (select auth.uid()))
  ) OR distribute.to_user = (select auth.uid())
);

DROP POLICY IF EXISTS "distribute_update_owner_or_recipient" ON public.distribute;
CREATE POLICY "distribute_update_owner_or_recipient"
ON public.distribute
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copany c WHERE c.id = distribute.copany_id AND (c.created_by = (select auth.uid()))
  ) OR distribute.to_user = (select auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.copany c WHERE c.id = distribute.copany_id AND (c.created_by = (select auth.uid()))
  ) OR distribute.to_user = (select auth.uid())
);

-- 4. Fix transactions table policies
DROP POLICY IF EXISTS "transactions_update_owner_or_actor" ON public.transactions;
CREATE POLICY "transactions_update_owner_or_actor"
ON public.transactions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copany c WHERE c.id = transactions.copany_id AND (c.created_by = (select auth.uid()))
  ) OR transactions.actor_id = (select auth.uid())
)
WITH CHECK (
  (
    -- Owner can always update (e.g., to confirm)
    EXISTS (
      SELECT 1 FROM public.copany c WHERE c.id = transactions.copany_id AND (c.created_by = (select auth.uid()))
    )
  ) OR (
    -- Actor can only modify while in_review
    transactions.actor_id = (select auth.uid()) AND transactions.status = 'in_review'
  )
);

-- 5. Fix issue table policies
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
  AND (
    created_by = (select auth.uid())
    OR assignee = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.copany c
      WHERE c.id = copany_id AND c.created_by = (select auth.uid())
    )
  )
);

-- 6. Fix stars table policies
DROP POLICY IF EXISTS "stars_delete_own" ON public.stars;
CREATE POLICY "stars_delete_own"
ON public.stars
FOR DELETE
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "stars_insert_own" ON public.stars;
CREATE POLICY "stars_insert_own"
ON public.stars
FOR INSERT
TO authenticated
WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "stars_select_own" ON public.stars;
CREATE POLICY "stars_select_own"
ON public.stars
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

-- 7. Fix notification table policies
DROP POLICY IF EXISTS "notification_select_own" ON public.notification;
CREATE POLICY "notification_select_own"
ON public.notification
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notification_update_own" ON public.notification;
CREATE POLICY "notification_update_own"
ON public.notification
FOR UPDATE
TO authenticated
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));
