import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getAdminToken } from '@/lib/adminAuth';

type Msg = { role: 'user' | 'assistant'; content: string; suggestions?: string[] };

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assistant`;
const STORAGE_KEY = 'admin_assistant_conversation';

const INITIAL_MESSAGE: Msg = {
  role: 'assistant',
  content:
    "**Operator Assistant online.** I can pull live data from the database and answer anything about the site, pricing, reps, leads, audits, blog, drip — anything. Ask away.",
  suggestions: [
    'Give me a dashboard summary',
    'Show unread contact submissions',
    'How many leads in the last 24h?',
  ],
};

const SUGGESTIONS_RE = /<suggestions>\s*(\[[\s\S]*?\])\s*<\/suggestions>\s*$/i;

const parseSuggestions = (text: string): { clean: string; suggestions?: string[] } => {
  const m = text.match(SUGGESTIONS_RE);
  if (!m) return { clean: text.trim() };
  try {
    const arr = JSON.parse(m[1]);
    if (Array.isArray(arr) && arr.every((s) => typeof s === 'string')) {
      return { clean: text.replace(SUGGESTIONS_RE, '').trim(), suggestions: arr.slice(0, 3) };
    }
  } catch {
    /* ignore */
  }
  return { clean: text.replace(SUGGESTIONS_RE, '').trim() };
};

export const AdminAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === 'undefined') return [INITIAL_MESSAGE];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore quota */
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const runChat = useCallback(
    async (text: string) => {
      if (!text || isLoading) return;
      const userMsg: Msg = { role: 'user', content: text };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput('');
      setIsLoading(true);

      try {
        const token = getAdminToken();
        if (!token) throw new Error('Admin session expired. Log in again.');

        const res = await fetch(ASSISTANT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token,
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
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: clean || '(no response)', suggestions },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `**Error:** ${e instanceof Error ? e.message : 'Unknown error'}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runChat(input.trim());
  };

  const resetConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Operator Assistant"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 rounded-full bg-amber px-4 py-3 text-background shadow-lg shadow-amber/30 hover:shadow-amber/50 transition-shadow"
        >
          <Wrench className="w-4 h-4" />
          <span className="font-mono text-xs uppercase tracking-wider font-bold">Operator</span>
          <MessageCircle className="w-4 h-4" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-3rem))] flex flex-col rounded-xl border border-amber/40 bg-background/95 backdrop-blur shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header — case-file styling */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber/30 bg-card/60">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                Case File · Operator Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetConversation}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary/50 transition-colors"
                title="Reset conversation"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.map((msg, i) => {
              const isLastAssistant =
                msg.role === 'assistant' && i === messages.length - 1 && !isLoading;
              return (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-amber/20 text-foreground border border-amber/30'
                        : 'bg-secondary/40 text-foreground border border-border/50'
                    }`}
                  >
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
                          >
                            {s}
                          </button>
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
                  <span className="font-mono text-xs">Querying live data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-border/50 p-3 flex items-center gap-2 bg-card/40"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything — leads, reps, blog, audits..."
              disabled={isLoading}
              className="flex-1 bg-background/60 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber/60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-md bg-amber text-background hover:bg-amber/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
