-- Defense-in-depth explicit deny for service-role-only tables.
-- service_role bypasses RLS, so these policies only block anon / authenticated.

-- onboarding_progress: lock write paths for client roles (SELECT already locked).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='onboarding_progress' AND policyname='onboarding_progress_client_deny_insert') THEN
    EXECUTE 'CREATE POLICY "onboarding_progress_client_deny_insert" ON public.onboarding_progress FOR INSERT TO anon, authenticated WITH CHECK (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='onboarding_progress' AND policyname='onboarding_progress_client_deny_update') THEN
    EXECUTE 'CREATE POLICY "onboarding_progress_client_deny_update" ON public.onboarding_progress FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='onboarding_progress' AND policyname='onboarding_progress_client_deny_delete') THEN
    EXECUTE 'CREATE POLICY "onboarding_progress_client_deny_delete" ON public.onboarding_progress FOR DELETE TO anon, authenticated USING (false)';
  END IF;
END $$;

-- outlook_oauth_state: ensure RLS on + explicit deny.
ALTER TABLE IF EXISTS public.outlook_oauth_state ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='outlook_oauth_state' AND policyname='outlook_oauth_state_client_deny_all') THEN
    EXECUTE 'CREATE POLICY "outlook_oauth_state_client_deny_all" ON public.outlook_oauth_state FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;

-- outlook_oauth_tokens: ensure RLS on + explicit deny.
ALTER TABLE IF EXISTS public.outlook_oauth_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='outlook_oauth_tokens' AND policyname='outlook_oauth_tokens_client_deny_all') THEN
    EXECUTE 'CREATE POLICY "outlook_oauth_tokens_client_deny_all" ON public.outlook_oauth_tokens FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;
