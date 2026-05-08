import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Target, Mic, Square, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getPortalToken, getPortalProfile } from '@/lib/portalAuth';

type Attachment =
  | { kind: 'image'; name: string; dataUrl: string; mimeType: string }
  | { kind: 'text'; name: string; text: string; mimeType: string };

type Msg = { role: 'user' | 'assistant'; content: string; suggestions?: string[]; attachments?: Attachment[] };

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rep-assistant`;
const STORAGE_KEY = 'aetheris_sales_coach_convo';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_TEXT_CHARS = 60_000;

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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const buildApiContent = (text: string, atts: Attachment[]) => {
    const textParts: string[] = [];
    if (text) textParts.push(text);
    for (const a of atts) {
      if (a.kind === 'text') {
        textParts.push(`\n\n--- Attached document: ${a.name} ---\n${a.text}\n--- end ${a.name} ---`);
      }
    }
    const combinedText = textParts.join('').trim() || '(see attached)';
    const images = atts.filter((a): a is Extract<Attachment, { kind: 'image' }> => a.kind === 'image');
    if (images.length === 0) return combinedText;
    return [
      { type: 'text', text: combinedText },
      ...images.map((img) => ({ type: 'image_url', image_url: { url: img.dataUrl } })),
    ];
  };

  const runChat = useCallback(async (text: string, atts: Attachment[] = []) => {
    if ((!text && atts.length === 0) || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text || '(see attached)', attachments: atts.length ? atts : undefined };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const token = getPortalToken();
      if (!token) throw new Error('Session expired. Sign in again.');

      const apiMessages = next.map((m) => ({
        role: m.role,
        content: m.role === 'user' && m.attachments?.length
          ? buildApiContent(m.content === '(see attached)' ? '' : m.content, m.attachments)
          : m.content,
      }));

      const res = await fetch(ASSISTANT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
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
    runChat(input.trim(), attachments);
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: Attachment[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        errors.push(`${file.name}: too large (max 8 MB)`);
        continue;
      }
      const isImage = file.type.startsWith('image/');
      const isText = /^(text\/|application\/(json|xml|csv|x-yaml))/.test(file.type)
        || /\.(txt|md|csv|json|log|yml|yaml|xml|html|tsv)$/i.test(file.name);
      try {
        if (isImage) {
          const dataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = () => rej(r.error);
            r.readAsDataURL(file);
          });
          accepted.push({ kind: 'image', name: file.name, dataUrl, mimeType: file.type || 'image/png' });
        } else if (isText) {
          let text = await file.text();
          if (text.length > MAX_TEXT_CHARS) text = text.slice(0, MAX_TEXT_CHARS) + '\n…[truncated]';
          accepted.push({ kind: 'text', name: file.name, text, mimeType: file.type || 'text/plain' });
        } else {
          errors.push(`${file.name}: unsupported (use images, .txt, .md, .csv, .json)`);
        }
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : 'read failed'}`);
      }
    }
    if (accepted.length) setAttachments((p) => [...p, ...accepted]);
    if (errors.length) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `**Attachment issue:**\n${errors.map((e) => `- ${e}`).join('\n')}\n\nSupported: images (JPG/PNG/WEBP) and text files (.txt, .md, .csv, .json). PDFs aren't supported yet — paste the relevant text instead.`,
      }]);
    }
  }, []);

  const removeAttachment = (idx: number) => setAttachments((p) => p.filter((_, i) => i !== idx));

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        if (blob.size === 0) return;
        setIsTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          let bin = '';
          const bytes = new Uint8Array(buf);
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
          }
          const b64 = btoa(bin);
          const token = getPortalToken();
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-portal-token': token || '',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ audio: b64, mimeType: mime || 'audio/webm' }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Transcription failed');
          const text = (data.text || '').trim();
          if (text) await runChat(text);
        } catch (err) {
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `**Mic error:** ${err instanceof Error ? err.message : 'Unknown'}`,
          }]);
        } finally {
          setIsTranscribing(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `**Mic blocked:** ${err instanceof Error ? err.message : 'Allow microphone access in your browser.'}`,
      }]);
    }
  }, [isRecording, runChat]);

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
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {msg.attachments.map((a, ai) => (
                      a.kind === 'image' ? (
                        <img
                          key={ai}
                          src={a.dataUrl}
                          alt={a.name}
                          className="max-h-32 rounded border border-border/50"
                        />
                      ) : (
                        <span key={ai} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-border/50 bg-background/40 font-mono">
                          <FileText className="w-3 h-3" /> {a.name}
                        </span>
                      )
                    ))}
                  </div>
                )}
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
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isLoading || isTranscribing}
          aria-label={isRecording ? 'Stop recording' : 'Record voice'}
          title={isRecording ? 'Stop recording' : 'Hold a call to your mic — I\'ll transcribe & coach'}
          className={`p-2 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse'
              : 'bg-background/60 border-border/50 text-amber hover:bg-amber/10 hover:border-amber/60'
          }`}
        >
          {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? 'Recording... tap stop when done' : isTranscribing ? 'Transcribing call...' : (isPartner ? 'Ask for company stats or sales coaching...' : 'Ask, or tap mic to share a call...')}
          disabled={isLoading || isRecording || isTranscribing}
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
