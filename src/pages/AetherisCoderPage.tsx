import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Lock, Eye, Code2, ArrowRight } from 'lucide-react';
import { useTrackEvent } from '@/hooks/useTrackEvent';

type Msg = { role: 'user' | 'assistant'; content: string; verify?: string[] };
type Memory = { summary: string; locked: string[]; verify: string[] };
type Session = { messages: Msg[]; html: string; memory: Memory };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aetheris-coder-chat`;
const STORAGE_KEY = 'aetheris_coder_session_v1';

const INITIAL_MESSAGE: Msg = {
  role: 'assistant',
  content: "Aetheris Obsidian. Powered by Gemini 2.5 Pro, Claude 3.5 Sonnet, and GPT-4 Turbo. Just describe what you need—I'll understand and build it right the first time.",
};

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const AetherisCoderPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const { trackEvent } = useTrackEvent();
  const saved = useRef(loadSession()).current;
  const hasBuilt = useRef(!!saved?.html);

  const [messages, setMessages] = useState<Msg[]>(saved?.messages ?? [INITIAL_MESSAGE]);
  const [html, setHtml] = useState(saved?.html ?? '');
  const [memory, setMemory] = useState<Memory>(saved?.memory ?? { summary: '', locked: [], verify: [] });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, html, memory }));
  }, [messages, html, memory]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setError(null);
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setInput('');
      setLoading(true);
      trackEvent('click', { label: 'aetheris_coder_chat_send', location: 'aetheris_coder' });

      try {
        const resp = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ message: trimmed, currentHtml: html, locked: memory.locked }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Something went wrong.');

        const verify = Array.isArray(data.memory?.verify) ? data.memory.verify : undefined;
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Done.', verify }]);

        if (typeof data.html === 'string' && data.html.trim()) {
          setHtml(data.html);
          if (!hasBuilt.current) {
            hasBuilt.current = true;
            trackEvent('click', { label: 'aetheris_coder_first_build', location: 'aetheris_coder' });
          }
        }
        if (data.memory) {
          setMemory({
            summary: typeof data.memory.summary === 'string' ? data.memory.summary : memory.summary,
            locked: Array.isArray(data.memory.locked) ? data.memory.locked : memory.locked,
            verify: verify ?? [],
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [loading, html, memory, trackEvent]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Aetheris Obsidian — Multi-AI Code Generator | Aetheris"
        description="Build production-ready code in minutes. Powered by Gemini, Claude, and GPT-4 working in perfect sync. The world's best AI models for coding, combined."
        path="/aetheris-coder"
        keywords="AI code generator, obsidian coder, multi-AI, production-ready, gemini, claude, gpt-4, code generation"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Aetheris Obsidian', path: '/aetheris-coder' },
        ]}
      />
      <Background />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <div className="pt-32 pb-4 px-4 text-center">
          <span className="font-case text-[10px] uppercase tracking-widest text-amber">Free Tool · Gemini + Claude + GPT-4</span>
          <h1 className="font-forensic text-3xl md:text-4xl font-bold text-amber mt-2">Aetheris Obsidian</h1>
          <p className="text-muted-foreground mt-1">The world's best AI models for coding. Production-ready code. Zero setup.</p>
        </div>

        <div className="flex-1 px-4 pb-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 h-[72vh] min-h-[520px]">
            {/* Chat */}
            <div className="glass rounded-lg border border-border flex flex-col overflow-hidden">
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={
                        m.role === 'user'
                          ? 'max-w-[85%] rounded-lg rounded-tr-sm bg-amber text-background px-3.5 py-2 text-sm'
                          : 'max-w-[85%] rounded-lg rounded-tl-sm bg-secondary text-foreground px-3.5 py-2 text-sm'
                      }
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.verify && m.verify.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted-foreground border-t border-border/50 pt-1.5">
                          Double-check: {m.verify.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg rounded-tl-sm bg-secondary text-muted-foreground px-3.5 py-2 text-sm inline-flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Building…
                    </div>
                  </div>
                )}
                {error && <p className="text-xs text-crimson">{error}</p>}
              </div>
              <form onSubmit={onSubmit} className="border-t border-border p-3 flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  maxLength={800}
                  placeholder="What do you want to build?"
                  className="flex-1 resize-none bg-background border border-input rounded-md px-3 py-2 text-sm max-h-28"
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()} className="bg-amber hover:bg-amber/90 text-background shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>

            {/* Sandbox */}
            <div className="glass rounded-lg border border-border flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setView('preview')}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === 'preview' ? 'bg-amber/15 text-amber' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => setView('code')}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${view === 'code' ? 'bg-amber/15 text-amber' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Code
                  </button>
                </div>
                {memory.locked.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {memory.locked.slice(0, 4).map((item) => (
                      <span key={item} className="inline-flex items-center gap-1 text-[10px] font-case uppercase tracking-wide text-muted-foreground border border-border rounded-full px-2 py-0.5">
                        <Lock className="w-2.5 h-2.5 text-amber" /> {item}
                      </span>
                    ))}
                    {memory.locked.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{memory.locked.length - 4}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 bg-white relative">
                {!html ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background text-muted-foreground text-sm px-6 text-center">
                    Nothing built yet — tell it what you want on the left.
                  </div>
                ) : view === 'preview' ? (
                  <iframe title="Sandbox preview" srcDoc={html} sandbox="allow-scripts allow-forms" className="w-full h-full border-0" />
                ) : (
                  <pre className="w-full h-full overflow-auto bg-background text-muted-foreground text-xs font-case p-4 whitespace-pre-wrap">{html}</pre>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 text-center">
          <p className="text-xs text-muted-foreground">
            Need this production-ready?{' '}
            <Link to="/leak-audit" className="text-amber hover:underline inline-flex items-center gap-1">
              Run the Free Leak Audit™ <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AetherisCoderPage;
