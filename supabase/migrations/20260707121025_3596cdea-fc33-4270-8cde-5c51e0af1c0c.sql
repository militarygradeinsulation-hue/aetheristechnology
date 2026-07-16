
ALTER TABLE public.rep_codes 
  ADD COLUMN IF NOT EXISTS certification_id TEXT,
  ADD COLUMN IF NOT EXISTS certification_image_url TEXT,
  ADD COLUMN IF NOT EXISTS certification_issued_at DATE,
  ADD COLUMN IF NOT EXISTS certification_valid_until DATE;

UPDATE public.rep_codes SET certification_id='AO-2025-00001', certification_issued_at='2025-05-20', certification_valid_until='2027-05-20' WHERE code='163675';
UPDATE public.rep_codes SET certification_id='AO-2025-00002', certification_issued_at='2026-06-07', certification_valid_until='2027-06-07' WHERE code='963169';
UPDATE public.rep_codes SET certification_id='AO-2025-00004', certification_issued_at='2026-06-07', certification_valid_until='2027-06-07' WHERE code='482917';
