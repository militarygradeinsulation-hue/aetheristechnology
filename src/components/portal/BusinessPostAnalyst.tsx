import React, { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Newspaper, Image as ImageIcon, ClipboardPaste, Sparkles, Copy, Check, X, Loader2,
  Target, AlertTriangle, MessageSquare, Ban, ArrowRight,
} from 'lucide-react';

interface Props {
  /** 'admin' uses x-admin-token, 'rep' uses x-portal-token. */
  authMode: 'admin' | 'rep';
  token: string | null;
}

interface Analysis {
  post_summary: string;
  author_signal: string;
  the_leak: string;
  leverage_points: string[];
  suggested_angle: string;
  outreach_hook: { subject: string; opener: string; body: string };
  comment_reply: string;
  do_not_say: string[];
  follow_up_move: string;
}

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

export const BusinessPostAnalyst: React.FC<Props> = ({ authMode, token }) => {
  const { toast } = useToast();
  const [postText, setPostText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [extra, setExtra] = useState('');
  const [image, setImage] = useState<{ url: string; base64: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5_000_000) {
      toast({ title: 'Image too large', description: 'Keep under 5MB.', variant: 'destructive' });
      return;
    }
    const { base64, mime } = await fileToBase64(file);
    setImage({ url: URL.createObjectURL(file), base64, mime });
  }

  async function onPaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) {
      const f = item.getAsFile();
      if (f) { e.preventDefault(); await handleFile(f); }
    }
  }

  async function run() {
    if (!token) {
      toast({ title: 'Not signed in', description: 'Sign back into the portal and try again.', variant: 'destructive' });
      return;
    }
    if (!postText.trim() && !image && !sourceUrl.trim()) {
      toast({ title: 'Add something', description: 'Paste the post text, drop a screenshot, or add a URL.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const headers: Record<string, string> = {};
      if (authMode === 'admin') headers['x-admin-token'] = token;
      else headers['x-portal-token'] = token;

      const { data, error } = await supabase.functions.invoke('business-post-analyst', {
        body: {
          postText,
          authorName,
          authorRole,
          sourceUrl,
          extraContext: extra,
          imageBase64: image?.base64 || null,
          imageMime: image?.mime || null,
        },
        headers,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalysis((data as any).analysis);
    } catch (e) {
      toast({ title: 'Analysis failed', description: String((e as Error).message), variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-orange-500 flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-foreground text-lg leading-tight">Business Post Analyst</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Paste any LinkedIn or social post. Get the leak, the angle, and a ready-to-send outreach hook in the Aetheris voice.
            </div>
          </div>
        </div>
      </div>

      {/* Inputs */}
      <Card className="glass p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Author name</label>
            <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="e.g. Sarah Klein" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Role / Company</label>
            <Input value={authorRole} onChange={e => setAuthorRole(e.target.value)} placeholder="e.g. CEO, Klein Logistics" className="mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Source URL (optional)</label>
          <Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://linkedin.com/posts/..." className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Post text</label>
          <Textarea
            value={postText}
            onChange={e => setPostText(e.target.value)}
            onPaste={onPaste}
            placeholder="Paste the full post here. You can also paste a screenshot directly."
            rows={6}
            className="mt-1 font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Extra context (optional)</label>
          <Textarea value={extra} onChange={e => setExtra(e.target.value)} placeholder="Anything you know about this prospect or the angle you want." rows={2} className="mt-1" />
        </div>

        {/* Image */}
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="w-4 h-4 mr-1.5" /> Upload screenshot
          </Button>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><ClipboardPaste className="w-3 h-3" /> Or paste an image into the post box.</span>
          {image && (
            <div className="inline-flex items-center gap-2 ml-2">
              <img src={image.url} alt="post" className="w-12 h-12 rounded object-cover border border-border" />
              <button onClick={() => setImage(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        <Button onClick={run} disabled={loading} className="w-full bg-amber hover:bg-amber/90 text-background font-bold">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing the leak...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyze Post</>}
        </Button>
      </Card>

      {/* Result */}
      {analysis && (
        <div className="space-y-4">
          <Card className="glass p-5 space-y-3">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-amber mt-0.5" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80">Post summary</div>
                <div className="text-sm text-foreground/90">{analysis.post_summary}</div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80">Author signal</div>
              <div className="text-sm text-foreground/90">{analysis.author_signal}</div>
            </div>
            <div className="rounded-md border border-crimson/40 bg-crimson/5 p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-crimson flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> The leak</div>
              <div className="text-sm text-foreground mt-1">{analysis.the_leak}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80 mb-1">Leverage points</div>
              <ul className="space-y-1">
                {analysis.leverage_points.map((p, i) => (
                  <li key={i} className="text-sm text-foreground/90 flex gap-2"><span className="text-amber">→</span>{p}</li>
                ))}
              </ul>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Suggested angle: </span>
              <span className="font-mono uppercase text-amber">{analysis.suggested_angle}</span>
            </div>
          </Card>

          <Card className="glass p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80">Outreach hook</div>
              <Button size="sm" variant="ghost" onClick={() => copyText('hook', `Subject: ${analysis.outreach_hook.subject}\n\n${analysis.outreach_hook.opener}\n\n${analysis.outreach_hook.body}`)}>
                {copied === 'hook' ? <><Check className="w-3.5 h-3.5 mr-1" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
              </Button>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground">Subject</div>
              <div className="text-sm font-semibold text-foreground">{analysis.outreach_hook.subject}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground">Opener</div>
              <div className="text-sm text-foreground/90 italic">"{analysis.outreach_hook.opener}"</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground">Body</div>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">{analysis.outreach_hook.body}</div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="glass p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Public comment</div>
                <Button size="sm" variant="ghost" onClick={() => copyText('comment', analysis.comment_reply)}>
                  {copied === 'comment' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="text-sm text-foreground/90">{analysis.comment_reply}</div>
            </Card>
            <Card className="glass p-5 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-crimson flex items-center gap-1"><Ban className="w-3 h-3" /> Do not say</div>
              <ul className="space-y-1">
                {analysis.do_not_say.map((s, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex gap-2"><span className="text-crimson">×</span>{s}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="glass p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber/80 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Follow-up move (Day +3)</div>
            <div className="text-sm text-foreground/90 mt-1">{analysis.follow_up_move}</div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BusinessPostAnalyst;
