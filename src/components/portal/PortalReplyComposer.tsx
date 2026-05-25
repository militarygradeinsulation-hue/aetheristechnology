import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Loader2, Copy, Check, MessageSquare, ImagePlus, X, FileText, ImageIcon, Brain, Library, Trash2, RefreshCw, ScanLine } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type SourceType = 'text' | 'image';
type Mode = 'brief' | 'full';

interface LibraryItem {
  id: string;
  source_type: SourceType;
  post_text: string | null;
  image_url: string | null;
  post_summary: string | null;
  stance: string | null;
  rationale: string | null;
  preset_labels: string[] | null;
  extra_context: string | null;
  generated_reply: string;
  mode: Mode;
  created_at: string;
}

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
  const [thinking, setThinking] = useState(false);
  const [thinkSummary, setThinkSummary] = useState<{ stance: string; rationale: string; labels: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  type AiDetect = { score: number; verdict: string; summary: string; clues: { pattern: string; evidence: string }[] };
  const [aiDetect, setAiDetect] = useState<AiDetect | null>(null);
  const [aiDetecting, setAiDetecting] = useState(false);

  const runAiDetect = async (opts?: { silent?: boolean }) => {
    if (sourceType === 'text' && postText.trim().length < 30) {
      if (!opts?.silent) toast({ title: 'Paste at least 30 chars first', variant: 'destructive' });
      return;
    }
    if (sourceType === 'image' && !imageDataUrl) {
      if (!opts?.silent) toast({ title: 'Upload a screenshot first', variant: 'destructive' });
      return;
    }
    setAiDetecting(true);
    try {
      const body = sourceType === 'image' ? { imageDataUrl } : { postText: postText.trim() };
      const { data, error } = await supabase.functions.invoke('linkedin-ai-detect', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiDetect(data as AiDetect);
    } catch (e: any) {
      if (!opts?.silent) toast({ title: 'AI scan failed', description: e.message, variant: 'destructive' });
    } finally {
      setAiDetecting(false);
    }
  };

  // Auto-run AI detection (debounced) when source content changes
  useEffect(() => {
    setAiDetect(null);
    if (sourceType === 'text' && postText.trim().length < 30) return;
    if (sourceType === 'image' && !imageDataUrl) return;
    const t = setTimeout(() => { runAiDetect({ silent: true }); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postText, imageDataUrl, sourceType]);

  const loadLibrary = async () => {
    setLibLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-reply-library', { body: { action: 'list' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLibrary(data.items || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLibLoading(false);
    }
  };

  useEffect(() => { loadLibrary(); }, []);

  const thinkForMe = async () => {
    if (sourceType === 'text' && postText.trim().length < 10) {
      toast({ title: 'Paste the post first (at least 10 chars)', variant: 'destructive' });
      return;
    }
    if (sourceType === 'image' && !imageDataUrl) {
      toast({ title: 'Upload a screenshot first', variant: 'destructive' });
      return;
    }
    setThinking(true);
    setThinkSummary(null);
    try {
      const body = sourceType === 'image' ? { imageDataUrl } : { postText: postText.trim() };
      const { data, error } = await supabase.functions.invoke('linkedin-reply-direction', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExtraContext(data.extraContext || '');
      setThinkSummary({
        stance: data.stance,
        rationale: data.rationale,
        labels: data.preset_labels || [],
      });
      toast({ title: 'Direction set', description: `Stance: ${data.stance.replace('_', ' ')}` });
    } catch (e: any) {
      toast({ title: 'Think for me failed', description: e.message, variant: 'destructive' });
    } finally {
      setThinking(false);
    }
  };

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

  const saveToLibrary = async (reply: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-reply-library', {
        body: {
          action: 'save',
          source_type: sourceType,
          post_text: sourceType === 'text' ? postText.trim() : null,
          image_data_url: sourceType === 'image' ? imageDataUrl : null,
          stance: thinkSummary?.stance || null,
          rationale: thinkSummary?.rationale || null,
          preset_labels: thinkSummary?.labels || [],
          extra_context: extraContext.trim() || null,
          generated_reply: reply,
          mode,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'save failed');
      if (data?.item) setLibrary(prev => [data.item, ...prev]);
    } catch (e: any) {
      console.error('library save failed', e);
    }
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
      const reply = data.post || '';
      setOutput(reply);
      toast({ title: 'Response generated' });
      if (reply) saveToLibrary(reply);
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

  const copyItem = (item: LibraryItem) => {
    navigator.clipboard.writeText(item.generated_reply);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({ title: 'Copied!' });
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await supabase.functions.invoke('linkedin-reply-library', { body: { action: 'delete', id } });
      setLibrary(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const stanceColor = (s: string | null) => {
    if (s === 'AGREE_DEEPER') return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10';
    if (s === 'DISAGREE') return 'text-rose-400 border-rose-400/40 bg-rose-400/10';
    return 'text-amber border-amber/40 bg-amber/10';
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
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
          <div className="flex items-center justify-between gap-3 mb-1">
            <Label>Extra direction (optional)</Label>
            <button
              type="button"
              onClick={thinkForMe}
              disabled={thinking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber/40 bg-amber/10 text-amber text-xs font-bold hover:bg-amber/20 transition disabled:opacity-50"
            >
              {thinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              {thinking ? 'Thinking…' : 'Think for me'}
            </button>
          </div>
          {thinkSummary && (
            <div className="mb-2 rounded-md border border-amber/30 bg-amber/5 p-2.5 text-xs">
              <div className="font-bold text-amber uppercase tracking-wide">
                Stance: {thinkSummary.stance.replace('_', ' ')}
              </div>
              {thinkSummary.rationale && <div className="text-foreground/80 mt-1">{thinkSummary.rationale}</div>}
              {thinkSummary.labels.length > 0 && (
                <div className="text-muted-foreground mt-1">Applied: {thinkSummary.labels.join(' · ')}</div>
              )}
            </div>
          )}
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

      {/* ===== Library of saved posts + replies ===== */}
      <div className="glass rounded-xl p-6 md:p-8 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Library className="w-5 h-5 text-amber" />
            <h3 className="text-xl font-bold font-display">Your Reply Library</h3>
            <span className="text-xs text-muted-foreground">({library.length})</span>
          </div>
          <button
            onClick={loadLibrary}
            disabled={libLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-amber/10 hover:text-amber transition"
          >
            {libLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>

        {library.length === 0 && !libLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No replies yet. Every reply you generate above is auto-saved here with a summary of the post and why that comment was used.
          </p>
        )}

        <div className="space-y-3">
          {library.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-lg border border-border bg-background/40 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {item.source_type === 'image' && item.image_url ? (
                      <img src={item.image_url} alt="Post" className="w-16 h-16 rounded object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded border border-border bg-background/60 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.stance && (
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${stanceColor(item.stance)}`}>
                            {item.stance.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                          {item.mode === 'brief' ? 'Comment' : 'Repost'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-2">
                        {item.post_summary || (item.post_text ? item.post_text.slice(0, 200) : 'Screenshot post')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => copyItem(item)}
                        className="p-1.5 rounded hover:bg-amber/10 hover:text-amber transition"
                        title="Copy reply"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 rounded hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="text-xs text-amber hover:underline mt-2"
                  >
                    {expanded ? 'Hide details' : 'Show full post, reasoning & reply →'}
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-background/60 p-4 space-y-3 text-sm">
                    {item.post_summary && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Post summary</div>
                        <p className="text-foreground/90">{item.post_summary}</p>
                      </div>
                    )}
                    {item.post_text && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Original post</div>
                        <p className="text-foreground/80 whitespace-pre-line max-h-48 overflow-auto">{item.post_text}</p>
                      </div>
                    )}
                    {item.image_url && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Screenshot</div>
                        <img src={item.image_url} alt="Post" className="max-h-72 rounded border border-border" />
                      </div>
                    )}
                    {(item.rationale || (item.preset_labels && item.preset_labels.length > 0)) && (
                      <div className="rounded-md border border-amber/30 bg-amber/5 p-3">
                        <div className="text-[10px] uppercase font-bold text-amber mb-1">Why this comment was used</div>
                        {item.rationale && <p className="text-foreground/90">{item.rationale}</p>}
                        {item.preset_labels && item.preset_labels.length > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Angles applied: {item.preset_labels.join(' · ')}
                          </p>
                        )}
                      </div>
                    )}
                    {item.extra_context && (
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Direction used</div>
                        <p className="text-foreground/80 whitespace-pre-line">{item.extra_context}</p>
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Generated reply</div>
                      <p className="text-foreground/90 whitespace-pre-line bg-background/40 border border-border rounded p-3">{item.generated_reply}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
