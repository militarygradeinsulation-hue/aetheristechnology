
ALTER TABLE public.rep_mailboxes
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS forward_inbound boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mask_outbound boolean NOT NULL DEFAULT true;

-- When personal_email is set, mirror it to rep_codes.rep_email (rep account email of record).
CREATE OR REPLACE FUNCTION public.sync_rep_personal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.personal_email IS NOT NULL AND NEW.personal_email <> '' THEN
    UPDATE public.rep_codes
       SET rep_email = NEW.personal_email
     WHERE code = NEW.code;
  END IF;
  -- If forward_inbound is on, keep forwarding_to in sync with personal_email.
  IF NEW.forward_inbound = true AND NEW.personal_email IS NOT NULL AND NEW.personal_email <> '' THEN
    NEW.forwarding_to := lower(NEW.personal_email);
  ELSIF NEW.forward_inbound = false THEN
    -- Only auto-clear if forwarding_to matches the personal_email
    IF NEW.forwarding_to IS NOT NULL AND NEW.personal_email IS NOT NULL
       AND lower(NEW.forwarding_to) = lower(NEW.personal_email) THEN
      NEW.forwarding_to := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rep_personal_email ON public.rep_mailboxes;
CREATE TRIGGER trg_sync_rep_personal_email
BEFORE INSERT OR UPDATE OF personal_email, forward_inbound ON public.rep_mailboxes
FOR EACH ROW EXECUTE FUNCTION public.sync_rep_personal_email();
