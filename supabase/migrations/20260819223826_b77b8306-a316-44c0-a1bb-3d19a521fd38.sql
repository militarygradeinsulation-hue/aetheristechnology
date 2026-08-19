-- Real invite acceptance: link pending seats to the signed-in user by email.
CREATE OR REPLACE FUNCTION public.claim_subscription_seats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimer uuid := auth.uid();
  claimer_email text;
  linked integer := 0;
  r record;
BEGIN
  IF claimer IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(u.email) INTO claimer_email FROM auth.users u WHERE u.id = claimer;
  IF claimer_email IS NULL THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT m.id
      FROM public.subscription_members m
     WHERE m.status = 'invited'
       AND m.user_id IS NULL
       AND lower(m.invited_email) = claimer_email
  LOOP
    -- The seat-limit trigger still guards the cap; skip a seat it rejects.
    BEGIN
      UPDATE public.subscription_members
         SET user_id = claimer, status = 'active', accepted_at = now()
       WHERE id = r.id;
      linked := linked + 1;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN linked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_subscription_seats() TO authenticated;

-- Automatic recovery: resume any queued or failed Intelligence workflow.
SELECT cron.unschedule('intelligence-workflow-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intelligence-workflow-sweep');

SELECT cron.schedule(
  'intelligence-workflow-sweep',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/functions/v1/subscription-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sweep-key', current_setting('app.orchestrator_sweep_key', true)
    ),
    body := '{"action":"sweep","limit":5}'::jsonb
  ) AS request_id;
  $$
);