-- Add updated_by column to issue table to record last editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.issue
      ADD COLUMN updated_by uuid NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS issue_updated_by_idx ON public.issue (updated_by);


