-- Update storage bucket file size limits
-- finance-evidence: 20MB limit

-- Update finance-evidence bucket file size limit to 20MB
UPDATE storage.buckets 
SET file_size_limit = 20971520 
WHERE id = 'finance-evidence';
