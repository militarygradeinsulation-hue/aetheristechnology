import React, { useEffect, useRef, useState } from 'react';
import { useEasyMode } from '@/lib/easyMode';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Sparkles, Type, RotateCcw, Loader2, BookOpen, X, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

interface EasyModeBarProps {
  tabKey: string;
  /** Optional: long copy on this tab to allow AI rewrite into plain English. */
  longCopy?: string;
  className?: string;
}

/** Compact toggle + size scroller, designed to sit at the top of any tab body. */
export const EasyModeBar: React.FC<EasyModeBarProps> = ({ tabKey, longCopy, className }) => {
  const { easy, setEasy, sizeFor, setSize, resetSize } = useEasyMode();
  const size = sizeFor(tabKey);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const runRewrite = async () => {
    const src = (longCopy || '').trim();
    if (src.length < 60) {
      toast({ title: 'Nothing long enough to rewrite on this tab', variant: 'destructive' });
      return;
    }
    setAiBusy(true);
    setAiText('');
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('forensics-simplify', {
        body: { source: src.slice(0, 12000), toolLabel: `Tab: ${tabKey}` },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiText(data?.simplified || '');
      setAiOpen(true);
    } catch (e) {
      toast({ title: 'Rewrite failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className={`glass rounded-xl border border-amber/30 px-3 py-2 mb-4 flex flex-wrap items-center gap-3 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-amber">Easy mode</span>
        <Switch
          checked={easy}
          onCheckedChange={setEasy}
          aria-label="Toggle easy mode for this tab"
        />
        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
          {easy ? 'ON · plain English' : 'OFF · operator voice'}
        </span>
      </div>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <Type className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">Size</span>
        <Slider
          value={[Math.round(size * 100)]}
          min={85}
          max={150}
          step={5}
          onValueChange={(v) => setSize(tabKey, (v[0] || 100) / 100)}
          className="flex-1 max-w-[220px]"
          aria-label="Text and button size"
        />
        <span className="text-[10px] font-mono text-amber w-10 text-right">{Math.round(size * 100)}%</span>
        {size !== 1 && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => resetSize(tabKey)}
            className="h-6 w-6"
            title="Reset size"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        )}
      </div>

      {longCopy && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runRewrite}
          disabled={aiBusy}
          className="border-amber/50 text-amber hover:bg-amber/10"
          title="Rewrite the long text on this tab in plain English"
        >
          {aiBusy
            ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Rewriting…</>
            : <><BookOpen className="w-3.5 h-3.5 mr-1" /> Rewrite in plain English</>}
        </Button>
      )}

      {aiOpen && aiText && (
        <div className="w-full mt-2 bg-background/40 border border-amber/40 rounded p-3 relative">
          <button
            type="button"
            onClick={() => setAiOpen(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            aria-label="Close plain-English panel"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber mb-2">Plain-English version</div>
          <div className="text-sm whitespace-pre-wrap text-foreground/90 max-h-72 overflow-y-auto leading-relaxed">
            {aiText}
          </div>
        </div>
      )}
    </div>
  );
};

interface EasyModeWrapperProps {
  tabKey: string;
  /** Optional explicit copy to simplify. When omitted, the wrapper auto-reads visible text from its own DOM. */
  longCopy?: string;
  showBar?: boolean;
  children: React.ReactNode;
}

// In-memory cache so toggling Easy Mode off/on doesn't re-spend AI credits for the same content.
const simplifyCache = new Map<string, string>();

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
}

/** Wraps a tab body, applies per-tab size scaling, and — when Easy Mode is ON — auto-simplifies
 *  the visible text in that section into a plain-English panel at the top. */
export const EasyModeWrapper: React.FC<EasyModeWrapperProps> = ({ tabKey, longCopy, showBar = true, children }) => {
  const { easy, sizeFor } = useEasyMode();
  const size = sizeFor(tabKey);
  const contentRef = useRef<HTMLDivElement>(null);
  const [simplified, setSimplified] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0); // bump to force re-simplify

  // Read visible text from this tab's section.
  const collectSource = (): string => {
    if (longCopy && longCopy.trim().length > 40) return longCopy.trim().slice(0, 12000);
    const root = contentRef.current;
    if (!root) return '';
    // Exclude the easy-mode panel itself so we don't feed it back into the model.
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-easy-skip="true"]').forEach((n) => n.remove());
    const raw = (clone.innerText || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return raw.slice(0, 12000);
  };

  const runSimplify = async () => {
    const src = collectSource();
    if (src.length < 80) {
      toast({ title: 'Not enough text on this section to simplify' });
      return;
    }
    const cacheKey = `${tabKey}:${hashStr(src)}`;
    const cached = simplifyCache.get(cacheKey);
    if (cached && version === 0) {
      setSimplified(cached);
      return;
    }
    setBusy(true);
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('forensics-simplify', {
        body: { source: src, toolLabel: `Portal section: ${tabKey}` },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const out = (data?.simplified || '').trim();
      setSimplified(out);
      simplifyCache.set(cacheKey, out);
    } catch (e) {
      toast({ title: 'Easy Mode failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // Auto-run when Easy Mode turns on (or tab/version changes).
  useEffect(() => {
    if (!easy) return;
    // Wait for children to mount + render before reading text.
    const t = window.setTimeout(() => { runSimplify(); }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [easy, tabKey, version]);

  // Reset simplified text when leaving easy mode.
  useEffect(() => {
    if (!easy) { setSimplified(''); }
  }, [easy]);

  const style: React.CSSProperties = size !== 1 ? { zoom: size as unknown as number } : {};

  return (
    <div style={style}>
      {showBar && <div data-easy-skip="true"><EasyModeBar tabKey={tabKey} /></div>}

      {easy && (
        <div data-easy-skip="true" className="glass rounded-xl border border-amber/40 p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber">Plain-English version of this section</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { simplifyCache.delete(`${tabKey}:${hashStr(collectSource())}`); setVersion((v) => v + 1); }}
              disabled={busy}
              className="h-7 text-[10px]"
              title="Re-read this section"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-amber" /> Reading this section and rewriting it in plain English…
            </div>
          )}
          {!busy && simplified && (
            <div className="bg-background/40 border border-border rounded p-4 text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed max-h-[60vh] overflow-y-auto">
              {simplified}
            </div>
          )}
          {!busy && !simplified && (
            <p className="text-sm text-muted-foreground">Reading this section… give it a moment, then tap Refresh if nothing appears.</p>
          )}
          <p className="text-[10px] text-muted-foreground/70">The original section is still below — keep using it as normal.</p>
        </div>
      )}

      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

/** Renders the plain-English copy when easy mode is on, otherwise the normal one. */
export const EasyText: React.FC<{ easy: string; normal: string; as?: keyof JSX.IntrinsicElements; className?: string }> = ({
  easy, normal, as: Tag = 'span', className,
}) => {
  const { easy: isEasy } = useEasyMode();
  return <Tag className={className}>{isEasy && easy ? easy : normal}</Tag>;
};

export default EasyModeBar;
