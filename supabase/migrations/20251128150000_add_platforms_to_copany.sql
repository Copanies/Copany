-- Add platforms field to copany table
-- Platforms are stored as text array, with enum constraint

-- 1) Create platform_type enum
do $$ begin
  create type public.platform_type as enum (
    'ios',
    'ipados',
    'macos',
    'watchos',
    'tvos',
    'visionos',
    'web'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Add platforms column to copany table
alter table public.copany
  add column if not exists platforms text[];

-- 3) Add check constraint to ensure all array values are valid platform types
alter table public.copany
  drop constraint if exists copany_platforms_check,
  add constraint copany_platforms_check
  check (
    platforms is null or
    array_length(platforms, 1) is null or
    platforms <@ array[
      'ios'::text,
      'ipados'::text,
      'macos'::text,
      'watchos'::text,
      'tvos'::text,
      'visionos'::text,
      'web'::text
    ]
  );

-- 4) Add comment to explain the field
comment on column public.copany.platforms is 'Array of platforms where the copany project runs (ios, ipados, macos, watchos, tvos, visionos, web)';

