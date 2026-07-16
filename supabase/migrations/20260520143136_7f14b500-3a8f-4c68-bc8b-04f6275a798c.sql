-- Drop old trigger + function
DROP TRIGGER IF EXISTS trg_auto_provision_rep_mailbox ON public.rep_codes;
DROP FUNCTION IF EXISTS public.auto_provision_rep_mailbox();

-- BEFORE INSERT: compute address, set rep_email if missing, stash address in a temp column-like via session? 
-- Simpler: just set rep_email here; AFTER trigger will recompute the same address deterministically.
CREATE OR REPLACE FUNCTION public.before_rep_set_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _local text;
  _addr text;
  _suffix int := 0;
BEGIN
  _local := public.rep_mailbox_local_part(NEW.rep_name, NEW.code);
  _addr  := _local || '@aetheris.technology';
  WHILE EXISTS (SELECT 1 FROM public.rep_mailboxes WHERE address = _addr) LOOP
    _suffix := _suffix + 1;
    _addr := _local || _suffix::text || '@aetheris.technology';
  END LOOP;
  IF NEW.rep_email IS NULL OR NEW.rep_email = '' THEN
    NEW.rep_email := _addr;
  END IF;
  RETURN NEW;
END;
$$;

-- AFTER INSERT: now safe to reference rep_codes.code
CREATE OR REPLACE FUNCTION public.after_rep_provision_mailbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _local text;
  _addr text;
  _suffix int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.rep_mailboxes WHERE code = NEW.code) THEN
    RETURN NEW;
  END IF;
  _local := public.rep_mailbox_local_part(NEW.rep_name, NEW.code);
  _addr  := COALESCE(NULLIF(NEW.rep_email, ''), _local || '@aetheris.technology');
  WHILE EXISTS (SELECT 1 FROM public.rep_mailboxes WHERE address = _addr) LOOP
    _suffix := _suffix + 1;
    _addr := _local || _suffix::text || '@aetheris.technology';
  END LOOP;
  INSERT INTO public.rep_mailboxes (code, address, is_active)
  VALUES (NEW.code, _addr, true)
  ON CONFLICT (code) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_before_rep_set_email
BEFORE INSERT ON public.rep_codes
FOR EACH ROW
EXECUTE FUNCTION public.before_rep_set_email();

CREATE TRIGGER trg_after_rep_provision_mailbox
AFTER INSERT ON public.rep_codes
FOR EACH ROW
EXECUTE FUNCTION public.after_rep_provision_mailbox();