-- Preserve the three-per-UTC-day private Golden Report cost boundary even
-- when dispatch times out after a scan may already have started.
-- Count failed dispatch attempts as consumed budget; never automatically retry.
CREATE OR REPLACE FUNCTION public.claim_private_company_golden(p_case_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE changed uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(88347103);

  IF (
    SELECT count(*)
    FROM public.aetheris_company_audit_cases
    WHERE scan_status IN ('dispatching', 'queued', 'reused', 'failed')
      AND updated_at >= date_trunc('day', now())
  ) >= 3 THEN
    UPDATE public.aetheris_company_audit_cases
      SET scan_status = 'limited', updated_at = now()
      WHERE id = p_case_id AND scan_status = 'pending';
    RETURN false;
  END IF;

  UPDATE public.aetheris_company_audit_cases
    SET scan_status = 'dispatching', updated_at = now()
    WHERE id = p_case_id AND scan_status = 'pending'
    RETURNING id INTO changed;
  RETURN changed IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_private_company_golden(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_private_company_golden(uuid) TO service_role;
