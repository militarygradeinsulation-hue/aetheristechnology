
-- 1. rep_codes: stop exposing names/commissions to anon
DROP POLICY IF EXISTS "Anyone can validate rep codes" ON public.rep_codes;

CREATE OR REPLACE FUNCTION public.validate_rep_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.rep_codes WHERE code = _code AND is_active = true);
$$;
REVOKE ALL ON FUNCTION public.validate_rep_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_rep_code(text) TO anon, authenticated;

-- 2. purchase_deliverables: stop exposing every row that has an access_token
DROP POLICY IF EXISTS "Public can view deliverable by access_token" ON public.purchase_deliverables;
DROP POLICY IF EXISTS "Public can update intake by access_token" ON public.purchase_deliverables;

CREATE OR REPLACE FUNCTION public.get_deliverables_by_session(_session_id text)
RETURNS SETOF public.purchase_deliverables
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.purchase_deliverables WHERE stripe_session_id = _session_id;
$$;
REVOKE ALL ON FUNCTION public.get_deliverables_by_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deliverables_by_session(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_deliverable_intake(_access_token text, _intake_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _updated int;
BEGIN
  IF _access_token IS NULL OR length(_access_token) < 16 THEN
    RETURN false;
  END IF;
  UPDATE public.purchase_deliverables
     SET intake_data = _intake_data, updated_at = now()
   WHERE access_token = _access_token;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.update_deliverable_intake(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_deliverable_intake(text, jsonb) TO anon, authenticated;
