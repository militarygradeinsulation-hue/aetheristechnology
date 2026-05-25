import React, { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ScanSearch, Upload, X, ClipboardPaste, Eye, EyeOff, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Clue = {
  pattern: string;
  highlight: string;
  fact: string;
  source: string;
  confidence: number;
  // legacy
  evidence?: string;
};
type DetectResult = {
  score: number;
  verdict: 'HUMAN' | 'LIKELY_HUMAN' | 'MIXED' | 'LIKELY_AI' | 'AI';
  summary: string;
  transcript?: string;
  clues: Clue[];
};

const verdictColor = (v: DetectResult['verdict']) => {
  switch (v) {
    case 'HUMAN':
    case 'LIKELY_HUMAN':
      return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10';
    case 'MIXED':
      return 'text-amber border-amber/40 bg-amber/10';
    case 'LIKELY_AI':
    case 'AI':
      return 'text-crimson border-crimson/40 bg-crimson/10';
  }
};

// Build a highlighted-text renderer that marks each clue.highlight in the transcript.
function renderHighlighted(transcript: string, clues: Clue[], activeIdx: number | null) {
  if (!transcript) return null;

  type Span = { start: number; end: number; idx: number };
  const spans: Span[] = [];
  clues.forEach((c, idx) => {
    const needle = (c.highlight || '').trim();
    if (!needle) return;
    const lower = transcript.toLowerCase();
    let from = 0;
    const n = needle.toLowerCase();
    while (from < transcript.length) {
      const at = lower.indexOf(n, from);
      if (at === -1) break;
      spans.push({ start: at, end: at + needle.length, idx });
      from = at + needle.length;
    }
  });
  spans.sort((a, b) => a.start - b.start || b.end - a.end);

  // Drop overlaps (keep first)
  const clean: Span[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue;
    clean.push(s);
    cursor = s.end;
  }

  const parts: React.ReactNode[] = [];
  let pos = 0;
  clean.forEach((s, i) => {
    if (s.start > pos) parts.push(<span key={`t-${i}`}>{transcript.slice(pos, s.start)}</span>);
    const isActive = activeIdx === s.idx;
    parts.push(
      <mark
        key={`m-${i}`}
        className={`px-0.5 rounded-sm border-b-2 transition-colors ${
          isActive
            ? 'bg-crimson/40 border-crimson text-foreground'
            : 'bg-amber/20 border-amber/60 text-foreground hover:bg-amber/30'
        }`}
        title={`#${s.idx + 1} ${clues[s.idx].pattern}`}
      >
        <sup className="font-mono text-[9px] text-amber font-bold mr-0.5">{s.idx + 1}</sup>
        {transcript.slice(s.start, s.end)}
      </mark>
    );
    pos = s.end;
  });
  if (pos < transcript.length) parts.push(<span key="tail">{transcript.slice(pos)}</span>);
  return parts;
}

export const AiWritingDetectorCard: React.FC = () => {
  const [text, setText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Pick an image file', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        setText(t);
        toast({ title: 'Pasted from clipboard' });
      }
    } catch {
      toast({ title: 'Clipboard blocked', description: 'Paste manually with Cmd/Ctrl+V', variant: 'destructive' });
    }
  };

  const run = async () => {
    if (!text.trim() && !imageDataUrl) {
      toast({ title: 'Paste text or upload a screenshot first', variant: 'destructive' });
      return;
    }
    setBusy(true);
    setResult(null);
    setActiveIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-ai-detect', {
        body: { postText: text.trim() || undefined, imageDataUrl: imageDataUrl || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as DetectResult);
      setExpanded(true);
    } catch (e: any) {
      toast({ title: 'Scan failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setText('');
    setImageDataUrl(null);
    setResult(null);
    setActiveIdx(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const transcript = useMemo(
    () => result?.transcript || text || '',
    [result, text],
  );

  const highlighted = useMemo(
    () => (result ? renderHighlighted(transcript, result.clues || [], activeIdx) : null),
    [result, transcript, activeIdx],
  );

  return (
    <Card className="p-5 glass border-amber/40 space-y-4">
      <div className="flex items-center gap-2">
        <ScanSearch className="w-4 h-4 text-amber" />
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
          AI Writing Detector
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Upload a screenshot OR paste someone's post/writing. We forensic-scan for AI tells and return a probability, verdict, highlighted clues, and sources.
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Paste text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground/80">Paste text</label>
            <Button variant="ghost" size="sm" onClick={handlePaste} className="h-7 text-xs">
              <ClipboardPaste className="w-3 h-3 mr-1" /> Paste
            </Button>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste their post, comment, or any block of writing…"
            className="min-h-[180px] text-sm"
          />
          <div className="text-[10px] text-muted-foreground">{text.length.toLocaleString()} chars</div>
        </div>

        {/* Upload screenshot */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground/80">Upload screenshot</label>
          {imageDataUrl ? (
            <div className="relative rounded-sm border border-amber/30 overflow-hidden">
              <img src={imageDataUrl} alt="Uploaded screenshot" className="w-full max-h-[220px] object-contain bg-background/40" />
              <button
                onClick={() => { setImageDataUrl(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute top-2 right-2 bg-background/80 border border-border rounded-sm p-1 hover:bg-background"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full min-h-[180px] rounded-sm border-2 border-dashed border-amber/30 hover:border-amber/60 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground transition-colors"
            >
              <Upload className="w-5 h-5 text-amber" />
              Click to upload a screenshot
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={busy} className="bg-amber hover:bg-amber/90 text-background font-bold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanSearch className="w-4 h-4 mr-2" />}
          {busy ? 'Scanning…' : 'Scan for AI'}
        </Button>
        {(text || imageDataUrl || result) && (
          <Button variant="ghost" onClick={clear} disabled={busy} className="text-xs">
            Clear
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-widest ${verdictColor(result.verdict)}`}>
              {result.verdict.replace('_', ' ')}
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {Math.round(result.score)}<span className="text-muted-foreground text-base font-normal">/100</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">AI probability</div>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="h-7 text-xs">
                {expanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {expanded ? 'Collapse' : 'Expand evidence'}
              </Button>
            </div>
          </div>

          {/* Probability bar */}
          <div className="h-2 w-full bg-background/40 border border-border rounded-sm overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber to-crimson transition-all"
              style={{ width: `${Math.min(100, Math.max(0, result.score))}%` }}
            />
          </div>

          <p className="text-sm text-foreground/90 italic">{result.summary}</p>

          {expanded && (
            <>
              {/* Highlighted transcript */}
              {transcript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
                      Highlighted evidence
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Hover a clue below to spotlight it
                    </div>
                  </div>
                  <div className="rounded-sm border border-amber/30 bg-background/40 p-4 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                    {highlighted}
                  </div>
                </div>
              )}

              {/* Clues with facts + sources */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
                  Clues ({result.clues.length}) — facts & sources
                </div>
                <ol className="space-y-3">
                  {result.clues.map((c, i) => (
                    <li
                      key={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onMouseLeave={() => setActiveIdx(null)}
                      className={`rounded-sm border p-3 transition-colors cursor-default ${
                        activeIdx === i
                          ? 'border-crimson bg-crimson/5'
                          : 'border-border bg-background/30 hover:border-amber/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-amber font-bold shrink-0 text-sm">
                          {String(i + 1).padStart(2, '0')}.
                        </span>
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-semibold text-foreground text-sm">{c.pattern}</div>
                            {typeof c.confidence === 'number' && (
                              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                {Math.round(c.confidence)}% confidence
                              </div>
                            )}
                          </div>
                          {c.highlight && (
                            <div className="text-xs">
                              <span className="text-[9px] uppercase tracking-widest text-muted-foreground mr-2">Quote</span>
                              <span className="bg-amber/15 border-b-2 border-amber/60 px-1 rounded-sm font-serif italic text-foreground">
                                "{c.highlight}"
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-foreground/80">
                            <span className="text-[9px] uppercase tracking-widest text-muted-foreground mr-2">Fact</span>
                            {c.fact || c.evidence}
                          </div>
                          {c.source && (
                            <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <BookOpen className="w-3 h-3 mt-0.5 text-amber shrink-0" />
                              <span><span className="text-[9px] uppercase tracking-widest mr-2">Source</span>{c.source}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiWritingDetectorCard;
