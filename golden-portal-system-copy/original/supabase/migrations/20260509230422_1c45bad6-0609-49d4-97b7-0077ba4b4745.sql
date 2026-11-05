
-- Mailboxes (one assigned address per rep)
CREATE TABLE public.rep_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE REFERENCES public.rep_codes(code) ON DELETE CASCADE,
  address text NOT NULL UNIQUE,
  signature text,
  forwarding_to text,
  auto_reply_enabled boolean NOT NULL DEFAULT false,
  auto_reply_body text,
  is_active boolean NOT NULL DEFAULT true,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rep_mailboxes_address_lower ON public.rep_mailboxes (lower(address));

ALTER TABLE public.rep_mailboxes ENABLE ROW LEVEL SECURITY;
-- No policies: only edge functions using service role can access.

CREATE TRIGGER trg_rep_mailboxes_updated_at
BEFORE UPDATE ON public.rep_mailboxes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE public.rep_email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_address text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  folder text NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox','sent','drafts','trash')),
  from_address text NOT NULL,
  from_name text,
  to_addresses text[] NOT NULL DEFAULT '{}',
  cc_addresses text[] NOT NULL DEFAULT '{}',
  bcc_addresses text[] NOT NULL DEFAULT '{}',
  subject text,
  body_text text,
  body_html text,
  message_id text,
  in_reply_to text,
  thread_id text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_mime_path text,
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rep_messages_mailbox_folder_created
  ON public.rep_email_messages (mailbox_address, folder, created_at DESC);
CREATE INDEX idx_rep_messages_thread ON public.rep_email_messages (thread_id);
CREATE INDEX idx_rep_messages_message_id ON public.rep_email_messages (message_id);

ALTER TABLE public.rep_email_messages ENABLE ROW LEVEL SECURITY;
-- No policies: only edge functions using service role can access.

-- Storage bucket for attachments (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rep-email-attachments', 'rep-email-attachments', false)
ON CONFLICT (id) DO NOTHING;
