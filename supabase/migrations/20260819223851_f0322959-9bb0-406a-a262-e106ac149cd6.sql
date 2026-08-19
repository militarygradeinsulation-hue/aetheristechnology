REVOKE ALL ON FUNCTION public.claim_subscription_seats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_subscription_seats() TO authenticated;

SELECT cron.unschedule('intelligence-workflow-sweep');

SELECT cron.schedule(
  'intelligence-workflow-sweep',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/subscription-orchestrator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZGpweGhjYWlhaXhtcXh5cW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjY3NTQsImV4cCI6MjA4MDIwMjc1NH0.nuaop05FrMgxPZ4e728c77daL9bgjzWjx3L6zKk2TWs"}'::jsonb,
    body := '{"action":"sweep","limit":5,"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);