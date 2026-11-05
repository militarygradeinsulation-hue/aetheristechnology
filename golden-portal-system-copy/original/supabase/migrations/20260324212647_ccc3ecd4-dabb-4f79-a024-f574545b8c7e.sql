
CREATE OR REPLACE FUNCTION public.promote_if_first_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users LIMIT 1) THEN
    INSERT INTO public.admin_users (user_id) VALUES (_user_id);
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
