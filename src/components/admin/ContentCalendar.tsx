import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Loader2, Eye, Copy, Download, Trash2, X, MessageSquare, ImageIcon, CalendarDays, List, LayoutGrid, Sparkles, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { listAdminLibrary, deleteFromAdminLibrary, formatLibraryItemAsText, saveToAdminLibrary, type AdminLibraryItem } from '@/lib/adminLibrary';
import { downloadLibraryItemAsPdf } from '@/lib/generateLibraryPdf';
import { LibraryItemRenderer } from '@/components/LibraryItemRenderer';
import { ContentAI } from './ContentAI';
import { PostImageGenerator } from './PostImageGenerator';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

const TOOL_LABELS: Record<string, string> = {
  social_content: 'Social Content',
  sales_scripts: 'Sales Scripts',
  content_calendar: 'Content Calendar',
  follow_up_plan: 'Follow-Up Plan',
  strategic_questions: 'Strategic Questions',
  brand_contradictions: 'Brand Contradictions',
  friction_audit: 'Friction Audit',
  playbook: 'Playbook',
  day_post: 'Day Post',
  linkedin_post: 'LinkedIn Post',
};

const TOOL_COLORS: Record<string, string> = {
  social_content: 'bg-amber/80',
  sales_scripts: 'bg-blue-500/80',
  content_calendar: 'bg-green-500/80',
  follow_up_plan: 'bg-purple-500/80',
  strategic_questions: 'bg-cyan-500/80',
  brand_contradictions: 'bg-[hsl(var(--crimson))]/80',
  friction_audit: 'bg-orange-500/80',
  playbook: 'bg-pink-500/80',
  day_post: 'bg-amber',
  linkedin_post: 'bg-sky-500/80',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type ViewMode = 'calendar' | 'list' | 'grid';

interface ContentCalendarProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ viewMode: externalViewMode, onViewModeChange }) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('calendar');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  const [items, setItems] = useState<AdminLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [viewItem, setViewItem] = useState<AdminLibraryItem | null>(null);
  const [aiItem, setAiItem] = useState<AdminLibraryItem | null>(null);

  // ── Day-content AI generator state
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genFormat, setGenFormat] = useState<'leak_of_week' | 'case_file' | 'diagnostic' | 'field_note' | 'contrarian'>('leak_of_week');
  const [genLoading, setGenLoading] = useState(false);

  const FORMAT_OPTIONS: { key: typeof genFormat; label: string; desc: string }[] = [
    { key: 'leak_of_week', label: 'Leak of the Week', desc: 'One blunt operator post about a single leak.' },
    { key: 'case_file',    label: 'Case File',        desc: 'Tuesday autopsy of one specific leak. Dollar + vertical.' },
    { key: 'diagnostic',   label: 'Diagnostic',       desc: '3-5 numbered questions for this week.' },
    { key: 'field_note',   label: 'Field Note',       desc: 'Founder-to-founder observation. Real moment.' },
    { key: 'contrarian',   label: 'Contrarian Take',  desc: 'Disagree with conventional wisdom.' },
  ];

  const generateDayContent = async () => {
    if (!selectedDay) return;
    setGenLoading(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('generate-day-content', {
        body: { date: selectedDay, prompt: genPrompt.trim(), format: genFormat },
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const content = data?.content;
      if (!content) throw new Error('No content returned');
      const created_at = new Date(`${selectedDay}T12:00:00`).toISOString();
      const saved = await saveToAdminLibrary({
        tool_type: 'day_post',
        title: content.title || 'Untitled dispatch',
        input_data: { prompt: genPrompt, format: genFormat, date: selectedDay },
        output_data: content,
        created_at,
      });
      setItems(prev => [saved, ...prev]);
      setGenPrompt('');
      setGenOpen(false);
      toast({ title: 'Saved to this day', description: content.title });
    } catch (e: unknown) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGenLoading(false);
    }
  };
  

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminLibrary();
      setItems(data);
    } catch (e: any) {
      toast({ title: 'Failed to load library', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!typeFilter) return items;
    return items.filter(i => i.tool_type === typeFilter);
  }, [items, typeFilter]);

  const byDate = useMemo(() => {
    const map: Record<string, AdminLibraryItem[]> = {};
    filtered.forEach(item => {
      const key = dateKey(new Date(item.created_at));
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [filtered]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const dayItems = selectedDay ? (byDate[selectedDay] || []) : [];
  const types = Array.from(new Set(items.map(i => i.tool_type)));

  const handleDelete = async (item: AdminLibraryItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await deleteFromAdminLibrary(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleCopy = async (item: AdminLibraryItem) => {
    await navigator.clipboard.writeText(formatLibraryItemAsText(item));
    toast({ title: 'Copied' });
  };

  const handleItemUpdated = (updated: AdminLibraryItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    if (viewItem?.id === updated.id) setViewItem(updated);
  };

  const renderItemCard = (item: AdminLibraryItem) => {
    const out = item.output_data as Record<string, any>;
    const existingImg = out?._generated_image_url as string | undefined;
    const imagePrompt = item.title || out?.businessName || 'business operations';
    return (
      <div key={item.id} className="glass rounded-lg p-3 border border-border space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`w-2 h-2 rounded-full ${TOOL_COLORS[item.tool_type] || 'bg-muted-foreground'}`} />
          <span className="text-[10px] font-bold uppercase text-amber">{TOOL_LABELS[item.tool_type] || item.tool_type}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
        <PostImageGenerator
          prompt={imagePrompt}
          libraryItemId={item.id}
          existingImageUrl={existingImg}
          compact
          onImageGenerated={(url) => {
            const updated = { ...item, output_data: { ...out, _generated_image_url: url } };
            handleItemUpdated(updated);
            import('@/lib/adminLibrary').then(m => m.updateAdminLibraryItem(item.id, { ...out, _generated_image_url: url })).catch(() => {});
          }}
        />
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(item)}><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(item)}><Copy className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadLibraryItemAsPdf(item)}><Download className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiItem(item)} title="Edit with AI"><MessageSquare className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
        </div>
      </div>
    );
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {viewMode === 'calendar' && (
            <>
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
              <h2 className="text-2xl font-bold text-foreground font-display min-w-[220px] text-center">{monthLabel}</h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
            </>
          )}
          {viewMode !== 'calendar' && (
            <h2 className="text-2xl font-bold text-foreground font-display">My Library</h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">{filtered.length} items</span>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} title="Calendar"><CalendarDays className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} title="List"><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`} title="Grid"><LayoutGrid className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${!typeFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>All</button>
        {types.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
            {TOOL_LABELS[t] || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass p-12 rounded-xl text-center"><Loader2 className="w-8 h-8 animate-spin text-amber mx-auto" /></div>
      ) : (
        <>
          {viewMode === 'calendar' && (
            <div className="flex gap-4 flex-col lg:flex-row">
              {/* Calendar grid */}
              <div className="flex-1">
                <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="bg-muted/50 p-2 text-center text-xs font-bold text-muted-foreground">{d}</div>
                  ))}
                  {cells.map((day, idx) => {
                    if (day === null) return <div key={`e-${idx}`} className="bg-background/50 min-h-[80px]" />;
                    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayData = byDate[key] || [];
                    const isSelected = selectedDay === key;
                    const isToday = key === dateKey(new Date());
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(isSelected ? null : key)}
                        className={`bg-background min-h-[80px] p-1.5 text-left transition-colors hover:bg-muted/30 relative ${isSelected ? 'ring-2 ring-primary' : ''}`}
                      >
                        <span className={`text-xs font-mono ${isToday ? 'text-amber font-bold' : 'text-muted-foreground'}`}>{day}</span>
                        {dayData.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {dayData.slice(0, 5).map((item, i) => (
                              <span key={i} className={`w-2 h-2 rounded-full ${TOOL_COLORS[item.tool_type] || 'bg-muted-foreground'}`} title={TOOL_LABELS[item.tool_type] || item.tool_type} />
                            ))}
                            {dayData.length > 5 && <span className="text-[9px] text-muted-foreground">+{dayData.length - 5}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side panel — items for selected day */}
              {selectedDay && (
                <div className="w-full lg:w-[360px] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground font-display">{new Date(selectedDay + 'T12:00:00').toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedDay(null); setGenOpen(false); }}><X className="w-4 h-4" /></Button>
                  </div>

                  {/* AI day-content generator */}
                  <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-2">
                    {!genOpen ? (
                      <Button
                        size="sm"
                        onClick={() => setGenOpen(true)}
                        className="w-full bg-amber text-background hover:bg-amber/90 font-bold"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate AI content for this day
                      </Button>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-amber font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> New post for this day
                          </span>
                          <button
                            type="button"
                            onClick={() => { setGenOpen(false); setGenPrompt(''); }}
                            className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                            disabled={genLoading}
                          >Cancel</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {FORMAT_OPTIONS.map(o => {
                            const on = genFormat === o.key;
                            return (
                              <button
                                key={o.key}
                                type="button"
                                onClick={() => setGenFormat(o.key)}
                                title={o.desc}
                                className={`text-[10px] rounded px-2 py-1.5 border text-left transition ${on ? 'bg-amber/20 border-amber text-amber font-bold' : 'bg-background/40 border-border text-muted-foreground hover:border-amber/40 hover:text-amber'}`}
                              >{o.label}</button>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug">{FORMAT_OPTIONS.find(o => o.key === genFormat)?.desc}</p>
                        <Textarea
                          value={genPrompt}
                          onChange={(e) => setGenPrompt(e.target.value)}
                          rows={3}
                          placeholder='Optional direction. e.g. "Quote-to-cash leak in commercial roofing — cite a $187k example."'
                          className="text-xs"
                          disabled={genLoading}
                        />
                        <Button
                          size="sm"
                          onClick={generateDayContent}
                          disabled={genLoading}
                          className="w-full bg-amber text-background hover:bg-amber/90 font-bold"
                        >
                          {genLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                          {genLoading ? 'Generating…' : 'Generate & save to this day'}
                        </Button>
                      </>
                    )}
                  </div>

                  {dayItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No content saved on this day yet.</p>
                  ) : (
                    dayItems.map(item => renderItemCard(item))
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No saved content yet.</p>
              ) : (
                filtered.map(item => (
                  <div key={item.id} className="glass rounded-lg p-4 border border-border flex items-center gap-4">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${TOOL_COLORS[item.tool_type] || 'bg-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase text-amber">{TOOL_LABELS[item.tool_type] || item.tool_type}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(item)}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(item)}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadLibraryItemAsPdf(item)}><Download className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiItem(item)} title="Edit with AI"><MessageSquare className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8 col-span-full">No saved content yet.</p>
              ) : (
                filtered.map(item => {
                  const out = item.output_data as Record<string, any>;
                  const imgUrl = out?._generated_image_url as string | undefined;
                  return (
                    <div key={item.id} className="glass rounded-xl border border-border overflow-hidden flex flex-col">
                      {imgUrl && (
                        <img src={imgUrl} alt="" className="w-full h-20 object-cover" />
                      )}
                      <div className="p-3 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${TOOL_COLORS[item.tool_type] || 'bg-muted-foreground'}`} />
                          <span className="text-[10px] font-bold uppercase text-amber">{TOOL_LABELS[item.tool_type] || item.tool_type}</span>
                        </div>
                        <p className="text-sm font-bold text-foreground line-clamp-2 mb-1">{item.title}</p>
                        <span className="text-[10px] text-muted-foreground mt-auto">{new Date(item.created_at).toLocaleDateString()}</span>
                        <div className="flex gap-1 mt-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(item)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(item)}><Copy className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadLibraryItemAsPdf(item)}><Download className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiItem(item)}><MessageSquare className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* View modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-border">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setViewItem(null)}><X className="w-5 h-5" /></Button>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase text-amber bg-amber/10 px-2 py-0.5 rounded">{TOOL_LABELS[viewItem.tool_type] || viewItem.tool_type}</span>
              <span className="text-xs text-muted-foreground">{new Date(viewItem.created_at).toLocaleString()}</span>
            </div>
            <h3 className="text-xl font-bold text-foreground font-display mb-4 pr-8">{viewItem.title}</h3>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => handleCopy(viewItem)}><Copy className="w-4 h-4 mr-1" /> Copy</Button>
              <Button variant="outline" size="sm" onClick={() => downloadLibraryItemAsPdf(viewItem)}><Download className="w-4 h-4 mr-1" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={() => { setAiItem(viewItem); setViewItem(null); }}><MessageSquare className="w-4 h-4 mr-1" /> Edit with AI</Button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto pr-2">
              <LibraryItemRenderer item={viewItem} />
            </div>
          </div>
        </div>
      )}

      {/* AI editor drawer */}
      {aiItem && (
        <ContentAI
          item={aiItem}
          onClose={() => setAiItem(null)}
          onItemUpdated={handleItemUpdated}
        />
      )}
    </div>
  );
};
