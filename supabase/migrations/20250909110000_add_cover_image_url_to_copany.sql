-- Add cover_image_url column to copany table

-- Add cover_image_url column to store cover image URL
alter table public.copany
  add column if not exists cover_image_url text;
