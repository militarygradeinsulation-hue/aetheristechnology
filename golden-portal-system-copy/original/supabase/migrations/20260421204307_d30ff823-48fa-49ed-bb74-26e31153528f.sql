
CREATE OR REPLACE FUNCTION public.increment_rep_sales(_code text, _sales integer, _commission integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rep_codes
  SET total_sales_cents = total_sales_cents + _sales,
      total_commission_cents = total_commission_cents + _commission
  WHERE code = _code AND is_active = true;
END;
$$;
