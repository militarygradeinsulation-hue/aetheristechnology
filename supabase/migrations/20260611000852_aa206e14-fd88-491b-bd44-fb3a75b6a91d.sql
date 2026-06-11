
-- Lock content_posting_schedule SELECT to admins
DROP POLICY IF EXISTS "Anyone can view posting schedule" ON public.content_posting_schedule;
CREATE POLICY "Admins can view posting schedule"
  ON public.content_posting_schedule
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Explicit write-deny policies on admin_kv (defense-in-depth alongside existing SELECT deny)
CREATE POLICY "no direct insert admin_kv"
  ON public.admin_kv
  FOR INSERT
  TO public
  WITH CHECK (false);
CREATE POLICY "no direct update admin_kv"
  ON public.admin_kv
  FOR UPDATE
  TO public
  USING (false)
  WITH CHECK (false);
CREATE POLICY "no direct delete admin_kv"
  ON public.admin_kv
  FOR DELETE
  TO public
  USING (false);

-- Remove broad authenticated-insert on team-uploads bucket; only service_role (edge functions) should upload
DROP POLICY IF EXISTS "team-uploads authenticated insert" ON storage.objects;
