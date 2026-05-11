
-- 1. Helper: derive a clean local-part from a rep_name (first word, lowercased, alphanum only)
CREATE OR REPLACE FUNCTION public.rep_mailbox_local_part(_rep_name text, _code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(regexp_replace(lower(split_part(_rep_name, ' ', 1)), '[^a-z0-9]', '', 'g'), ''),
    'rep' || _code
  );
$$;

-- 2. Trigger: auto-provision mailbox + set rep_email on new rep_codes rows
CREATE OR REPLACE FUNCTION public.auto_provision_rep_mailbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _local text;
  _addr text;
  _suffix int := 0;
BEGIN
  _local := public.rep_mailbox_local_part(NEW.rep_name, NEW.code);
  _addr  := _local || '@aetheris.technology';

  -- Resolve collisions by appending a numeric suffix
  WHILE EXISTS (SELECT 1 FROM public.rep_mailboxes WHERE address = _addr) LOOP
    _suffix := _suffix + 1;
    _addr := _local || _suffix::text || '@aetheris.technology';
  END LOOP;

  INSERT INTO public.rep_mailboxes (code, address, is_active)
  VALUES (NEW.code, _addr, true)
  ON CONFLICT (code) DO NOTHING;

  IF NEW.rep_email IS NULL OR NEW.rep_email = '' THEN
    NEW.rep_email := _addr;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_provision_rep_mailbox ON public.rep_codes;
CREATE TRIGGER trg_auto_provision_rep_mailbox
BEFORE INSERT ON public.rep_codes
FOR EACH ROW EXECUTE FUNCTION public.auto_provision_rep_mailbox();

-- 3. Trigger: keep rep_codes.rep_email in sync if the mailbox address ever changes
CREATE OR REPLACE FUNCTION public.sync_rep_email_from_mailbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rep_codes
     SET rep_email = NEW.address
   WHERE code = NEW.code
     AND (rep_email IS NULL OR rep_email = '' OR rep_email IS DISTINCT FROM NEW.address);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rep_email_from_mailbox ON public.rep_mailboxes;
CREATE TRIGGER trg_sync_rep_email_from_mailbox
AFTER INSERT OR UPDATE OF address ON public.rep_mailboxes
FOR EACH ROW EXECUTE FUNCTION public.sync_rep_email_from_mailbox();

-- 4. Backfill: copy mailbox address into rep_codes.rep_email for existing reps with NULL/empty email
UPDATE public.rep_codes rc
   SET rep_email = m.address
  FROM public.rep_mailboxes m
 WHERE m.code = rc.code
   AND (rc.rep_email IS NULL OR rc.rep_email = '');
