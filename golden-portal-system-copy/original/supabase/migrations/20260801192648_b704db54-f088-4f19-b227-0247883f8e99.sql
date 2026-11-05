UPDATE public.forensic_scans
SET report_source = 'admin_internal',
    portal_source = 'verification_test',
    creator_name = COALESCE(creator_name, 'Aetheris verification test'),
    updated_at = now()
WHERE id IN (
  '7d2e39be-9a71-4738-9049-45767d9bbb4c',
  '096d08d2-d083-494e-95de-b5ca5ba62431'
);