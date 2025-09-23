-- Remove avatar_url and name fields from copany_contributor table
-- These fields will be replaced by JOIN with auth.users table

-- Drop the columns
ALTER TABLE "public"."copany_contributor" 
DROP COLUMN IF EXISTS "avatar_url",
DROP COLUMN IF EXISTS "name";

-- Add comment to document the change
COMMENT ON TABLE "public"."copany_contributor" IS 'Contributors table - avatar_url and name now come from auth.users via JOIN';
