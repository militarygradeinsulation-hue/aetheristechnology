
-- Drop old check constraints
ALTER TABLE public.shared_tasks DROP CONSTRAINT IF EXISTS shared_tasks_owner_check;
ALTER TABLE public.shared_tasks DROP CONSTRAINT IF EXISTS shared_tasks_assignee_check;
ALTER TABLE public.shared_notes DROP CONSTRAINT IF EXISTS shared_notes_author_check;
ALTER TABLE public.shared_files DROP CONSTRAINT IF EXISTS shared_files_uploader_check;
ALTER TABLE public.shared_notifications DROP CONSTRAINT IF EXISTS shared_notifications_recipient_check;
ALTER TABLE public.shared_interviews DROP CONSTRAINT IF EXISTS shared_interviews_interviewer_check;
ALTER TABLE public.shared_interviews DROP CONSTRAINT IF EXISTS shared_interviews_created_by_check;

-- Update existing data
UPDATE public.shared_tasks SET owner = 'braden' WHERE owner = 'bradon';
UPDATE public.shared_tasks SET assignee = 'braden' WHERE assignee = 'bradon';
UPDATE public.shared_notes SET author = 'braden' WHERE author = 'bradon';
UPDATE public.shared_files SET uploader = 'braden' WHERE uploader = 'bradon';
UPDATE public.shared_notifications SET recipient = 'braden' WHERE recipient = 'bradon';
UPDATE public.shared_interviews SET interviewer = 'braden' WHERE interviewer = 'bradon';
UPDATE public.shared_interviews SET created_by = 'braden' WHERE created_by = 'bradon';

-- Re-add check constraints with new value
ALTER TABLE public.shared_tasks ADD CONSTRAINT shared_tasks_owner_check CHECK (owner IN ('admin','braden'));
ALTER TABLE public.shared_tasks ADD CONSTRAINT shared_tasks_assignee_check CHECK (assignee IN ('admin','braden'));
ALTER TABLE public.shared_notes ADD CONSTRAINT shared_notes_author_check CHECK (author IN ('admin','braden'));
ALTER TABLE public.shared_files ADD CONSTRAINT shared_files_uploader_check CHECK (uploader IN ('admin','braden'));
ALTER TABLE public.shared_notifications ADD CONSTRAINT shared_notifications_recipient_check CHECK (recipient IN ('admin','braden'));
ALTER TABLE public.shared_interviews ADD CONSTRAINT shared_interviews_interviewer_check CHECK (interviewer IN ('admin','braden','both'));
ALTER TABLE public.shared_interviews ADD CONSTRAINT shared_interviews_created_by_check CHECK (created_by IN ('admin','braden'));
