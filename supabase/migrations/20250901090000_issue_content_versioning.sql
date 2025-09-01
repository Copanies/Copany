-- Consolidated migration: versioning + content version metadata
-- Includes:
-- 1) Add issue.version (for optimistic locking)
-- 2) Add/rename issue.content_version_updated_by (last content editor)
-- 3) Add issue.content_version_updated_at (last content edit timestamp)
-- 4) Indexes for the above

DO $$
BEGIN
  -- 1) version column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'version'
  ) THEN
    ALTER TABLE public.issue
      ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;

  -- 2) content_version_updated_by column (prefer rename if legacy column exists)
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issue'
      AND column_name = 'content_version_updated_by'
  ) THEN
    ALTER TABLE public.issue
      ADD COLUMN content_version_updated_by uuid NULL;
  END IF;

  -- 3) content_version_updated_at column
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

-- 4) Indexes
CREATE INDEX IF NOT EXISTS issue_id_version_idx ON public.issue (id, version);
CREATE INDEX IF NOT EXISTS issue_content_version_updated_by_idx ON public.issue (content_version_updated_by);
CREATE INDEX IF NOT EXISTS issue_content_version_updated_at_idx ON public.issue (content_version_updated_at);


