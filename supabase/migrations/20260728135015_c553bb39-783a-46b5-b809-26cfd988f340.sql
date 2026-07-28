UPDATE public.forensic_scans
SET report = jsonb_set(report::jsonb, '{fully_generic}', 'true'::jsonb, true)
WHERE report::text ~ 'standard SMB leak math|Ranges shown are floors|scanned across every forensic tool';