import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Target, Mic, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getPortalToken, getPortalProfile } from '@/lib/portalAuth';

type Msg = { role: 'user' | 'assistant'; content: string; suggestions?: string[] };

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rep-assistant`;
const STORAGE_KEY = 'aetheris_sales_coach_convo';

const SUGGESTIONS_RE = /<suggestions>\s*(\[[\s\S]*?\])\s*<\/suggestions>\s*$/i;

const parseSuggestions = (text: string): { clean: string; suggestions?: string[] } => {
  const m = text.match(SUGGESTIONS_RE);
  if (!m) return { clean: text.trim() };
  try {
    const arr = JSON.parse(m[1]);
    if (Array.isArray(arr) && arr.every((s) => typeof s === 'string')) {
      return { clean: text.replace(SUGGESTIONS_RE, '').trim(), suggestions: arr.slice(0, 3) };
    }
  } catch { /* ignore */ }
  return { clean: text.replace(SUGGESTIONS_RE, '').trim() };
};

interface Props {
  embedded?: boolean; // when true, renders inline (no floating bubble)
}

export const SalesCoachChat: React.FC<Props> = ({ embedded = false }) => {
  const profile = getPortalProfile();
  const isPartner = profile?.role === 'partner';

  const initialMessage: Msg = {
    role: 'assistant',
    content: isPartner
      ? "**Sales Coach + Company View online.** Ask me anything — coaching, scripts, objections, OR live company stats (leads, reps, submissions). I pull live data when you ask for numbers."
      : "**Sales Coach online.** Ask me anything: how to handle an objection, what to pitch a specific prospect, exact words for a follow-up email, commission math, or how to explain any service.",
    suggestions: isPartner
      ? ['Give me a company summary', 'Show recent leads', 'Coach me through a price objection']
      : ['Coach me through "too expensive"', 'Write a cold LinkedIn DM', 'What should I pitch a 10-person agency?'],
  };

  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === 'undefined') return [initialMessage];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [initialMessage];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const runChat = useCallback(async (text: string) => {
    if (!text || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      const token = getPortalToken();
      if (!token) throw new Error('Session expired. Sign in again.');

      const res = await fetch(ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      const { clean, suggestions } = parseSuggestions(String(data.content || ''));
      setMessages((prev) => [...prev, { role: 'assistant', content: clean || '(no response)', suggestions }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `**Error:** ${e instanceof Error ? e.message : 'Unknown error'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runChat(input.trim());
  };

  const reset = () => {
    setMessages([initialMessage]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const Panel = (
    <div className={
      embedded
        ? 'flex flex-col h-[640px] rounded-xl border border-amber/40 bg-background/95 backdrop-blur overflow-hidden'
        : 'fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] flex flex-col rounded-xl border border-amber/40 bg-background/95 backdrop-blur shadow-2xl shadow-black/60 overflow-hidden'
    }>
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber/30 bg-card/60">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
          Case File · Sales Coach{isPartner ? ' + Company View' : ''}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/50 transition-colors"
            title="Reset conversation"
          >Reset</button>
          {!embedded && (
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            ><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg, i) => {
          const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && !isLoading;
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-amber/20 text-foreground border border-amber/30'
                  : 'bg-secondary/40 text-foreground border border-border/50'
              }`}>
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-amber prose-code:text-amber prose-code:bg-background/40 prose-code:px-1 prose-code:rounded prose-code:before:hidden prose-code:after:hidden">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {isLastAssistant && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => runChat(s)}
                        className="text-xs px-2 py-1 rounded border border-amber/40 text-amber hover:bg-amber/10 transition-colors"
                      >{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary/40 border border-border/50 rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="font-mono text-xs">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border/50 p-3 flex items-center gap-2 bg-card/40">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isPartner ? 'Ask for company stats or sales coaching...' : 'Ask for a script, objection-buster, pitch advice...'}
          disabled={isLoading}
          className="flex-1 bg-background/60 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber/60"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-md bg-amber text-background hover:bg-amber/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send"
        ><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );

  if (embedded) return Panel;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Sales Coach"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 rounded-full bg-amber px-4 py-3 text-background shadow-lg shadow-amber/30 hover:shadow-amber/50 transition-shadow"
        >
          <Target className="w-4 h-4" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold">Coach</span>
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
      {isOpen && Panel}
    </>
  );
};
