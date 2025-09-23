-- Add isDefaultUseCOSL field to copany table
ALTER TABLE "public"."copany" 
ADD COLUMN "isDefaultUseCOSL" boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN "public"."copany"."isDefaultUseCOSL" IS 'Whether the copany creator chose to use COSL license by default when creating the copany';
