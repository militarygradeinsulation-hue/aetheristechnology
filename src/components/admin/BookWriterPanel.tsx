import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BookOpen, Loader2, Wand2, Download, FileText, ChevronDown, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToAdminLibrary, updateAdminLibraryItem, listAdminLibrary, downloadText, type AdminLibraryItem } from '@/lib/adminLibrary';

type Beat = string;
type Chapter = { number: number; title: string; hook?: string; beats?: Beat[]; body?: string; generating?: boolean };
type Outline = { title: string; subtitle?: string; premise?: string; chapters: Chapter[] };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const LOCAL_DRAFT_KEY = 'aetheris.bookWriter.autosave.v2';

function cleanOutline(o: Outline): Outline {
  return {
    ...o,
    chapters: (o.chapters || []).map((c) => ({ ...c, generating: false })),
  };
}

function isOutline(value: unknown): value is Outline {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.title === 'string' && Array.isArray(rec.chapters);
}

function readRecord(obj: unknown): Record<string, unknown> {
  return obj && typeof obj === 'object' ? obj as Record<string, unknown> : {};
}

function readString(obj: unknown, key: string): string {
  if (!obj || typeof obj !== 'object') return '';
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : '';
}

function entriesFromLibrary(items: AdminLibraryItem[]) {
  return items.map((it) => ({
    title: it.title,
    topic: readString(it.input_data, 'topic') || readString(it.input_data, 'postText').slice(0, 140),
    body: readString(it.output_data, 'body'),
    mode: readString(it.output_data, 'mode'),
  })).filter((e) => e.body);
}

function buildManuscriptFromOutline(outline: Outline): string {
  const o = cleanOutline(outline);
  const lines: string[] = [];
  lines.push(`# ${o.title}`);
  if (o.subtitle) lines.push(`\n_${o.subtitle}_`);
  if (o.premise) lines.push(`\n${o.premise}`);
  lines.push('\n---\n\n## Table of Contents\n');
  o.chapters.forEach((c) => lines.push(`- Chapter ${c.number}. ${c.title}`));
  lines.push('\n---\n');
  o.chapters.forEach((c) => {
    lines.push('\n');
    lines.push(c.body ? c.body : `# Chapter ${c.number}. ${c.title}\n\n_[not yet drafted]_\n\nHook: ${c.hook || ''}\n\n${(c.beats || []).map((b) => `- ${b}`).join('\n')}`);
    lines.push('\n');
  });
  return lines.join('\n');
}

