CREATE OR REPLACE FUNCTION public.get_careers_positions()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', 15,
    'filled', LEAST(15, (SELECT COUNT(*) FROM public.rep_codes WHERE is_active = true)),
    'open', GREATEST(0, 15 - (SELECT COUNT(*) FROM public.rep_codes WHERE is_active = true))
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_careers_positions() TO anon, authenticated;