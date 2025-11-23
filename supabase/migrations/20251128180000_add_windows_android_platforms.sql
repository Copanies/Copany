-- Add Windows and Android platforms to copany platforms constraint

-- Update check constraint to include Windows and Android platforms
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
      'web'::text,
      'windows'::text,
      'android'::text
    ]
  );

-- Update comment to include new platforms
comment on column public.copany.platforms is 'Array of platforms where the copany project runs (ios, ipados, macos, watchos, tvos, visionos, web, windows, android)';

