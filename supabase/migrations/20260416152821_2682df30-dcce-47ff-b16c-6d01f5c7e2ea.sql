
-- Generate drip batch every 2 hours (processes 10 imported prospects per run)
SELECT cron.schedule(
  'generate-drip-batch',
  '0 */2 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/generate-drip-batch',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{"batchSize": 10}'::jsonb
  ) AS request_id;
  $$
);

-- Process drip emails every 2 hours (sends pending emails that are due)
SELECT cron.schedule(
  'process-drip-sends',
  '30 */2 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/process-drip',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Check for drip replies every 4 hours
SELECT cron.schedule(
  'check-drip-replies',
  '15 */4 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/check-drip-replies',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
