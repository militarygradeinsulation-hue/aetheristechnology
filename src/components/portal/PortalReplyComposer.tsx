import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check, MessageSquare, ImagePlus, X, FileText, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type SourceType = 'text' | 'image';
type Mode = 'brief' | 'full';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export const PortalReplyComposer: React.FC = () => {
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [postText, setPostText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [mode, setMode] = useState<Mode>('brief');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large (max 8MB)', variant: 'destructive' });
      return;
    }
    const url = await fileToDataUrl(file);
    setImageDataUrl(url);
    setImageName(file.name);
  };

  const generate = async () => {
    if (sourceType === 'text' && postText.trim().length < 10) {
      toast({ title: 'Paste the LinkedIn post (at least 10 chars)', variant: 'destructive' });
      return;
    }
    if (sourceType === 'image' && !imageDataUrl) {
      toast({ title: 'Upload a screenshot of the post', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setOutput('');
    try {
      const body =
        sourceType === 'image'
          ? { imageDataUrl, mode, extraContext: extraContext.trim() }
          : { postText: postText.trim(), mode, extraContext: extraContext.trim() };
      const { data, error } = await supabase.functions.invoke('linkedin-post-respond', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data.post || '');
      toast({ title: 'Response generated' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="glass rounded-xl p-6 md:p-8 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Reply Composer</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Drop in a LinkedIn post (paste text or upload a screenshot) and get a forensic, Aetheris-voice reply.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {([
            { v: 'text' as SourceType, label: 'Paste Text', icon: FileText },
            { v: 'image' as SourceType, label: 'Upload Screenshot', icon: ImageIcon },
          ]).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setSourceType(v)}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition ${sourceType === v ? 'border-amber bg-amber/10 text-amber' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {sourceType === 'text' ? (
          <div className="mb-4">
            <Label>The LinkedIn post you're replying to</Label>
            <Textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={6}
              placeholder="Paste the full post text here..."
              className="mt-1"
            />
          </div>
        ) : (
          <div className="mb-4">
            <Label>Screenshot of the post</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
            {imageDataUrl ? (
              <div className="mt-2 relative inline-block">
                <img src={imageDataUrl} alt="Uploaded post" className="max-h-64 rounded-md border border-border" />
                <button
                  onClick={() => { setImageDataUrl(''); setImageName(''); if (fileRef.current) fileRef.current.value=''; }}
                  className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 hover:bg-amber/20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-muted-foreground mt-1">{imageName}</p>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 hover:border-amber/50 hover:bg-amber/5 transition"
              >
                <ImagePlus className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
              </button>
            )}
          </div>
        )}

        <div className="mb-4">
          <Label>Extra direction (optional)</Label>
          <Select
            value=""
            onValueChange={(val) => {
              if (!val) return;
              setExtraContext(prev => prev ? `${prev}\n${val}` : val);
            }}
          >
            <SelectTrigger className="mt-1 mb-2">
              <SelectValue placeholder="Pick a preset direction (or type your own below)…" />
            </SelectTrigger>
            <SelectContent>
              {[
                { label: 'Agree, go deeper', value: "Agree with the post's core point, then go one layer deeper — add the forensic angle they missed (the actual mechanism, the dollar leak, the system failure behind it)." },
                { label: 'Put them in their place', value: "Respectfully dismantle the post. Call out where the logic breaks, what they're missing, and what an operator would actually do. No insults — just sharper truth." },
                { label: 'Sound more human', value: "Drop the polish. Write like a real operator texting a peer — contractions, short sentences, plain words, zero LinkedIn-guru voice." },
                { label: 'Add a hard stat', value: "Anchor the reply with one concrete number or dollar figure that makes the leak undeniable." },
                { label: 'Ask a sharper question', value: "End with one disarming question that forces the OP (or readers) to confront the leak they're ignoring." },
                { label: 'Reframe the problem', value: "Reframe the issue the post is describing — show it's actually a symptom of a deeper operational leak, not the root cause." },
                { label: 'Cite a real example', value: "Ground the reply in a concrete Aetheris-style operator example — what we saw, what we fixed, what it was costing them." },
                { label: 'Cut the fluff', value: "Strip all hedging, qualifiers, and corporate speak. Make every sentence load-bearing." },
              ].map(p => (
                <SelectItem key={p.label} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={3}
            placeholder="Pick a preset above, or type your own direction here..."
          />
        </div>

        <div className="flex items-end gap-3 mb-5">
          <div>
            <Label>Response type</Label>
            <div className="mt-1 flex gap-2">
              {([
                { v: 'brief' as Mode, label: 'Comment' },
                { v: 'full' as Mode, label: 'Standalone Repost' },
              ]).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setMode(v)}
                  className={`px-3 py-2 rounded-md border text-sm font-semibold transition ${mode === v ? 'border-amber bg-amber/10 text-amber' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="bg-amber hover:bg-amber/90 text-background font-bold flex-1 sm:flex-none">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : 'Generate Reply'}
          </Button>
        </div>

        {output && (
          <div className="rounded-lg border border-border bg-background/40 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-amber bg-amber/10 px-2 py-1 rounded">
                {mode === 'brief' ? 'Comment' : 'Standalone Repost'}
              </span>
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{output}</p>
          </div>
        )}
      </div>
    </div>
  );
};
