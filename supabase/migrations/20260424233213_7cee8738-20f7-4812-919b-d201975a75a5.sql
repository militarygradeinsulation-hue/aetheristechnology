UPDATE public.accounts
SET last_sync_status = 'error',
    last_sync_error = 'Sync interrupted by edge function timeout. Click "Restart sync" to start a fresh sync — it now resumes automatically across multiple invocations.',
    sync_progress = '{}'::jsonb
WHERE last_sync_status = 'running';