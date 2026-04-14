-- Remove daily blog jobs and twice-daily playbook job
SELECT cron.unschedule(1);
SELECT cron.unschedule(2);
SELECT cron.unschedule(3);
SELECT cron.unschedule(6);

-- Weekly blog: Monday 8 AM EST (13 UTC)
SELECT cron.schedule(
  'weekly-blog-morning',
  '0 13 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/generate-blog',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly blog: Monday 2 PM EST (19 UTC)
SELECT cron.schedule(
  'weekly-blog-afternoon',
  '0 19 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/generate-blog',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly playbook: Monday 3 PM EST (20 UTC)
SELECT cron.schedule(
  'weekly-playbook-afternoon',
  '0 20 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/generate-playbook',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);