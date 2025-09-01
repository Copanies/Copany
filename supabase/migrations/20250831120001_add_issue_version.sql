-- Add version column to issue table for optimistic locking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'version'
  ) THEN
    ALTER TABLE public.issue
      ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Create an index to speed up conditional updates on (id, version)
CREATE INDEX IF NOT EXISTS issue_id_version_idx ON public.issue (id, version);


