-- 1. Drop public-readable drip_prospects audit data
DROP POLICY IF EXISTS "Public can view completed audits" ON public.drip_prospects;

-- 2. Lock training-uploads writes to service_role only (keep public read for delivery)
DROP POLICY IF EXISTS "training-uploads insert" ON storage.objects;
DROP POLICY IF EXISTS "training-uploads update" ON storage.objects;
DROP POLICY IF EXISTS "training-uploads delete" ON storage.objects;
CREATE POLICY "training-uploads service insert"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'training-uploads' AND auth.role() = 'service_role');
CREATE POLICY "training-uploads service update"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'training-uploads' AND auth.role() = 'service_role');
CREATE POLICY "training-uploads service delete"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'training-uploads' AND auth.role() = 'service_role');

-- 3. team_messages: only service role (edge function) can SELECT
DROP POLICY IF EXISTS "team_messages readable by all" ON public.team_messages;
CREATE POLICY "team_messages service read"
  ON public.team_messages FOR SELECT TO public
  USING (auth.role() = 'service_role');

-- 4. shared_* tables: split open ALL into open writes + service-only reads
DROP POLICY IF EXISTS "shared_tasks_all" ON public.shared_tasks;
CREATE POLICY "shared_tasks_insert_open" ON public.shared_tasks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "shared_tasks_update_open" ON public.shared_tasks FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "shared_tasks_delete_open" ON public.shared_tasks FOR DELETE TO public USING (true);
CREATE POLICY "shared_tasks_select_service" ON public.shared_tasks FOR SELECT TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "shared_notes_all" ON public.shared_notes;
CREATE POLICY "shared_notes_insert_open" ON public.shared_notes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "shared_notes_update_open" ON public.shared_notes FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "shared_notes_delete_open" ON public.shared_notes FOR DELETE TO public USING (true);
CREATE POLICY "shared_notes_select_service" ON public.shared_notes FOR SELECT TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "shared_files_all" ON public.shared_files;
CREATE POLICY "shared_files_insert_open" ON public.shared_files FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "shared_files_update_open" ON public.shared_files FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "shared_files_delete_open" ON public.shared_files FOR DELETE TO public USING (true);
CREATE POLICY "shared_files_select_service" ON public.shared_files FOR SELECT TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "shared_notifs_all" ON public.shared_notifications;
CREATE POLICY "shared_notifs_insert_open" ON public.shared_notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "shared_notifs_update_open" ON public.shared_notifications FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "shared_notifs_delete_open" ON public.shared_notifications FOR DELETE TO public USING (true);
CREATE POLICY "shared_notifs_select_service" ON public.shared_notifications FOR SELECT TO public USING (auth.role() = 'service_role');