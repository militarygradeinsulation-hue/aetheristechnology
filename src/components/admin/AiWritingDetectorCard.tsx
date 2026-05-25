import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, ScanSearch, Upload, X, ClipboardPaste, Eye, EyeOff, BookOpen, Plus, Users, GitCompare, Library, Trash2, User, RefreshCw, Copy, Download, Volume2, Square } from 'lucide-react';
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

// Each clue contributes points based on its confidence. Floor of 6 per clue
// so even low-confidence findings count, capped at 100. This replaces the
// AI's single number (which often collapsed to 1/100) with an additive,
// evidence-driven score the user can trace clue-by-clue.
const POINTS_PER_CLUE_BASE = 6;
const POINTS_PER_CLUE_MAX = 14;
function scoreFromClues(clues: Clue[] | undefined): number {
  if (!clues || !clues.length) return 0;
  let total = 0;
  for (const c of clues) {
    const conf = Math.max(0, Math.min(1, Number(c?.confidence) || 0.5));
    total += POINTS_PER_CLUE_BASE + (POINTS_PER_CLUE_MAX - POINTS_PER_CLUE_BASE) * conf;
  }
  return Math.round(Math.min(100, total));
}
function verdictFromScore(s: number): Verdict {
  if (s >= 80) return 'AI';
  if (s >= 60) return 'LIKELY_AI';
  if (s >= 40) return 'MIXED';
  if (s >= 20) return 'LIKELY_HUMAN';
  return 'HUMAN';
}
function normalizeResult(data: DetectResult): DetectResult {
  if (!data?.samples) return data;
  const samples = data.samples.map((s) => {
    const score = scoreFromClues(s.clues);
    return { ...s, score, verdict: verdictFromScore(score) };
  });
  const avg = samples.length ? Math.round(samples.reduce((a, b) => a + b.score, 0) / samples.length) : 0;
  const comparison = data.comparison
    ? { ...data.comparison, overall_score: avg, overall_verdict: verdictFromScore(avg) }
    : data.comparison;
  return { ...data, samples, comparison };
}

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

// ---------- Easy Read ----------
function verdictPlain(v: Verdict): string {
  switch (v) {
    case 'HUMAN': return 'almost certainly written by a human';
    case 'LIKELY_HUMAN': return 'most likely written by a human';
    case 'MIXED': return 'a mix of human and AI signals — unclear';
    case 'LIKELY_AI': return 'most likely written by AI';
    case 'AI': return 'almost certainly written by AI';
  }
}

