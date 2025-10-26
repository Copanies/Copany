-- Add hot_score column to discussion table
ALTER TABLE public.discussion 
ADD COLUMN IF NOT EXISTS hot_score DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create index on hot_score for fast sorting
CREATE INDEX IF NOT EXISTS idx_discussion_hot_score 
ON public.discussion(hot_score DESC);

-- Function to calculate hot score
-- Formula: (vote_up_count + 1) / pow((hours_since_creation + 2), 1.5)
CREATE OR REPLACE FUNCTION public.fn_calculate_hot_score(
  p_vote_count integer,
  p_created_at timestamptz
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (p_vote_count::double precision + 1) / 
         POWER(EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600 + 2, 1.5);
END;
$$;

-- Function to update hot_score for a single discussion
CREATE OR REPLACE FUNCTION public.fn_update_discussion_hot_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.hot_score := public.fn_calculate_hot_score(NEW.vote_up_count, NEW.created_at);
  RETURN NEW;
END;
$$;

-- Trigger to automatically update hot_score when discussion is created or updated
DROP TRIGGER IF EXISTS trg_update_discussion_hot_score ON public.discussion;
CREATE TRIGGER trg_update_discussion_hot_score
BEFORE INSERT OR UPDATE OF vote_up_count, created_at ON public.discussion
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_discussion_hot_score();

-- Update existing discussions with hot_score
UPDATE public.discussion
SET hot_score = public.fn_calculate_hot_score(vote_up_count, created_at);

