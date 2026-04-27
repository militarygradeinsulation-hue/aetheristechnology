-- Conversations
CREATE TABLE public.assistant_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_conversations_account ON public.assistant_conversations(account_id, updated_at DESC);

ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversations"
  ON public.assistant_conversations FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own conversations"
  ON public.assistant_conversations FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users update own conversations"
  ON public.assistant_conversations FOR UPDATE
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users delete own conversations"
  ON public.assistant_conversations FOR DELETE
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE TRIGGER trg_assistant_conversations_updated
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages
CREATE TABLE public.assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  tool_call_id TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_messages_conversation ON public.assistant_messages(conversation_id, created_at);

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages"
  ON public.assistant_messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM public.assistant_conversations
    WHERE account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  ) OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own messages"
  ON public.assistant_messages FOR INSERT
  WITH CHECK (conversation_id IN (
    SELECT id FROM public.assistant_conversations
    WHERE account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users delete own messages"
  ON public.assistant_messages FOR DELETE
  USING (conversation_id IN (
    SELECT id FROM public.assistant_conversations
    WHERE account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid())
  ));

-- Actions (audit trail + undo source)
CREATE TABLE public.assistant_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.assistant_messages(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  before_state JSONB,
  after_state JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executing','success','error','undone')),
  error_message TEXT,
  affected_count INTEGER,
  executed_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_actions_account ON public.assistant_actions(account_id, created_at DESC);
CREATE INDEX idx_assistant_actions_conversation ON public.assistant_actions(conversation_id, created_at DESC);

ALTER TABLE public.assistant_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own actions"
  ON public.assistant_actions FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own actions"
  ON public.assistant_actions FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users update own actions"
  ON public.assistant_actions FOR UPDATE
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

CREATE TRIGGER trg_assistant_actions_updated
  BEFORE UPDATE ON public.assistant_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();