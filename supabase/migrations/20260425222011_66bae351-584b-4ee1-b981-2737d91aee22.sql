UPDATE public.accounts
SET last_sync_status = NULL,
    last_sync_error = NULL,
    sync_progress = '{}'::jsonb
WHERE id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';