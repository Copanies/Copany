-- Schedule Edge Functions using pg_cron
-- This migration sets up cron jobs to automatically invoke Edge Functions

-- Step 1: Store project URL and anon key in Supabase Vault (if not already stored)
-- Replace YOUR_PROJECT_URL and YOUR_ANON_KEY with your actual values
-- You can get these from your Supabase project settings

-- Note: These secrets should be created manually via Supabase Dashboard or SQL Editor
-- Uncomment and update the following lines if you haven't created these secrets yet:
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'anon_key');

-- Step 2: Schedule monthly-distribute-calculator function (runs daily at 00:00 UTC)
-- This function checks if any copany's distribution_day_of_month matches today
-- and processes them accordingly
select cron.schedule(
  'invoke-monthly-distribute-calculator',
  '0 0 * * *', -- every day at midnight UTC
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/monthly-distribute-calculator',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body:=jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- Step 3: Schedule update-discussion-hot-score function (runs daily at 00:00 UTC)
select cron.schedule(
  'invoke-update-discussion-hot-score',
  '0 0 * * *', -- every day at midnight UTC
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/update-discussion-hot-score',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body:=jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- Step 4: Schedule update-copany-hot-score function (runs daily at 00:00 UTC)
-- Check if this function exists and update the schedule if needed
select cron.schedule(
  'invoke-update-copany-hot-score',
  '0 0 * * *', -- every day at midnight UTC
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/update-copany-hot-score',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body:=jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- Step 5: Schedule sync-app-store-finance function (runs daily at 02:00 UTC)
-- Check if this function exists and update the schedule if needed
select cron.schedule(
  'invoke-sync-app-store-finance',
  '0 2 * * *', -- every day at 2 AM UTC
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-app-store-finance',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body:=jsonb_build_object('time', now())
    ) as request_id;
  $$
);

-- To check existing cron jobs, run:
-- select * from cron.job;

-- To unschedule a job, run:
-- select cron.unschedule('job-name');

