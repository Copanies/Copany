-- Allow copany_id to be null in discussion table
-- This enables creating discussions that are not associated with any specific copany

-- Drop the foreign key constraint first
alter table public.discussion
  drop constraint if exists discussion_copany_fkey;

-- Alter the column to allow null
alter table public.discussion
  alter column copany_id drop not null;

-- Re-add the foreign key constraint (it will allow null values)
alter table public.discussion
  add constraint discussion_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

-- Update indexes to support null values
-- The existing index should work fine with nulls

-- Update RLS policies to ensure they still work with null copany_id
-- The existing select policy already uses (true), so it works fine
-- The existing insert policy already uses (true), so it works fine
-- No changes needed for update and delete policies

