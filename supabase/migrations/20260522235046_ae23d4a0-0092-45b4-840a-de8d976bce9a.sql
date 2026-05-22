DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'team_messages','team_message_reads',
    'shared_tasks','shared_notes','shared_files','shared_notifications',
    'company_calendar','rep_company_task_completions'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
