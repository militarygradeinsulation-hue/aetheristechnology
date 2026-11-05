ALTER TABLE public.subscription_workflows
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_subscription_workflow(
  _workflow_id uuid,
  _owner text,
  _lease_seconds integer DEFAULT 180
)
RETURNS SETOF public.subscription_workflows
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.subscription_workflows w
     SET status = 'running',
         attempts = COALESCE(w.attempts, 0) + 1,
         started_at = COALESCE(w.started_at, now()),
         last_error = NULL,
         lease_owner = _owner,
         lease_expires_at = now() + make_interval(secs => GREATEST(_lease_seconds, 30)),
         heartbeat_at = now(),
         updated_at = now()
   WHERE w.id = _workflow_id
     AND (
       w.status IN ('queued', 'failed')
       OR (w.status = 'running' AND (w.lease_expires_at IS NULL OR w.lease_expires_at < now()))
     )
  RETURNING w.*;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_subscription_workflow(
  _workflow_id uuid,
  _owner text,
  _lease_seconds integer DEFAULT 180
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE hit integer;
BEGIN
  UPDATE public.subscription_workflows
     SET heartbeat_at = now(),
         lease_expires_at = now() + make_interval(secs => GREATEST(_lease_seconds, 30)),
         updated_at = now()
   WHERE id = _workflow_id AND lease_owner = _owner AND status = 'running';
  GET DIAGNOSTICS hit = ROW_COUNT;
  RETURN hit > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_subscription_workflow(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_subscription_workflow(uuid, text, integer) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS company_system_event_bus_idem_global
  ON public.company_system_event_bus (idempotency_key)
  WHERE idempotency_key IS NOT NULL;