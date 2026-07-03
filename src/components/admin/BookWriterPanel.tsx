import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { BookOpen, Loader2, Wand2, Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToAdminLibrary, downloadText, type AdminLibraryItem } from '@/lib/adminLibrary';

type Beat = string;
type Chapter = { number: number; title: string; hook?: string; beats?: Beat[]; body?: string; generating?: boolean };
type Outline = { title: string; subtitle?: string; premise?: string; chapters: Chapter[] };

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

  const [autoWriting, setAutoWriting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const entries = useMemo(() => entriesFromLibrary(library), [library]);

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
      return next;
    } catch (e) {
      toast({ title: `Chapter ${ch.number} failed`, description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
      const next = chapters.map((c, i) => i === idx ? { ...c, generating: false } : c);
      setOutline((prev) => prev ? ({ ...prev, chapters: next }) : prev);
      return next;
    }
  };

  const autoWriteAll = async (o: Outline) => {
    setAutoWriting(true);
    let chapters = o.chapters;
    setProgress({ done: 0, total: chapters.length });
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].body) { setProgress({ done: i + 1, total: chapters.length }); continue; }
      setOpenChapter(i);
      chapters = chapters.map((c, ci) => ci === i ? { ...c, generating: true } : c);
      setOutline({ ...o, chapters });
      // eslint-disable-next-line no-await-in-loop
      chapters = await draftChapterInternal(i, chapters);
      setProgress({ done: i + 1, total: chapters.length });
    }
    setAutoWriting(false);
    toast({ title: 'Manuscript complete', description: `${chapters.length} chapters drafted.` });
  };

  const generateOutline = async () => {
    if (entries.length === 0) {
      toast({ title: 'No library entries yet', description: 'Save some responses first — the book pulls voice + material from them.', variant: 'destructive' });
      return;
    }
    setBuildingOutline(true);
    try {
      const data = await invokeBook({
        action: 'outline',
        bookTitle, audience, styleNotes,
        entries: entries.slice(0, 60),
      });
      const o = (data as { outline: Outline }).outline;
      setOutline(o);
      toast({ title: 'Outline drafted — writing now', description: `${o.chapters?.length || 0} chapters queued.` });
      // Auto-start writing the full book, chapter by chapter.
      void autoWriteAll(o);
    } catch (e) {
      toast({ title: 'Outline failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBuildingOutline(false);
    }
  };

  const generateChapter = async (idx: number) => {
    if (!outline) return;
    setOutline({ ...outline, chapters: outline.chapters.map((c, i) => i === idx ? { ...c, generating: true } : c) });
    await draftChapterInternal(idx, outline.chapters.map((c, i) => i === idx ? { ...c, generating: true } : c));
    setOpenChapter(idx);
  };

  const generateAll = async () => {
    if (!outline) return;
    await autoWriteAll(outline);
  };


  const buildManuscript = (): string => {
    if (!outline) return '';
    const lines: string[] = [];
    lines.push(`# ${outline.title}`);
    if (outline.subtitle) lines.push(`\n_${outline.subtitle}_`);
    if (outline.premise) lines.push(`\n${outline.premise}`);
    lines.push('\n---\n\n## Table of Contents\n');
    outline.chapters.forEach((c) => lines.push(`- Chapter ${c.number}. ${c.title}`));
    lines.push('\n---\n');
    outline.chapters.forEach((c) => {
      lines.push('\n');
      lines.push(c.body ? c.body : `# Chapter ${c.number}. ${c.title}\n\n_[not yet drafted]_\n\nHook: ${c.hook || ''}\n\n${(c.beats || []).map((b) => `- ${b}`).join('\n')}`);
      lines.push('\n');
    });
    return lines.join('\n');
  };

  const downloadManuscript = () => {
    if (!outline) return;
    const slug = outline.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    downloadText(`${slug || 'manuscript'}.md`, buildManuscript());
  };

  const saveToLibrary = async () => {
    if (!outline) return;
    try {
      await saveToAdminLibrary({
        tool_type: 'book_manuscript',
        title: outline.title,
        input_data: { audience, styleNotes, entryCount: entries.length },
        output_data: { outline, manuscript: buildManuscript() },
      });
      toast({ title: 'Saved to library' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    }
  };

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
