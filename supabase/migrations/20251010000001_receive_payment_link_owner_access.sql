-- Modify receive_payment_link RLS policies to allow copany owners 
-- to access payment links of recipients with pending distributes
-- This enables secure access for finance distribution while maintaining granular security

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own payment links" ON receive_payment_link;

-- Create new SELECT policy: Users can view their own OR owners can view recipients with pending distributes
CREATE POLICY "receive_payment_link_select_policy" ON receive_payment_link
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id  -- Users can view their own payment links
  OR EXISTS (
    -- Owners can view payment links of recipients with pending distributes
    SELECT 1 FROM public.distribute d
    INNER JOIN public.copany c ON c.id = d.copany_id
    WHERE d.to_user = receive_payment_link.user_id
      AND c.created_by = auth.uid()
      AND d.status IN ('in_progress', 'in_review')
  )
);

-- Create INSERT policy: Users can only insert their own payment links
CREATE POLICY "receive_payment_link_insert_policy" ON receive_payment_link
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy: Users can only update their own payment links
CREATE POLICY "receive_payment_link_update_policy" ON receive_payment_link
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy: Users can only delete their own payment links
CREATE POLICY "receive_payment_link_delete_policy" ON receive_payment_link
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Add comment to document the security model
COMMENT ON POLICY "receive_payment_link_select_policy" ON receive_payment_link IS 
'Allows users to view their own payment links, or copany owners to view payment links of recipients with pending distributes (in_progress or in_review status). This enables secure finance distribution while maintaining granular access control.';
