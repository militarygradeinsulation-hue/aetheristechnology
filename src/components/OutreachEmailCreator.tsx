import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Image as ImageIcon, ClipboardPaste, Sparkles, Copy, Check, X, Loader2, Wand2, Type } from 'lucide-react';

type Mode = 'create' | 'rewrite' | 'subjects';

interface Props {
  /** 'admin' uses x-admin-token header, 'rep' uses x-portal-token. */
  authMode: 'admin' | 'rep';
  /** Auth token already retrieved by the caller. */
  token: string | null;
  defaultSenderName?: string;
}

interface EmailOut { subject: string; body: string; why_it_works: string }
interface SubjectHook { subject: string; angle: string; why: string }
interface SubjectsOut { hooks: SubjectHook[] }

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve({ base64: result.slice(comma + 1), mime: file.type || 'image/png' });
    };
    reader.readAsDataURL(file);
  });
}

export const OutreachEmailCreator: React.FC<Props> = ({ authMode, token, defaultSenderName }) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('create');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState(defaultSenderName || '');
  const [prompt, setPrompt] = useState('');
  const [pasted, setPasted] = useState('');
  const [image, setImage] = useState<{ url: string; base64: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailOut | null>(null);
  const [subjects, setSubjects] = useState<SubjectHook[] | null>(null);
  const [copied, setCopied] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5_000_000) {
      toast({ title: 'Image too large', description: 'Keep under 5MB.', variant: 'destructive' });
      return;
    }
    const { base64, mime } = await fileToBase64(file);
    setImage({ url: URL.createObjectURL(file), base64, mime });
  }

  function handlePasteCapture(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const img = items.find((i) => i.type.startsWith('image/'));
    if (img) {
      const f = img.getAsFile();
      if (f) { e.preventDefault(); void handleFile(f); }
    }
  }

  async function generate() {
    if (!token) { toast({ title: 'Not signed in', variant: 'destructive' }); return; }
    if (!prompt && !pasted && !image) {
      toast({ title: 'Give it something to work with', description: 'Add context, paste an email, or drop an image.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const headers: Record<string, string> = {};
      if (authMode === 'admin') headers['x-admin-token'] = token;
      else headers['x-portal-token'] = token;

      const { data, error } = await supabase.functions.invoke('outreach-email-creator', {
        body: {
          mode,
          prompt,
          pastedText: pasted,
          recipientName,
          senderName,
          imageBase64: image?.base64 || null,
          imageMime: image?.mime || null,
        },
        headers,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as EmailOut);
    } catch (e) {
      toast({ title: 'Generation failed', description: String((e as Error).message), variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function copy(kind: 'subject' | 'body' | 'all') {
    if (!result) return;
    const text = kind === 'subject' ? result.subject
      : kind === 'body' ? result.body
      : `Subject: ${result.subject}\n\n${result.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-orange-500 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-foreground text-lg leading-tight">Outreach Email Creator</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Aetheris voice. Bold. Direct. Forensic. <span className="text-amber font-semibold">Zero dashes.</span> Paste an email, drop a screenshot, or describe the prospect.
            </div>
          </div>
        </div>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2">
        {(['create','rewrite'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
              mode === m ? 'bg-amber text-background' : 'glass text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'create' ? <><Sparkles className="w-3.5 h-3.5"/>Write New</> : <><Wand2 className="w-3.5 h-3.5"/>Rewrite Mine</>}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <Card className="glass p-5 space-y-4">
        {mode === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Recipient (optional)</label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Jordan, COO at Acme" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">From (your name)</label>
              <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name" />
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            {mode === 'create' ? 'Context / Angle' : 'Notes for the rewrite (optional)'}
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onPaste={handlePasteCapture}
            placeholder={mode === 'create'
              ? "What you found on their site. The leak you want to name. What you want them to do."
              : "What you want changed. Tone, urgency, specific facts to add."}
            rows={4}
          />
        </div>

        {mode === 'rewrite' && (
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
              <ClipboardPaste className="w-3 h-3"/> Paste your email here
            </label>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              onPaste={handlePasteCapture}
              placeholder="Paste the existing draft."
              rows={6}
            />
          </div>
        )}

        {/* Image drop */}
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Screenshot of their site / post / ad (optional)</label>
          {image ? (
            <div className="relative mt-2 inline-block">
              <img src={image.url} alt="reference" className="max-h-48 rounded-lg border border-border" />
              <button
                onClick={() => setImage(null)}
                className="absolute -top-2 -right-2 bg-crimson text-white rounded-full p-1 hover:opacity-80"
                aria-label="Remove image"
              >
                <X className="w-3 h-3"/>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full border-2 border-dashed border-border rounded-lg p-6 text-center text-muted-foreground hover:border-amber hover:text-amber transition flex flex-col items-center gap-1"
            >
              <ImageIcon className="w-6 h-6"/>
              <span className="text-sm font-semibold">Click to upload, or paste a screenshot anywhere above</span>
              <span className="text-xs">PNG, JPG, under 5MB</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90 font-bold uppercase tracking-wider"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Writing...</> : <><Sparkles className="w-4 h-4 mr-2"/>{mode === 'create' ? 'Write the Email' : 'Rewrite It'}</>}
        </Button>
      </Card>

      {/* Result */}
      {result && (
        <Card className="glass p-5 space-y-4 border-amber/30">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Operator Draft</div>
            <Button size="sm" variant="outline" onClick={() => copy('all')}>
              {copied === 'all' ? <Check className="w-3.5 h-3.5 mr-1.5"/> : <Copy className="w-3.5 h-3.5 mr-1.5"/>}
              Copy All
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Subject</label>
              <button onClick={() => copy('subject')} className="text-xs text-amber hover:underline flex items-center gap-1">
                {copied === 'subject' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy
              </button>
            </div>
            <div className="font-display font-bold text-lg text-foreground">{result.subject}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Body</label>
              <button onClick={() => copy('body')} className="text-xs text-amber hover:underline flex items-center gap-1">
                {copied === 'body' ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-background/40 border border-border rounded-lg p-4 leading-relaxed">
{result.body}
            </pre>
          </div>

          {result.why_it_works && (
            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Why this lands</div>
              <div className="text-sm text-muted-foreground italic">{result.why_it_works}</div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default OutreachEmailCreator;
