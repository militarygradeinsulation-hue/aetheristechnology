import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { updateAdminLibraryItem, type AdminLibraryItem } from '@/lib/adminLibrary';
import ReactMarkdown from 'react-markdown';

interface Props {
  item: AdminLibraryItem;
  onClose: () => void;
  onItemUpdated: (item: AdminLibraryItem) => void;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const TOOL_LABELS: Record<string, string> = {
  social_content: 'Social Content',
  sales_scripts: 'Sales Scripts',
  content_calendar: 'Content Calendar',
  follow_up_plan: 'Follow-Up Plan',
  strategic_questions: 'Strategic Questions',
  brand_contradictions: 'Brand Contradictions',
  friction_audit: 'Friction Audit',
  playbook: 'Playbook',
};

export const ContentAI: React.FC<Props> = ({ item, onClose, onItemUpdated }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingOutput, setPendingOutput] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setStreaming(true);

    let assistantSoFar = '';

    try {
      const token = getAdminToken();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-admin-token': token || '',
        },
        body: JSON.stringify({
          messages: allMessages,
          context: { tool_type: item.tool_type, output_data: item.output_data },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Error ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            // Check for tool calls (modified content)
            const tc = parsed.choices?.[0]?.delta?.tool_calls?.[0];
            if (tc?.function?.arguments) {
              // Accumulate tool call args
              assistantSoFar += tc.function.arguments;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }

            // Check finish_reason for tool_calls
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason === 'tool_calls' || finishReason === 'stop') {
              // Try parsing accumulated tool args as JSON
              try {
                const modified = JSON.parse(assistantSoFar);
                if (modified && typeof modified === 'object') {
                  setPendingOutput(modified as Record<string, unknown>);
                  setMessages(prev => {
                    const hasAssistant = prev[prev.length - 1]?.role === 'assistant';
                    const msg = '✅ Modified content ready. Click **Save Changes** to apply.';
                    if (hasAssistant) return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: msg } : m);
                    return [...prev, { role: 'assistant', content: msg }];
                  });
                  assistantSoFar = '';
                }
              } catch {
                // Not a tool call, just regular text — already rendered
              }
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (!messages.find(m => m.role === 'assistant') && assistantSoFar) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') return prev;
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      }
    } catch (e: any) {
      toast({ title: 'AI error', description: e.message, variant: 'destructive' });
    } finally {
      setStreaming(false);
    }
  };

  const handleSave = async () => {
    if (!pendingOutput) return;
    setSaving(true);
    try {
      const updated = await updateAdminLibraryItem(item.id, pendingOutput);
      onItemUpdated(updated);
      setPendingOutput(null);
      toast({ title: 'Content updated' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4">
      <div className="bg-background rounded-t-xl sm:rounded-xl w-full sm:w-[420px] h-[85vh] sm:h-[80vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-xs text-amber font-bold uppercase">{TOOL_LABELS[item.tool_type] || item.tool_type}</p>
            <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-xs mt-8 space-y-2">
              <p className="font-bold">Content AI Editor</p>
              <p>Try: "Add John Smith's name to this" or "Change the industry to HVAC" or "Make the hook more aggressive"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : m.content}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Save bar */}
        {pendingOutput && (
          <div className="p-3 border-t border-border bg-amber/5">
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Tell the AI what to change..."
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={streaming}
          />
          <Button size="icon" onClick={send} disabled={streaming || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
