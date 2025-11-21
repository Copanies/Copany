-- Add distribution_month field to distribute table
-- This field stores the month (YYYY-MM format) for which the distribution is calculated

alter table public.distribute
  add column if not exists distribution_month text;

-- Add index for better query performance
create index if not exists idx_distribute_distribution_month 
  on public.distribute(copany_id, distribution_month);

-- Add comment to explain the field
comment on column public.distribute.distribution_month is 'The month (YYYY-MM format) for which this distribution is calculated, based on the distribution_delay_days setting';

