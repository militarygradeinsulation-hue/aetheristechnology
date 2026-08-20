DROP POLICY IF EXISTS "system event bus service only" ON public.company_system_event_bus;
DROP POLICY IF EXISTS "system teams service only" ON public.company_system_teams;
DROP POLICY IF EXISTS "system tasks service only" ON public.company_system_tasks;
DROP POLICY IF EXISTS "system playbooks service only" ON public.company_system_playbooks;

REVOKE ALL ON public.company_system_event_bus FROM anon, authenticated;
REVOKE ALL ON public.company_system_teams FROM anon, authenticated;
REVOKE ALL ON public.company_system_tasks FROM anon, authenticated;
REVOKE ALL ON public.company_system_playbooks FROM anon, authenticated;

GRANT ALL ON public.company_system_event_bus TO service_role;
GRANT ALL ON public.company_system_teams TO service_role;
GRANT ALL ON public.company_system_tasks TO service_role;
GRANT ALL ON public.company_system_playbooks TO service_role;

CREATE POLICY "event bus service role only" ON public.company_system_event_bus
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "teams service role only" ON public.company_system_teams
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "tasks service role only" ON public.company_system_tasks
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "playbooks service role only" ON public.company_system_playbooks
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');