async function invokeBook(payload: Record<string, unknown>) {
  const token = getAdminToken();
  const { data, error } = await supabase.functions.invoke('book-writer', {
    body: payload,
    headers: token ? { 'x-admin-token': token } : {},
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Record<string, unknown>;
}

export const BookWriterPanel: React.FC<{ library: AdminLibraryItem[] }> = ({ library }) => {
  const [open, setOpen] = useState(false);
  const [bookTitle, setBookTitle] = useState('Your Business Is Leaking');
  const [audience, setAudience] = useState('founders, revenue operators, ops leaders in SMB manufacturing & services');
  const [styleNotes, setStyleNotes] = useState('Forensic operator voice. Case-file callouts. "Because" reasoning. No fluff.');
  const [outline, setOutline] = useState<Outline | null>(null);
  const [buildingOutline, setBuildingOutline] = useState(false);
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [savedLibraryId, setSavedLibraryId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');

  const [autoWriting, setAutoWriting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const savedLibraryIdRef = useRef<string | null>(null);
  const latestOutlineRef = useRef<Outline | null>(null);

  const entries = useMemo(() => entriesFromLibrary(library), [library]);

  useEffect(() => { savedLibraryIdRef.current = savedLibraryId; }, [savedLibraryId]);
  useEffect(() => { latestOutlineRef.current = outline; }, [outline]);

  const writeLocalDraft = useCallback((currentOutline: Outline | null = latestOutlineRef.current) => {
    try {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
        savedLibraryId: savedLibraryIdRef.current,
        bookTitle,
        audience,
        styleNotes,
        outline: currentOutline ? cleanOutline(currentOutline) : null,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Local autosave is best-effort; backend save still runs at checkpoints.
    }
  }, [audience, bookTitle, styleNotes]);

  useEffect(() => {
    writeLocalDraft(outline);
  }, [audience, bookTitle, outline, savedLibraryId, styleNotes, writeLocalDraft]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      let localUpdated = '';
      try {
        const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
        if (raw) {
          const parsed = readRecord(JSON.parse(raw));
          localUpdated = String(parsed.updatedAt || '');
          if (typeof parsed.bookTitle === 'string') setBookTitle(parsed.bookTitle);
          if (typeof parsed.audience === 'string') setAudience(parsed.audience);
          if (typeof parsed.styleNotes === 'string') setStyleNotes(parsed.styleNotes);
          if (typeof parsed.savedLibraryId === 'string') setSavedLibraryId(parsed.savedLibraryId);
          if (isOutline(parsed.outline)) {
            const restored = cleanOutline(parsed.outline);
            setOutline(restored);
            setOpen(true);
            setOpenChapter(restored.chapters.findIndex((c) => !c.body));
          }
        }
      } catch {
        // Ignore corrupt local drafts and fall back to the library.
      }

      try {
        const items = await listAdminLibrary({ toolType: 'book_manuscript', includeData: true, maxPages: 1 });
        if (cancelled) return;
        const latest = items.find((item) => isOutline(readRecord(item.output_data).outline));
        if (!latest) return;
        const out = readRecord(latest.output_data);
        const serverUpdated = String(out.updatedAt || latest.created_at || '');
        if (localUpdated && serverUpdated && Date.parse(localUpdated) > Date.parse(serverUpdated)) return;
        const restored = cleanOutline(out.outline as Outline);
        setSavedLibraryId(latest.id);
        setBookTitle(latest.title || restored.title || bookTitle);
        if (typeof out.audience === 'string') setAudience(out.audience);
        if (typeof out.styleNotes === 'string') setStyleNotes(out.styleNotes);
        setOutline(restored);
        setOpen(true);
        setOpenChapter(restored.chapters.findIndex((c) => !c.body));
        setLastSavedAt(serverUpdated);
        setSaveState('saved');
      } catch {
        // Existing library draft is optional; local draft already restored if present.
      }
    };
    void hydrate();
    return () => { cancelled = true; };
    // Intentionally runs once on mount so an async library load cannot keep
    // overwriting active edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistDraft = useCallback(async (currentOutline: Outline, reason: string) => {
    const cleaned = cleanOutline(currentOutline);
    const updatedAt = new Date().toISOString();
    writeLocalDraft(cleaned);
    setSaveState('saving');
    const output_data = {
      outline: cleaned,
      manuscript: buildManuscriptFromOutline(cleaned),
      audience,
      styleNotes,
      updatedAt,
      saveReason: reason,
      draftedChapters: cleaned.chapters.filter((c) => Boolean(c.body)).length,
      totalChapters: cleaned.chapters.length,
    };
    try {
      const existingId = savedLibraryIdRef.current;
      if (existingId) {
        await updateAdminLibraryItem(existingId, output_data, { title: cleaned.title || bookTitle || 'Book Manuscript' });
      } else {
        const item = await saveToAdminLibrary({
          tool_type: 'book_manuscript',
          title: cleaned.title || bookTitle || 'Book Manuscript',
          input_data: { audience, styleNotes, entryCount: entries.length, autosaved: true },
          output_data,
        });
        savedLibraryIdRef.current = item.id;
        setSavedLibraryId(item.id);
      }
      setLastSavedAt(updatedAt);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      console.warn('Book autosave failed', e);
    }
  }, [audience, bookTitle, entries.length, styleNotes, writeLocalDraft]);

  const draftChapterInternal = async (
    idx: number,
    chapters: Chapter[],
  ): Promise<Chapter[]> => {
    const ch = chapters[idx];
    try {
      const data = await invokeBook({
        action: 'chapter',
        bookTitle, audience, styleNotes,
        chapterNumber: ch.number,
        chapterTitle: ch.title,
        beats: ch.beats || [],
        brief: ch.hook || '',
        wordTarget: 1800,
        entries: entries.slice(0, 40),
      });
      const body = String((data as { chapter?: string }).chapter || '');
      const next = chapters.map((c, i) => i === idx ? { ...c, body, generating: false } : c);
      setOutline((prev) => prev ? ({ ...prev, chapters: next }) : prev);
      await persistDraft({ ...(latestOutlineRef.current || { title: bookTitle, chapters: next }), chapters: next }, `chapter-${ch.number}`);
      return next;
    } catch (e) {
      toast({ title: `Chapter ${ch.number} failed`, description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
      const next = chapters.map((c, i) => i === idx ? { ...c, generating: false } : c);
      setOutline((prev) => prev ? ({ ...prev, chapters: next }) : prev);
      writeLocalDraft({ ...(latestOutlineRef.current || { title: bookTitle, chapters: next }), chapters: next });
      return next;
    }
  };

  // Poll the library row so progress reflects the server-side worker and
  // is identical across every admin portal / device viewing the same book.
  const pollingRef = useRef<number | null>(null);
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((libId: string) => {
    stopPolling();
    const tick = async () => {
      try {
        const items = await listAdminLibrary({ toolType: 'book_manuscript', includeData: true, maxPages: 1 });
        const row = items.find((it) => it.id === libId);
        if (!row) return;
        const out = readRecord(row.output_data);
        if (isOutline(out.outline)) {
          const cleaned = cleanOutline(out.outline as Outline);
          setOutline(cleaned);
          latestOutlineRef.current = cleaned;
          const done = cleaned.chapters.filter((c) => c.body).length;
          setProgress({ done, total: cleaned.chapters.length });
        }
        const status = String(out.jobStatus || '');
        if (status === 'complete') {
          setAutoWriting(false);
          setLastSavedAt(String(out.updatedAt || row.created_at || ''));
          setSaveState('saved');
          stopPolling();
          toast({ title: 'Book complete', description: 'Every chapter drafted and saved.' });
        } else if (status === 'error') {
          setAutoWriting(false);
          setSaveState('error');
          stopPolling();
          toast({ title: 'Book job errored', description: String(out.jobError || 'Unknown'), variant: 'destructive' });
        } else if (status === 'running') {
          setAutoWriting(true);
          setSaveState('saving');
        }
      } catch (e) {
        console.warn('book poll failed', e);
      }
    };
    void tick();
    pollingRef.current = window.setInterval(tick, 6000) as unknown as number;
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startAutoWrite = async (opts: { libraryId?: string | null } = {}) => {
    if (entries.length === 0 && !opts.libraryId) {
      toast({ title: 'No library entries yet', description: 'Save some responses first — the book pulls voice + material from them.', variant: 'destructive' });
      return;
    }
    setBuildingOutline(true);
    setAutoWriting(true);
    try {
      const data = await invokeBook({
        action: 'auto_write',
        libraryId: opts.libraryId || savedLibraryIdRef.current || undefined,
        bookTitle, audience, styleNotes,
        entries: entries.slice(0, 60),
      });
      const libId = String((data as { libraryId?: string }).libraryId || '');
      if (!libId) throw new Error('No library id returned');
      savedLibraryIdRef.current = libId;
      setSavedLibraryId(libId);
      const o = (data as { outline?: Outline }).outline;
      if (o) {
        const cleaned = cleanOutline(o);
        setOutline(cleaned);
        latestOutlineRef.current = cleaned;
      }
      toast({ title: 'Writing your book', description: 'The worker runs on the backend — safe to close this tab.' });
      startPolling(libId);
    } catch (e) {
      setAutoWriting(false);
      toast({ title: 'Could not start book job', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBuildingOutline(false);
    }
  };

  const generateOutline = () => startAutoWrite();
  const generateAll = () => startAutoWrite({ libraryId: savedLibraryIdRef.current });

  const generateChapter = async (idx: number) => {
    if (!outline) return;
    setOutline({ ...outline, chapters: outline.chapters.map((c, i) => i === idx ? { ...c, generating: true } : c) });
    await draftChapterInternal(idx, outline.chapters.map((c, i) => i === idx ? { ...c, generating: true } : c));
    setOpenChapter(idx);
  };




  const buildManuscript = (): string => outline ? buildManuscriptFromOutline(outline) : '';

  const downloadManuscript = () => {
    if (!outline) return;
    const slug = outline.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadText(`${slug || 'manuscript'}.md`, buildManuscript());
  };

  const saveToLibrary = async () => {
    if (!outline) return;
    await persistDraft(outline, 'manual');
    toast({ title: 'Saved to library' });
  };

  const saveStatusLabel = saveState === 'saving'
    ? 'Saving…'
    : saveState === 'saved'
      ? `Saved${lastSavedAt ? ` ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
      : saveState === 'error'
        ? 'Saved locally — library retry needed'
        : 'Autosave ready';

  return (
    <div className="pt-3 border-t border-border/60">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left group">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber" />
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Book Writer</div>
          <span className="text-[10px] text-muted-foreground">({entries.length} entries · source material)</span>
        </div>
        <span className="text-[10px] text-muted-foreground group-hover:text-amber">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Working title</div>
              <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Audience</div>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Style / tone notes</div>
              <Textarea rows={2} value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} className="text-xs" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={generateOutline} disabled={buildingOutline || autoWriting} className="bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90 h-8 text-xs">
              {(buildingOutline || autoWriting) ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
              {outline ? 'Regenerate & rewrite book' : 'Write the book from my library'}
            </Button>
            {outline && (
              <>
                <Button size="sm" variant="outline" onClick={generateAll} disabled={autoWriting} className="h-8 text-xs">
                  {autoWriting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                  {autoWriting && progress ? `Writing ${progress.done}/${progress.total}` : 'Draft all chapters'}
                </Button>

                <Button size="sm" variant="outline" onClick={downloadManuscript} className="h-8 text-xs">
                  <Download className="w-3 h-3 mr-1" /> Download .md
                </Button>
                <Button size="sm" variant="ghost" onClick={saveToLibrary} className="h-8 text-xs">
                  <FileText className="w-3 h-3 mr-1" /> Save to library
                </Button>
              </>
            )}
            <div className="inline-flex items-center gap-1.5 h-8 px-2 text-[10px] text-muted-foreground">
              {saveState === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : saveState === 'error' ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <Check className="w-3 h-3 text-green-400" />}
              {saveStatusLabel}
            </div>
          </div>

          {outline && (
            <div className="rounded-md border border-border bg-background/40 p-3 space-y-2">
              <div className="text-sm font-semibold text-foreground">{outline.title}</div>
              {outline.subtitle && <div className="text-xs italic text-amber/90">{outline.subtitle}</div>}
              {outline.premise && <div className="text-[11px] text-muted-foreground">{outline.premise}</div>}
              <div className="pt-2 space-y-1">
                {outline.chapters.map((c, i) => {
                  const isOpen = openChapter === i;
                  return (
                    <div key={i} className="border border-border/60 rounded">
                      <button type="button" onClick={() => setOpenChapter(isOpen ? null : i)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-amber/5 text-left">
                        {isOpen ? <ChevronDown className="w-3 h-3 text-amber" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[10px] font-mono text-amber">Ch {c.number}.</span>
                        <span className="text-xs flex-1">{c.title}</span>
                        {c.body ? <span className="text-[9px] text-green-400">drafted</span> : null}
                      </button>
                      {isOpen && (
                        <div className="p-2 border-t border-border/60 space-y-2">
                          {c.hook && <div className="text-[11px] italic text-foreground/80">"{c.hook}"</div>}
                          {c.beats && c.beats.length > 0 && (
                            <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                              {c.beats.map((b, bi) => <li key={bi}>{b}</li>)}
                            </ul>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => generateChapter(i)} disabled={c.generating} className="h-7 text-[11px] bg-amber text-background hover:bg-amber/90">
                              {c.generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                              {c.body ? 'Redraft chapter' : 'Draft chapter'}
                            </Button>
                            {c.body && (
                              <Button size="sm" variant="outline" onClick={() => {
                                const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                downloadText(`ch${c.number}-${slug}.md`, c.body || '');
                              }} className="h-7 text-[11px]">
                                <Download className="w-3 h-3 mr-1" /> .md
                              </Button>
                            )}
                          </div>
                          {c.body && (
                            <div className="mt-2 max-h-72 overflow-y-auto text-[12px] whitespace-pre-wrap leading-relaxed bg-background/60 border border-border/40 rounded p-2">
                              {c.body}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!outline && (
            <div className="text-[11px] text-muted-foreground">
              Pulls voice, phrasing, and material from every entry in your Response Library. Generate an outline, then draft chapters one at a time or all at once.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookWriterPanel;
