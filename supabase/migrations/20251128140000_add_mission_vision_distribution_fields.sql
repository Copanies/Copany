-- Add mission, vision, and distribution configuration fields to copany table

-- Add mission field (text, nullable)
alter table public.copany
  add column if not exists mission text;

-- Add vision field (text, nullable)
alter table public.copany
  add column if not exists vision text;

-- Add distribution_delay_days field (integer, nullable, default 60)
alter table public.copany
  add column if not exists distribution_delay_days integer default 60;

-- Add distribution_day_of_month field (integer, nullable, default 10, range 1-31)
alter table public.copany
  add column if not exists distribution_day_of_month integer default 10;

-- Add check constraint for distribution_day_of_month (1-31)
alter table public.copany
  drop constraint if exists copany_distribution_day_of_month_check,
  add constraint copany_distribution_day_of_month_check
  check (distribution_day_of_month is null or (distribution_day_of_month >= 1 and distribution_day_of_month <= 31));

