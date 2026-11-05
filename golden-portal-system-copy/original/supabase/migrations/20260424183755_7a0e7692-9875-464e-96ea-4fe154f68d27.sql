DELETE FROM public.mirror_contacts WHERE account_id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';
DELETE FROM public.mirror_deals WHERE account_id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';
DELETE FROM public.mirror_engagements WHERE account_id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';
DELETE FROM public.mirror_owners WHERE account_id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';
UPDATE public.accounts SET last_sync_status = NULL, last_sync_error = NULL, sync_progress = '{}'::jsonb WHERE id = '31916151-ef5b-463f-bc24-2ed1a91ccfee';