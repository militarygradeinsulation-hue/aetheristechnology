import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProposedAction = {
  tool_call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  summary: string;
  affected: number;
  sample?: unknown[];
  before?: unknown;
};

export type AssistantMessage = {
  id?: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  proposed_actions?: ProposedAction[];
  action_id?: string;
  created_at?: string;
};

export function useAssistant(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history when conversation id changes
  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("assistant_messages")
        .select("id,role,content,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages(
        (data || [])
          .filter((m: any) => m.role !== "tool" && (m.content || "").trim())
          .map((m: any) => ({ id: m.id, role: m.role, content: m.content, created_at: m.created_at })),
      );
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  const send = useCallback(async (text: string, imageDataUrl?: string | null) => {
    if ((!text.trim() && !imageDataUrl) || sending) return;
    setError(null);
    setSending(true);
    const userContent = imageDataUrl
      ? `${text || "Explain what's in this screenshot."}\n\n![screenshot](${imageDataUrl})`
      : text;
    setMessages((prev) => [...prev, { role: "user", content: userContent }]);
    try {
      const { data, error: err } = await supabase.functions.invoke("assistant-chat", {
        body: {
          conversation_id: conversationId,
          message: text || "Explain what's in this screenshot.",
          image: imageDataUrl || undefined,
        },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      if (data?.conversation_id && !conversationId) setConversationId(data.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.content || "",
          proposed_actions: data?.proposed_actions || [],
        },
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }, [conversationId, sending]);

  const confirmAction = useCallback(async (action: ProposedAction) => {
    setSending(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke("assistant-execute", {
        body: { conversation_id: conversationId, tool_name: action.tool_name, args: action.args },
      });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✓ ${data?.message || "Done."}`,
          action_id: data?.action_id,
        },
      ]);
    } catch (e: any) {
      setError(e?.message || "Action failed");
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${e?.message || "Action failed"}` }]);
    } finally {
      setSending(false);
    }
  }, [conversationId]);

  const undoAction = useCallback(async (action_id: string) => {
    try {
      const { data, error: err } = await supabase.functions.invoke("assistant-undo", { body: { action_id } });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: "↩︎ Undone." }]);
    } catch (e: any) {
      setError(e?.message || "Undo failed");
    }
  }, []);

  return { conversationId, messages, sending, error, send, confirmAction, undoAction, setConversationId };
}
