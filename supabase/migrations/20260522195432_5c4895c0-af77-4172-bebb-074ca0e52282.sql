
-- 1. shared_interviews: drop open public policies, allow service role only
DROP POLICY IF EXISTS shared_interviews_select_open ON public.shared_interviews;
DROP POLICY IF EXISTS shared_interviews_insert_open ON public.shared_interviews;
DROP POLICY IF EXISTS shared_interviews_update_open ON public.shared_interviews;
DROP POLICY IF EXISTS shared_interviews_delete_open ON public.shared_interviews;
CREATE POLICY shared_interviews_service_all ON public.shared_interviews
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. shared_tasks / notes / files / notifications: restrict writes/deletes to service role
DROP POLICY IF EXISTS shared_tasks_insert_open ON public.shared_tasks;
DROP POLICY IF EXISTS shared_tasks_update_open ON public.shared_tasks;
DROP POLICY IF EXISTS shared_tasks_delete_open ON public.shared_tasks;
CREATE POLICY shared_tasks_service_write ON public.shared_tasks
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_tasks_service_update ON public.shared_tasks
  FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_tasks_service_delete ON public.shared_tasks
  FOR DELETE TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS shared_notes_insert_open ON public.shared_notes;
DROP POLICY IF EXISTS shared_notes_update_open ON public.shared_notes;
DROP POLICY IF EXISTS shared_notes_delete_open ON public.shared_notes;
CREATE POLICY shared_notes_service_write ON public.shared_notes
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_notes_service_update ON public.shared_notes
  FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_notes_service_delete ON public.shared_notes
  FOR DELETE TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS shared_files_insert_open ON public.shared_files;
DROP POLICY IF EXISTS shared_files_update_open ON public.shared_files;
DROP POLICY IF EXISTS shared_files_delete_open ON public.shared_files;
CREATE POLICY shared_files_service_write ON public.shared_files
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_files_service_update ON public.shared_files
  FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_files_service_delete ON public.shared_files
  FOR DELETE TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS shared_notifs_insert_open ON public.shared_notifications;
DROP POLICY IF EXISTS shared_notifs_update_open ON public.shared_notifications;
DROP POLICY IF EXISTS shared_notifs_delete_open ON public.shared_notifications;
CREATE POLICY shared_notifs_service_write ON public.shared_notifications
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_notifs_service_update ON public.shared_notifications
  FOR UPDATE TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY shared_notifs_service_delete ON public.shared_notifications
  FOR DELETE TO public USING (auth.role() = 'service_role');

-- 3. onboarding_progress: restrict reads to service role (was public-readable)
DROP POLICY IF EXISTS "Anyone can view onboarding progress" ON public.onboarding_progress;
CREATE POLICY onboarding_progress_service_select ON public.onboarding_progress
  FOR SELECT TO public USING (auth.role() = 'service_role');

-- 4. Storage: lock down workspace-files writes/updates/deletes to service role
DROP POLICY IF EXISTS "workspace-files write" ON storage.objects;
DROP POLICY IF EXISTS "workspace-files update" ON storage.objects;
DROP POLICY IF EXISTS "workspace-files delete" ON storage.objects;
CREATE POLICY "workspace-files service insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'workspace-files' AND auth.role() = 'service_role');
CREATE POLICY "workspace-files service update" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'workspace-files' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'workspace-files' AND auth.role() = 'service_role');
CREATE POLICY "workspace-files service delete" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'workspace-files' AND auth.role() = 'service_role');

-- 5. Storage: lock down event-images writes/updates/deletes to service role
DROP POLICY IF EXISTS "Anyone can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete event images" ON storage.objects;
CREATE POLICY "event-images service insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'service_role');
CREATE POLICY "event-images service update" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'event-images' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'service_role');
CREATE POLICY "event-images service delete" ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'event-images' AND auth.role() = 'service_role');

-- 6. Fix mutable search_path on the only public function still missing it
CREATE OR REPLACE FUNCTION public.rep_mailbox_local_part(_rep_name text, _code text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    NULLIF(regexp_replace(lower(split_part(_rep_name, ' ', 1)), '[^a-z0-9]', '', 'g'), ''),
    'rep' || _code
  );
$function$;
