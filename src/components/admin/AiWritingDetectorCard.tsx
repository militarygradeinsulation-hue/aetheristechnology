import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ScanSearch, Upload, X, ClipboardPaste } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Clue = { pattern: string; evidence: string };
type DetectResult = {
  score: number;
  verdict: 'HUMAN' | 'LIKELY_HUMAN' | 'MIXED' | 'LIKELY_AI' | 'AI';
  summary: string;
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

export const AiWritingDetectorCard: React.FC = () => {
  const [text, setText] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
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
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-ai-detect', {
        body: { postText: text.trim() || undefined, imageDataUrl: imageDataUrl || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as DetectResult);
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
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="p-5 glass border-amber/40 space-y-4">
      <div className="flex items-center gap-2">
        <ScanSearch className="w-4 h-4 text-amber" />
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
          AI Writing Detector
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Upload a screenshot OR paste someone's post/writing. We forensic-scan for AI tells and return a probability, verdict, and clues.
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
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-sm border text-[11px] font-bold uppercase tracking-widest ${verdictColor(result.verdict)}`}>
              {result.verdict.replace('_', ' ')}
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {Math.round(result.score)}<span className="text-muted-foreground text-base font-normal">/100</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">AI probability</div>
          </div>

          {/* Probability bar */}
          <div className="h-2 w-full bg-background/40 border border-border rounded-sm overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber to-crimson transition-all"
              style={{ width: `${Math.min(100, Math.max(0, result.score))}%` }}
            />
          </div>

          <p className="text-sm text-foreground/90 italic">{result.summary}</p>

          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
              Clues ({result.clues.length})
            </div>
            <ol className="space-y-2">
              {result.clues.map((c, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-amber font-bold shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">{c.pattern}</div>
                    <div className="text-xs text-muted-foreground">{c.evidence}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AiWritingDetectorCard;
