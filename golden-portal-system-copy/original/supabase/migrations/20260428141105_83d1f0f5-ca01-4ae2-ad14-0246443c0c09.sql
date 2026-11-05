ALTER TABLE public.audit_runs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_audit_runs_deleted_at ON public.audit_runs(account_id, deleted_at);

DROP POLICY IF EXISTS "Users update their own audit runs" ON public.audit_runs;
CREATE POLICY "Users update their own audit runs"
ON public.audit_runs
FOR UPDATE
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users delete their own audit runs" ON public.audit_runs;
CREATE POLICY "Users delete their own audit runs"
ON public.audit_runs
FOR DELETE
USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));