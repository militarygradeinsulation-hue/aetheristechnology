UPDATE public.accounts
SET last_sync_status = 'error',
    last_sync_error = 'Sync interrupted — please click Restart sync',
    sync_progress = '{}'::jsonb
WHERE id = 'd377593f-babb-4f6f-be8a-19ed1fbd5bee'
  AND last_sync_status = 'running';