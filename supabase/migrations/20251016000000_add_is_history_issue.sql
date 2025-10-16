-- Add is_history_issue field to issue table
ALTER TABLE public.issue 
ADD COLUMN IF NOT EXISTS is_history_issue boolean NOT NULL DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_issue_is_history_issue 
ON public.issue (copany_id, is_history_issue, state);

COMMENT ON COLUMN public.issue.is_history_issue IS 'Marks if this issue was created as a history issue to record pre-copany work';
