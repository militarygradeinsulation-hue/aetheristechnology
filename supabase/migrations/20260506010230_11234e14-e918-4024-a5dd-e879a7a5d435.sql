ALTER TABLE public.shared_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.shared_notes REPLICA IDENTITY FULL;
ALTER TABLE public.shared_files REPLICA IDENTITY FULL;
ALTER TABLE public.shared_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_notifications;