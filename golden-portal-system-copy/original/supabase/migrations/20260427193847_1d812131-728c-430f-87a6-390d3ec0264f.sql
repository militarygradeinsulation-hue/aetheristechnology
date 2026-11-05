-- One-time recovery: reset rows currently stuck in executing
UPDATE public.hygiene_actions
SET status = 'pending',
    error_message = COALESCE(NULLIF(error_message, ''), '') ||
                    CASE WHEN COALESCE(error_message,'') = '' THEN '' ELSE ' | ' END ||
                    'Auto-recovered: previous run timed out before completion',
    progress = '{}'::jsonb,
    updated_at = now()
WHERE status = 'executing'
  AND updated_at < now() - interval '15 minutes';

-- Reusable watchdog
CREATE OR REPLACE FUNCTION public.reset_stuck_hygiene_actions(_stale_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  WITH updated AS (
    UPDATE public.hygiene_actions
    SET status = 'pending',
        error_message = COALESCE(error_message, '') ||
                        CASE WHEN COALESCE(error_message,'') = '' THEN '' ELSE ' | ' END ||
                        'Auto-recovered: execution timed out',
        progress = '{}'::jsonb,
        updated_at = now()
    WHERE status = 'executing'
      AND updated_at < now() - (_stale_minutes || ' minutes')::interval
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM updated;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_stuck_hygiene_actions(integer) TO authenticated, service_role;