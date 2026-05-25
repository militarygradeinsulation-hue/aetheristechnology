import React, { useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ScanSearch, Upload, X, ClipboardPaste, Eye, EyeOff, BookOpen, Plus, Users, GitCompare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Clue = {
  pattern: string;
  highlight: string;
  fact: string;
  source: string;
  confidence: number;
  evidence?: string;
};
type Verdict = 'HUMAN' | 'LIKELY_HUMAN' | 'MIXED' | 'LIKELY_AI' | 'AI';
type SampleResult = {
  index: number;
  score: number;
  verdict: Verdict;
  summary: string;
  transcript: string;
  clues: Clue[];
};
type Comparison = {
  overall_score: number;
  overall_verdict: Verdict;
  same_author: 'yes' | 'no' | 'mixed' | 'unknown';
  same_author_reasoning: string;
  repeated_patterns: string[];
  outlier_index: number;
  bottom_line: string;
};
type DetectResult = {
  samples: SampleResult[];
  comparison: Comparison;
};
type Sample = { id: string; text: string; imageDataUrl: string | null };

const MAX_SAMPLES = 5;

const newSample = (): Sample => ({ id: Math.random().toString(36).slice(2), text: '', imageDataUrl: null });

const verdictColor = (v: Verdict) => {
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

const SampleEditor: React.FC<{
  sample: Sample;
  index: number;
  onChange: (s: Sample) => void;
  onRemove: () => void;
  canRemove: boolean;
}> = ({ sample, index, onChange, onRemove, canRemove }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast({ title: 'Pick an image file', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange({ ...sample, imageDataUrl: reader.result as string });
    reader.readAsDataURL(f);
  };

  const handlePaste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        onChange({ ...sample, text: t });
        toast({ title: `Sample ${index + 1}: pasted from clipboard` });
      }
    } catch {
      toast({ title: 'Clipboard blocked', description: 'Paste manually with Cmd/Ctrl+V', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-sm border border-amber/20 bg-background/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber font-mono">
          Sample {String(index + 1).padStart(2, '0')}
        </div>
        {canRemove && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-crimson" aria-label="Remove sample">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-foreground/80">Paste text</label>
            <Button variant="ghost" size="sm" onClick={handlePaste} className="h-6 text-[10px] px-2">
              <ClipboardPaste className="w-3 h-3 mr-1" /> Paste
            </Button>
          </div>
          <Textarea
            value={sample.text}
            onChange={(e) => onChange({ ...sample, text: e.target.value })}
            placeholder="Post, comment, or any block of writing…"
            className="min-h-[120px] text-xs"
          />
          <div className="text-[9px] text-muted-foreground">{sample.text.length.toLocaleString()} chars</div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-foreground/80">Upload screenshot</label>
          {sample.imageDataUrl ? (
            <div className="relative rounded-sm border border-amber/30 overflow-hidden">
              <img src={sample.imageDataUrl} alt={`Sample ${index + 1}`} className="w-full max-h-[140px] object-contain bg-background/40" />
              <button
                onClick={() => { onChange({ ...sample, imageDataUrl: null }); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute top-1.5 right-1.5 bg-background/80 border border-border rounded-sm p-0.5 hover:bg-background"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full min-h-[120px] rounded-sm border-2 border-dashed border-amber/30 hover:border-amber/60 flex flex-col items-center justify-center gap-1.5 text-[11px] text-muted-foreground transition-colors"
            >
              <Upload className="w-4 h-4 text-amber" />
              Click to upload
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
    </div>
  );
};

const SampleResultPanel: React.FC<{ sample: SampleResult; isOutlier: boolean }> = ({ sample, isOutlier }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const highlighted = useMemo(() => renderHighlighted(sample.transcript || '', sample.clues || [], activeIdx), [sample, activeIdx]);

  return (
    <div className="rounded-sm border border-border bg-background/30 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber font-bold">
          Sample {String(sample.index).padStart(2, '0')}
        </div>
        <div className={`px-2 py-1 rounded-sm border text-[10px] font-bold uppercase tracking-widest ${verdictColor(sample.verdict)}`}>
          {sample.verdict.replace('_', ' ')}
        </div>
        <div className="font-display text-xl font-bold text-foreground">
          {Math.round(sample.score)}<span className="text-muted-foreground text-xs font-normal">/100</span>
        </div>
        {isOutlier && (
          <div className="text-[10px] uppercase tracking-widest text-crimson font-bold border border-crimson/40 bg-crimson/10 px-2 py-0.5 rounded-sm">
            Outlier
          </div>
        )}
      </div>

      <div className="h-1.5 w-full bg-background/40 border border-border rounded-sm overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-amber to-crimson transition-all"
          style={{ width: `${Math.min(100, Math.max(0, sample.score))}%` }}
        />
      </div>

      <p className="text-xs text-foreground/90 italic">{sample.summary}</p>

      {sample.transcript && (
        <div className="rounded-sm border border-amber/20 bg-background/40 p-3 text-xs leading-relaxed whitespace-pre-wrap font-serif max-h-[260px] overflow-y-auto">
          {highlighted}
        </div>
      )}

      <ol className="space-y-2">
        {(sample.clues || []).map((c, i) => (
          <li
            key={i}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            className={`rounded-sm border p-2.5 transition-colors cursor-default ${
              activeIdx === i ? 'border-crimson bg-crimson/5' : 'border-border bg-background/30 hover:border-amber/50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="font-mono text-amber font-bold shrink-0 text-xs">
                {String(i + 1).padStart(2, '0')}.
              </span>
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-semibold text-foreground text-xs">{c.pattern}</div>
                  {typeof c.confidence === 'number' && (
                    <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                      {Math.round(c.confidence)}%
                    </div>
                  )}
                </div>
                {c.highlight && (
                  <div className="text-[11px]">
                    <span className="bg-amber/15 border-b-2 border-amber/60 px-1 rounded-sm font-serif italic text-foreground">
                      "{c.highlight}"
                    </span>
                  </div>
                )}
                <div className="text-[11px] text-foreground/80">{c.fact || c.evidence}</div>
                {c.source && (
                  <div className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                    <BookOpen className="w-3 h-3 mt-0.5 text-amber shrink-0" />
                    <span>{c.source}</span>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const AiWritingDetectorCard: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([newSample()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [expanded, setExpanded] = useState(true);

  const updateSample = (id: string, next: Sample) =>
    setSamples((prev) => prev.map((s) => (s.id === id ? next : s)));
  const removeSample = (id: string) =>
    setSamples((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  const addSample = () =>
    setSamples((prev) => (prev.length >= MAX_SAMPLES ? prev : [...prev, newSample()]));

  const filledCount = samples.filter((s) => s.text.trim() || s.imageDataUrl).length;

  const run = async () => {
    const payload = samples
      .filter((s) => s.text.trim() || s.imageDataUrl)
      .map((s) => ({ text: s.text.trim() || undefined, imageDataUrl: s.imageDataUrl || undefined }));
    if (!payload.length) {
      toast({ title: 'Add at least one sample (text or screenshot)', variant: 'destructive' });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-ai-detect', {
        body: { samples: payload },
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
    setSamples([newSample()]);
    setResult(null);
  };

  const sameAuthorBadge = (s: Comparison['same_author']) => {
    switch (s) {
      case 'yes': return 'text-amber border-amber/40 bg-amber/10';
      case 'no': return 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10';
      case 'mixed': return 'text-crimson border-crimson/40 bg-crimson/10';
      default: return 'text-muted-foreground border-border bg-background/40';
    }
  };

  return (
    <Card className="p-5 glass border-amber/40 space-y-4">
      <div className="flex items-center gap-2">
        <ScanSearch className="w-4 h-4 text-amber" />
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
          AI Writing Detector
        </div>
        <div className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
          {filledCount}/{MAX_SAMPLES} samples
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Compare up to {MAX_SAMPLES} writing samples (text or screenshots). Get per-sample AI scores, cross-sample patterns, and a same-author analysis.
      </p>

      <div className="space-y-3">
        {samples.map((s, i) => (
          <SampleEditor
            key={s.id}
            sample={s}
            index={i}
            onChange={(next) => updateSample(s.id, next)}
            onRemove={() => removeSample(s.id)}
            canRemove={samples.length > 1}
          />
        ))}
        {samples.length < MAX_SAMPLES && (
          <Button
            variant="outline"
            size="sm"
            onClick={addSample}
            className="w-full border-dashed border-amber/40 text-amber hover:bg-amber/5"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add sample ({samples.length}/{MAX_SAMPLES})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={run} disabled={busy} className="bg-amber hover:bg-amber/90 text-background font-bold">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanSearch className="w-4 h-4 mr-2" />}
          {busy ? 'Scanning…' : `Scan ${filledCount || 1} sample${filledCount === 1 ? '' : 's'}`}
        </Button>
        {(filledCount > 0 || result) && (
          <Button variant="ghost" onClick={clear} disabled={busy} className="text-xs">
            Clear all
          </Button>
        )}
      </div>

      {result && result.samples && result.samples.length === 1 && (
        <div className="space-y-3 pt-2 border-t border-border">
          <SampleResultPanel sample={result.samples[0]} isOutlier={false} />
        </div>
      )}

      {result && result.comparison && result.samples && result.samples.length > 1 && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Overall summary */}
          <div className="rounded-sm border border-amber/30 bg-background/40 p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <GitCompare className="w-4 h-4 text-amber" />
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Cross-sample verdict</div>
              <div className={`ml-auto px-3 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-widest ${verdictColor(result.comparison.overall_verdict)}`}>
                {result.comparison.overall_verdict.replace('_', ' ')}
              </div>
              <div className="font-display text-3xl font-bold text-foreground">
                {Math.round(result.comparison.overall_score)}<span className="text-muted-foreground text-base font-normal">/100</span>
              </div>
            </div>

            <div className="h-2 w-full bg-background/40 border border-border rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber to-crimson transition-all"
                style={{ width: `${Math.min(100, Math.max(0, result.comparison.overall_score))}%` }}
              />
            </div>

            <p className="text-sm text-foreground/90 italic">{result.comparison.bottom_line}</p>

            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-amber" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Same author?</span>
                  <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-bold uppercase tracking-widest ${sameAuthorBadge(result.comparison.same_author)}`}>
                    {result.comparison.same_author}
                  </span>
                </div>
                <p className="text-foreground/80 text-[11px]">{result.comparison.same_author_reasoning}</p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Patterns repeated across samples</div>
                {result.comparison.repeated_patterns.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground italic">No repeated AI patterns.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.comparison.repeated_patterns.map((p, i) => (
                      <span key={i} className="text-[10px] bg-crimson/10 border border-crimson/40 text-crimson rounded-sm px-2 py-0.5">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="h-7 text-xs">
                {expanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {expanded ? 'Collapse per-sample evidence' : 'Expand per-sample evidence'}
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-3">
              {(result.samples || []).map((s) => (
                <SampleResultPanel
                  key={s.index}
                  sample={s}
                  isOutlier={result.comparison.outlier_index === s.index && result.samples.length > 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AiWritingDetectorCard;
