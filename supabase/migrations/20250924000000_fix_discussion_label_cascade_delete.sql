-- Fix discussion_label cascade delete issue
-- When a user is deleted, discussion_label records should have creator_id set to null
-- instead of being deleted entirely

-- 1) Drop the existing foreign key constraint that causes cascade delete
ALTER TABLE public.discussion_label
  DROP CONSTRAINT IF EXISTS discussion_label_creator_fkey;

-- 2) Add new foreign key constraint with SET NULL on delete
ALTER TABLE public.discussion_label
  ADD CONSTRAINT discussion_label_creator_fkey
  FOREIGN KEY (creator_id) REFERENCES auth.users(id) 
  ON UPDATE CASCADE 
  ON DELETE SET NULL;

-- 3) Add comment to document the change
COMMENT ON CONSTRAINT discussion_label_creator_fkey ON public.discussion_label 
IS 'Foreign key to auth.users with SET NULL on delete to preserve discussion labels when users are deleted';
