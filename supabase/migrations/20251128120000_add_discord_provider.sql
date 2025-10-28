-- Add Discord OAuth provider support to user_provider_tokens table
-- This migration updates the provider check constraint to include 'discord'

-- Drop the old constraint
alter table public.user_provider_tokens
  drop constraint if exists user_provider_tokens_provider_check;

-- Add new constraint that includes 'discord'
alter table public.user_provider_tokens
  add constraint user_provider_tokens_provider_check
  check (provider in ('github', 'google', 'figma', 'discord'));