function buildEasyReadText(result: DetectResult, subject: string): string {
  const lines: string[] = [];
  const isMulti = (result.samples?.length || 0) > 1;
  const overallScore = isMulti
    ? Math.round(result.comparison?.overall_score ?? 0)
    : Math.round(result.samples?.[0]?.score ?? 0);
  const overallVerdict = isMulti
    ? result.comparison?.overall_verdict
    : result.samples?.[0]?.verdict;

  lines.push(`AI Writing Detector — Plain English Report`);
  if (subject) lines.push(`Subject: ${subject}`);
  lines.push(`Date: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(`Overall score: ${overallScore} out of 100`);
  if (overallVerdict) lines.push(`Verdict: This writing is ${verdictPlain(overallVerdict)}.`);
  lines.push('');

  if (isMulti && result.comparison) {
    const c = result.comparison;
    lines.push(`Bottom line: ${c.bottom_line}`);
    lines.push('');
    lines.push(`Same author across all samples? ${c.same_author.toUpperCase()}.`);
    if (c.same_author_reasoning) lines.push(c.same_author_reasoning);
    lines.push('');
    if (c.repeated_patterns?.length) {
      lines.push(`Patterns that repeated across samples:`);
      c.repeated_patterns.forEach((p) => lines.push(`  • ${p}`));
      lines.push('');
    }
  }

  (result.samples || []).forEach((s) => {
    lines.push(`— Sample ${s.index} —`);
    lines.push(`Score: ${Math.round(s.score)}/100. ${verdictPlain(s.verdict)}.`);
    if (s.summary) lines.push(s.summary);
    if (s.clues?.length) {
      lines.push(`Things we found (${s.clues.length}):`);
      s.clues.forEach((c, i) => {
        lines.push(`  ${i + 1}. ${c.pattern}`);
        if (c.highlight) lines.push(`     Quote: "${c.highlight}"`);
        if (c.fact) lines.push(`     Why it matters: ${c.fact}`);
        if (c.source) lines.push(`     Source: ${c.source}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n').trim();
}

const EasyReadPanel: React.FC<{ result: DetectResult; subject: string }> = ({ result, subject }) => {
  const text = useMemo(() => buildEasyReadText(result, subject), [result, subject]);
  const [speaking, setSpeaking] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy blocked', variant: 'destructive' });
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safe = (subject || 'ai-detector-report').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    a.download = `${safe}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const speak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast({ title: 'Read-aloud not supported in this browser', variant: 'destructive' });
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="rounded-sm border border-emerald-400/30 bg-emerald-400/5 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <BookOpen className="w-4 h-4 text-emerald-400" />
        <div className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Easy Read Mode</div>
        <div className="text-[10px] text-muted-foreground">Plain English summary — copy, download, or read aloud.</div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={copy} className="h-7 text-[11px]">
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={download} className="h-7 text-[11px]">
            <Download className="w-3 h-3 mr-1" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={speak} className="h-7 text-[11px]">
            {speaking ? <Square className="w-3 h-3 mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
            {speaking ? 'Stop' : 'Read aloud'}
          </Button>
        </div>
      </div>
      <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90 max-h-[360px] overflow-y-auto">
        {text}
      </pre>
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

type LibraryEntry = {
  id: string;
  subject_name: string;
  notes: string | null;
  sample_count: number;
  overall_score: number | null;
  overall_verdict: Verdict | null;
  same_author: string | null;
  samples: any;
  result: DetectResult;
  created_at: string;
};

export const AiWritingDetectorCard: React.FC = () => {
  const [samples, setSamples] = useState<Sample[]>([newSample()]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [subjectName, setSubjectName] = useState('');
  const [notes, setNotes] = useState('');
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [libBusy, setLibBusy] = useState(false);
  const [libFilter, setLibFilter] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  const loadLibrary = async () => {
    setLibBusy(true);
    try {
      const { data, error } = await supabase
        .from('ai_detection_scans')
        .select('id,subject_name,notes,sample_count,overall_score,overall_verdict,same_author,samples,result,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLibrary((data || []) as any);
    } catch (e: any) {
      toast({ title: 'Could not load library', description: e?.message, variant: 'destructive' });
    } finally {
      setLibBusy(false);
    }
  };

  useEffect(() => { loadLibrary(); }, []);

  const subjectMatches = useMemo(() => {
    if (!subjectName.trim()) return [];
    const q = subjectName.trim().toLowerCase();
    return library.filter((l) => l.subject_name.toLowerCase().includes(q)).slice(0, 5);
  }, [subjectName, library]);

  const filteredLibrary = useMemo(() => {
    const q = libFilter.trim().toLowerCase();
    if (!q) return library;
    return library.filter((l) => l.subject_name.toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q));
  }, [libFilter, library]);

  const updateSample = (id: string, next: Sample) =>
    setSamples((prev) => prev.map((s) => (s.id === id ? next : s)));
  const removeSample = (id: string) =>
    setSamples((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  const addSample = () =>
    setSamples((prev) => (prev.length >= MAX_SAMPLES ? prev : [...prev, newSample()]));

  const filledCount = samples.filter((s) => s.text.trim() || s.imageDataUrl).length;

  const saveToLibrary = async (data: DetectResult) => {
    const name = subjectName.trim();
    if (!name) return;
    try {
      const samplesMeta = samples
        .filter((s) => s.text.trim() || s.imageDataUrl)
        .map((s) => ({
          text: s.text.trim() || null,
          has_image: !!s.imageDataUrl,
          chars: s.text.trim().length,
        }));
      const overall = data.samples?.length === 1
        ? { score: data.samples[0].score, verdict: data.samples[0].verdict, same_author: null }
        : { score: data.comparison?.overall_score ?? null, verdict: data.comparison?.overall_verdict ?? null, same_author: data.comparison?.same_author ?? null };
      const { error } = await supabase.from('ai_detection_scans').insert({
        subject_name: name,
        notes: notes.trim() || null,
        sample_count: samplesMeta.length,
        overall_score: overall.score,
        overall_verdict: overall.verdict,
        same_author: overall.same_author,
        samples: samplesMeta,
        result: data as any,
      });
      if (error) throw error;
      toast({ title: `Saved scan for ${name}` });
      loadLibrary();
    } catch (e: any) {
      toast({ title: 'Could not save scan', description: e?.message, variant: 'destructive' });
    }
  };

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
      const normalized = normalizeResult(data as DetectResult);
      setResult(normalized);
      setExpanded(true);
      if (subjectName.trim()) await saveToLibrary(normalized);
    } catch (e: any) {
      toast({ title: 'Scan failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setSamples([newSample()]);
    setResult(null);
    setSubjectName('');
    setNotes('');
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this saved scan?')) return;
    const { error } = await supabase.from('ai_detection_scans').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setLibrary((prev) => prev.filter((l) => l.id !== id));
  };

  const openEntry = (entry: LibraryEntry) => {
    setResult(normalizeResult(entry.result));
    setSubjectName(entry.subject_name);
    setNotes(entry.notes || '');
    setExpanded(true);
    setShowLibrary(false);
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

      {/* Subject / library row */}
      <div className="rounded-sm border border-amber/20 bg-background/30 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-amber" />
          <label className="text-[10px] uppercase tracking-widest font-bold text-amber font-mono">Subject (for the library)</label>
          <button
            onClick={() => { setShowLibrary((v) => !v); if (!showLibrary) loadLibrary(); }}
            className="ml-auto text-[10px] uppercase tracking-widest font-bold text-foreground/80 hover:text-amber inline-flex items-center gap-1"
          >
            <Library className="w-3 h-3" />
            Library ({library.length})
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_2fr] gap-2">
          <Input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Name (e.g. Jane Doe, Acme CEO)"
            className="h-8 text-xs"
          />
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (source, role, context)"
            className="h-8 text-xs"
          />
        </div>
        {subjectMatches.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            <span className="font-mono uppercase tracking-widest mr-1">Prior scans:</span>
            {subjectMatches.map((m) => (
              <button
                key={m.id}
                onClick={() => openEntry(m)}
                className="inline-flex items-center gap-1 mr-2 underline decoration-amber/40 hover:text-amber"
              >
                {m.subject_name} · {new Date(m.created_at).toLocaleDateString()} · {m.overall_verdict || '—'}
              </button>
            ))}
          </div>
        )}
        {!subjectName.trim() && (
          <div className="text-[10px] text-muted-foreground italic">
            Add a name to auto-save this scan to the library for future comparisons.
          </div>
        )}
      </div>

      {showLibrary && (
        <div className="rounded-sm border border-border bg-background/40 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Library className="w-4 h-4 text-amber" />
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber font-mono">Scan library</div>
            <button onClick={loadLibrary} disabled={libBusy} className="ml-auto text-muted-foreground hover:text-amber">
              <RefreshCw className={`w-3.5 h-3.5 ${libBusy ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <Input
            value={libFilter}
            onChange={(e) => setLibFilter(e.target.value)}
            placeholder="Filter by name or notes…"
            className="h-8 text-xs"
          />
          <div className="max-h-[320px] overflow-y-auto space-y-1.5">
            {filteredLibrary.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic py-4 text-center">
                {libBusy ? 'Loading…' : 'No saved scans yet.'}
              </div>
            ) : (
              filteredLibrary.map((l) => (
                <div key={l.id} className="rounded-sm border border-border bg-background/30 p-2.5 flex items-center gap-3 hover:border-amber/40">
                  <button onClick={() => openEntry(l)} className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate">{l.subject_name}</span>
                      {l.overall_verdict && (
                        <span className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-widest ${verdictColor(l.overall_verdict as Verdict)}`}>
                          {l.overall_verdict.replace('_', ' ')}
                        </span>
                      )}
                      {typeof l.overall_score === 'number' && (
                        <span className="text-[10px] font-mono text-amber">{Math.round(l.overall_score)}/100</span>
                      )}
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                        {l.sample_count} sample{l.sample_count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {new Date(l.created_at).toLocaleString()}{l.notes ? ` · ${l.notes}` : ''}
                    </div>
                  </button>
                  <button onClick={() => deleteEntry(l.id)} className="text-muted-foreground hover:text-crimson shrink-0" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
