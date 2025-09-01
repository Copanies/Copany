-- Rename updated_by to content_version_updated_by for clarity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'updated_by'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'content_version_updated_by'
  ) THEN
    ALTER TABLE public.issue RENAME COLUMN updated_by TO content_version_updated_by;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS issue_content_version_updated_by_idx ON public.issue (content_version_updated_by);


