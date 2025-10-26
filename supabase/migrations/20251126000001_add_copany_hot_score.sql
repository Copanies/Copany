-- Add hot_score column to copany table
ALTER TABLE public.copany 
ADD COLUMN IF NOT EXISTS hot_score DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create index on hot_score for fast sorting
CREATE INDEX IF NOT EXISTS idx_copany_hot_score 
ON public.copany(hot_score DESC);

-- Function to calculate copany hot score
-- Formula: (star_count + 1) / pow((hours_since_creation + 2), 1.5)
CREATE OR REPLACE FUNCTION public.fn_calculate_copany_hot_score(
  p_star_count integer,
  p_created_at timestamptz
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Handle null star_count
  RETURN (COALESCE(p_star_count, 0)::double precision + 1) / 
         POWER(EXTRACT(EPOCH FROM (NOW() - p_created_at)) / 3600 + 2, 1.5);
END;
$$;

-- Function to update hot_score for a single copany
CREATE OR REPLACE FUNCTION public.fn_update_copany_hot_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.hot_score := public.fn_calculate_copany_hot_score(NEW.star_count, NEW.created_at);
  RETURN NEW;
END;
$$;

-- Trigger to automatically update hot_score when copany is created or updated
DROP TRIGGER IF EXISTS trg_update_copany_hot_score ON public.copany;
CREATE TRIGGER trg_update_copany_hot_score
BEFORE INSERT OR UPDATE OF star_count, created_at ON public.copany
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_copany_hot_score();

-- Update existing copanies with hot_score
UPDATE public.copany
SET hot_score = public.fn_calculate_copany_hot_score(star_count, created_at);

