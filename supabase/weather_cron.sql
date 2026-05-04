create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists supabase_vault;

-- Store your project URL and service role key in Vault before scheduling.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'weather_project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'weather_service_role_key');

select cron.schedule(
  'weather-log-forecasts',
  '15 */6 * * *',
  $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'weather_project_url') || '/functions/v1/log-forecasts',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'weather_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
  $$
);

select cron.schedule(
  'weather-log-observations',
  '20 23 * * *',
  $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'weather_project_url') || '/functions/v1/log-observations',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'weather_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
  $$
);
