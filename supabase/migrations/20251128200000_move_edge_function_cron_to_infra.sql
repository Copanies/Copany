-- Move Edge Functions cron jobs to infrastructure
-- This migration uses Supabase's recommended approach for scheduling Edge Functions
-- It checks if pg_cron extension exists and only runs in production

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule old jobs if they exist
    PERFORM cron.unschedule('invoke-monthly-distribute-calculator');
    PERFORM cron.unschedule('invoke-update-discussion-hot-score');
    PERFORM cron.unschedule('invoke-update-copany-hot-score');
    PERFORM cron.unschedule('invoke-sync-app-store-finance');

    -- Schedule monthly-distribute-calculator function (runs daily at 00:00 UTC)
    -- This function checks if any copany's distribution_day_of_month matches today
    -- and processes them accordingly
    PERFORM cron.schedule(
      'monthly-distribute-calculator',
      '0 0 * * *', -- every day at midnight UTC
      $cron$
      select
        net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/monthly-distribute-calculator',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          ),
          body:=jsonb_build_object('time', now())
        ) as request_id;
      $cron$
    );

    -- Schedule update-discussion-hot-score function (runs daily at 00:00 UTC)
    PERFORM cron.schedule(
      'update-discussion-hot-score',
      '0 0 * * *', -- every day at midnight UTC
      $cron$
      select
        net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/update-discussion-hot-score',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          ),
          body:=jsonb_build_object('time', now())
        ) as request_id;
      $cron$
    );

    -- Schedule update-copany-hot-score function (runs daily at 00:00 UTC)
    PERFORM cron.schedule(
      'update-copany-hot-score',
      '0 0 * * *', -- every day at midnight UTC
      $cron$
      select
        net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/update-copany-hot-score',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          ),
          body:=jsonb_build_object('time', now())
        ) as request_id;
      $cron$
    );

    -- Schedule sync-app-store-finance function (runs daily at 02:00 UTC)
    PERFORM cron.schedule(
      'sync-app-store-finance',
      '0 2 * * *', -- every day at 2 AM UTC
      $cron$
      select
        net.http_post(
          url:= (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-app-store-finance',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          ),
          body:=jsonb_build_object('time', now())
        ) as request_id;
      $cron$
    );
  END IF;
END $$;

