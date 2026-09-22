DROP POLICY IF EXISTS "Retargeting settings are publicly readable" ON public.retargeting_settings;

CREATE OR REPLACE FUNCTION public.get_active_retargeting_settings()
RETURNS TABLE(linkedin_partner_id text, meta_pixel_id text, rb2b_script_id text, google_ads_id text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.linkedin_partner_id, r.meta_pixel_id, r.rb2b_script_id, r.google_ads_id, r.enabled
  FROM public.retargeting_settings r
  WHERE r.id = 1 AND r.enabled = true
$$;

GRANT EXECUTE ON FUNCTION public.get_active_retargeting_settings() TO anon, authenticated;

CREATE POLICY "Admins can read retargeting settings"
  ON public.retargeting_settings FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));