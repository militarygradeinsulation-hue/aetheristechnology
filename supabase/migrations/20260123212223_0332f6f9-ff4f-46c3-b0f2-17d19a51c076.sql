-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create daily blog post generation cron job (runs at 6 AM EST / 11 AM UTC)
SELECT cron.schedule(
  'generate-daily-blog-post',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/generate-blog-post',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);