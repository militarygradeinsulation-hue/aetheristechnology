-- Add explicit admin-only SELECT policy for access_codes to make PII protection visible.
-- RLS is already enabled with no permissive policies (default deny), but scanners
-- want an explicit admin-scoped policy documented.
CREATE POLICY "Admins can view access codes"
  ON public.access_codes FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Revoke any lingering broad grants; service role bypasses RLS via edge functions.
REVOKE SELECT ON public.access_codes FROM anon;