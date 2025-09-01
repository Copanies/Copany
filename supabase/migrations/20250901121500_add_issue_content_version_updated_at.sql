-- Add content_version_updated_at to track title/description content timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'content_version_updated_at'
  ) THEN
    ALTER TABLE public.issue
      ADD COLUMN content_version_updated_at timestamptz NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS issue_content_version_updated_at_idx ON public.issue (content_version_updated_at);


