import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Copy, Check, Shuffle, Wand2, CalendarPlus, Upload, MessageSquareReply, X, RefreshCw, Library, Trash2, FileText, Image as ImageIcon, Wand } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { saveToAdminLibrary, listAdminLibrary, deleteFromAdminLibrary, type AdminLibraryItem } from '@/lib/adminLibrary';

const PILLARS = [
  'Revenue Leak Diagnosis',
  'System Failure Stories',
  'AI Demystification',
  'CRM & Follow-Up Gaps',
  'Founder Mindset',
  'Industry Specifics (Manufacturing/Construction)',
];

const POST_TYPES = [
  'Standard LinkedIn Post',
  'Carousel/List Post',
  'Contrarian Take',
  'Story-Based Post',
  'Data/Stat-Led Post',
];

const CREATORS = [
  { name: 'Alex Hormozi', niche: 'Revenue & Offers', handle: '@AlexHormozi' },
  { name: 'Gary Vaynerchuk', niche: 'Brand & Attention', handle: '@GaryVaynerchuk' },
  { name: 'Chris Walker', niche: 'Demand Gen', handle: '@chriswalker171' },
  { name: 'Codie Sanchez', niche: 'Business Operations', handle: '@CodieSanchez' },
  { name: 'Keenan', niche: 'Gap Selling', handle: '@Keenan' },
  { name: 'Morgan J Ingram', niche: 'Outbound Sales', handle: '@MorganJIngram' },
  { name: 'James Clear', niche: 'Systems & Habits', handle: '@jamesclear' },
  { name: 'Simon Sinek', niche: 'Leadership', handle: '@simonsinek' },
  { name: 'Noah Kagan', niche: 'Simplicity & Execution', handle: '@noahkagan' },
  { name: 'Justin Welsh', niche: 'Lean Systems', handle: '@JustinWelsh' },
  { name: 'Ethan Mollick', niche: 'Applied AI', handle: '@emollick' },
  { name: 'Allie K. Miller', niche: 'AI for Business', handle: '@alliekmiller' },
];

const PREMADE_TOPICS: Record<string, string[]> = {
  'Revenue Leaks': [
    'Most manufacturers have no idea how many leads fall through the cracks after a trade show.',
    'The follow-up gap that quietly costs commercial services firms $40k/month.',
    'Quote-to-cash leakage: where B2B operators lose 8-12% margin without noticing.',
    'Your "best" rep is your biggest leak, and your CRM proves it.',
    'The 3 silent leaks every $5M-$50M business has but refuses to look at.',
  ],
  'Systems & Ops': [
    'James Clear nailed it: you don\'t rise to your goals, you fall to your systems.',
    'Stop hiring more reps. Fix the process the existing reps are drowning in.',
    'The CEO dashboard most growth-stage owners refuse to build (and what it costs them).',
    'Your tech stack isn\'t the problem. The handoffs between tools are.',
  ],
  'AI / Practical': [
    'AI won\'t fix a broken process, it\'ll just speed up the bleed.',
    'The cheapest AI win in any business: dead-lead resurrection.',
    'Most "AI consultants" are just SaaS resellers in a hoodie. Here\'s the test.',
    'Ethan Mollick calls AI your co-pilot. In ops, it\'s the diagnostic engine.',
  ],
  'Sales & Pipeline': [
    'Stuck-deal triage: the 4 questions that move (or kill) a deal in one call.',
    '"Warm leads" go cold in 72 hours. The fix takes 20 minutes.',
    'Discovery calls are leaking deals. Here\'s the script that plugs it.',
    'Your CRM stages are lying about pipeline value. Here\'s how to prove it.',
  ],
  'Founder POV': [
    'Owner-operators: the 4 reports your finance lead should be running weekly.',
    'Why discounting is a symptom, not a strategy.',
    'When to fire your "rockstar", the operator\'s checklist.',
    'Stop measuring activity. Start measuring leaks.',
  ],
  'Industry-Specific': [
    'Specialty manufacturers: the trade-show lead-decay curve nobody tracks.',
    'Commercial services: why your dispatch system is your biggest revenue leak.',
    'Construction: the change-order leak that bleeds 4-7% of every project.',
    'Why Indianapolis mid-market operators get squeezed harder on margin than Chicago.',
  ],
};

const PREMADE_PROMPTS = [
  'Open with a hard stat. Use a numbered list of 3-5 leak points. End with one sharp question.',
  'Tell a 200-word case story (no names). One specific dollar figure. Mid-post, pivot to the lesson.',
  'Contrarian take. Disagree with conventional wisdom in line 1. Defend it with 3 reasons. Cite a real example.',
  'Tag one creator naturally as a pivot. Use their stance to extend, not echo.',
  'Carousel-ready. 5 numbered slides. Each slide is one sentence + one supporting line.',
  'Founder-to-founder voice. Blunt. No buzzwords. End with "What\'s leaking in yours?"',
];

const ALL_TOPICS = Object.values(PREMADE_TOPICS).flat();
const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function LinkedInPostStudio() {
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState<string>('auto');
  const [postType, setPostType] = useState<string>('auto');
  const [creator, setCreator] = useState<string>('auto');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [topicCategory, setTopicCategory] = useState<string>('All');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Respond-to-post (image upload OR pasted text) state
  const [respondSourceType, setRespondSourceType] = useState<'image' | 'text'>('image');
  const [respondImage, setRespondImage] = useState<string | null>(null);
  const [respondFileName, setRespondFileName] = useState<string>('');
  const [respondText, setRespondText] = useState<string>('');
  const [respondMode, setRespondMode] = useState<'brief' | 'full'>('brief');
  const [respondExtra, setRespondExtra] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);
  const [respondOutput, setRespondOutput] = useState('');
  const [respondCopied, setRespondCopied] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);


  // Response library state
  const [responseLibrary, setResponseLibrary] = useState<AdminLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [viewItem, setViewItem] = useState<AdminLibraryItem | null>(null);

  const loadResponseLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const items = await listAdminLibrary();
      setResponseLibrary(items.filter(i => i.tool_type === 'linkedin_response'));
    } catch (e) {
      // silent
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => { loadResponseLibrary(); }, [loadResponseLibrary]);

  const deleteLibraryItem = async (id: string) => {
    if (!confirm('Delete this saved response?')) return;
    try {
      await deleteFromAdminLibrary(id);
      setResponseLibrary(prev => prev.filter(i => i.id !== id));
      if (viewItem?.id === id) setViewItem(null);
      toast({ title: 'Deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const handleRespondFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Image too large (max 10 MB)', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRespondImage(reader.result as string);
      setRespondFileName(file.name);
      setRespondOutput('');
    };
    reader.readAsDataURL(file);
  };

  const generateResponse = async () => {
    const useImage = respondSourceType === 'image';
    if (useImage && !respondImage) {
      toast({ title: 'Upload a screenshot first', variant: 'destructive' });
      return;
    }
    if (!useImage && respondText.trim().length < 20) {
      toast({ title: 'Paste the post text first (at least 20 chars)', variant: 'destructive' });
      return;
    }
    setRespondLoading(true);
    setRespondOutput('');
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('linkedin-post-respond', {
        body: useImage
          ? { imageDataUrl: respondImage, mode: respondMode, extraContext: respondExtra.trim() }
          : { postText: respondText.trim(), mode: respondMode, extraContext: respondExtra.trim() },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = data.post || '';
      setRespondOutput(post);
      // Auto-save to response library
      if (post.trim()) {
        try {
          const firstLine = post.split('\n').map((s: string) => s.trim()).find(Boolean) || 'LinkedIn response';
          const saved = await saveToAdminLibrary({
            tool_type: 'linkedin_response',
            title: firstLine.slice(0, 90),
            input_data: {
              imageDataUrl: useImage ? respondImage : null,
              fileName: useImage ? respondFileName : null,
              postText: useImage ? null : respondText.trim(),
              sourceType: respondSourceType,
              mode: respondMode,
              extraContext: respondExtra.trim(),
            },
            output_data: { body: post, mode: respondMode },
          });
          setResponseLibrary(prev => [saved, ...prev]);
        } catch {
          // non-fatal
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Failed to generate response', description: msg, variant: 'destructive' });
    } finally {
      setRespondLoading(false);
    }
  };

  const createPostFromResponse = async (sourceCtx: string, draft: string) => {
    if (!draft.trim()) return;
    setCreatingPost(true);
    try {
      const adminToken = getAdminToken();
      const firstLine = draft.split(/[.!?]/).map(s => s.trim()).find(Boolean) || 'Standalone post';
      const { data, error } = await supabase.functions.invoke('linkedin-post-studio', {
        body: {
          topic: firstLine.slice(0, 180),
          pillar: '',
          postType: '',
          creator: 'none',
          extraPrompt: `Expand the following diagnostic take into a polished standalone LinkedIn POST for Joseph Toney's own page (200–260 words, ONE dense paragraph, first person, no compliments, no em dashes, no emojis, no questions as closers, mandatory numeric anchor, signature verdict shape). Do NOT reference the source post directly or use phrases like "in response to" or "your post". Make it stand alone as Joseph's original post.\n\nSOURCE CONTEXT THAT INSPIRED IT (do not quote): ${sourceCtx.slice(0, 1200)}\n\nJOSEPH'S DRAFT TAKE TO EXPAND/POLISH: ${draft}`,
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = (data.post || '').trim();
      if (!post) throw new Error('Empty post');
      setTopic(firstLine.slice(0, 180));
      setGenerated(post);
      toast({ title: 'Standalone post created', description: 'Scroll down to copy or schedule it.' });
      // scroll to bottom-ish
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create post';
      toast({ title: 'Could not create post', description: msg, variant: 'destructive' });
    } finally {
      setCreatingPost(false);
    }
  };


  const copyResponse = () => {
    navigator.clipboard.writeText(respondOutput);
    setRespondCopied(true);
    setTimeout(() => setRespondCopied(false), 1800);
    toast({ title: 'Copied to clipboard' });
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Add a topic first', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setGenerated('');
    setSavedId(null);
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('linkedin-post-studio', {
        body: {
          topic: topic.trim(),
          pillar: pillar === 'auto' ? '' : pillar,
          postType: postType === 'auto' ? '' : postType,
          creator,
          extraPrompt: extraPrompt.trim(),
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.post || '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      toast({ title: 'Failed to generate', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyPost = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast({ title: 'Copied to clipboard' });
  };

  const saveToCalendar = async () => {
    if (!generated.trim()) return;
    setSaving(true);
    try {
      const created_at = new Date(`${scheduleDate}T12:00:00`).toISOString();
      const firstLine = generated.split('\n').map(s => s.trim()).find(Boolean) || 'LinkedIn post';
      const title = firstLine.slice(0, 90);
      const saved = await saveToAdminLibrary({
        tool_type: 'linkedin_post',
        title,
        input_data: {
          topic,
          pillar: pillar === 'auto' ? null : pillar,
          postType: postType === 'auto' ? null : postType,
          creator,
          extraPrompt,
          scheduledFor: scheduleDate,
        },
        output_data: { body: generated, scheduledFor: scheduleDate },
        created_at,
      });
      setSavedId(saved.id);
      toast({
        title: 'Saved to calendar',
        description: new Date(`${scheduleDate}T12:00:00`).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const cycleTopic = () => {
    const pool = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || ALL_TOPICS);
    setTopic(rand(pool));
  };

  const cyclePrompt = () => setExtraPrompt(rand(PREMADE_PROMPTS));

  const visibleTopics = topicCategory === 'All' ? ALL_TOPICS : (PREMADE_TOPICS[topicCategory] || []);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-3xl font-bold mb-1">Post Studio</h2>
        <p className="text-muted-foreground text-sm">
          On-brand LinkedIn posts with creator tagging, hashtag strategy, and operator voice.
          Cycle through premade topics + prompts or write your own.
        </p>
      </div>

      {/* Respond to a LinkedIn post */}
      <Card className="p-5 glass border-amber/40 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareReply className="w-4 h-4 text-amber" />
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Respond to a LinkedIn Post</div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Upload a screenshot OR paste the post text. The forensic operator voice will read it and write your reply.
          Then turn that reply into a standalone post for your own page.
        </p>


        <div className="flex gap-1 p-1 bg-background/40 border border-border rounded-md w-fit">
          <button
            type="button"
            onClick={() => setRespondSourceType('image')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              respondSourceType === 'image' ? 'bg-amber text-background font-bold' : 'text-muted-foreground hover:text-amber'
            }`}
          >
            <ImageIcon className="w-3 h-3" /> Screenshot
          </button>
          <button
            type="button"
            onClick={() => setRespondSourceType('text')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              respondSourceType === 'text' ? 'bg-amber text-background font-bold' : 'text-muted-foreground hover:text-amber'
            }`}
          >
            <FileText className="w-3 h-3" /> Paste text
          </button>
        </div>

        {respondSourceType === 'image' ? (
          !respondImage ? (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/60 hover:border-amber/60 rounded-lg p-6 cursor-pointer transition bg-background/30">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">Upload screenshot</div>
              <div className="text-[11px] text-muted-foreground">PNG, JPG, or WEBP (max 10 MB)</div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleRespondFile(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="relative rounded-lg border border-border bg-background/40 p-3">
              <button
                type="button"
                onClick={() => { setRespondImage(null); setRespondFileName(''); setRespondOutput(''); }}
                className="absolute top-2 right-2 bg-background/80 border border-border rounded-full p-1 hover:bg-background"
                aria-label="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <img src={respondImage} alt="Uploaded LinkedIn post" className="max-h-72 mx-auto rounded" />
              <div className="text-[11px] text-muted-foreground mt-2 text-center truncate">{respondFileName}</div>
            </div>
          )
        ) : (
          <Textarea
            rows={8}
            placeholder="Paste the full LinkedIn post text here. Include author claim and any examples they used."
            value={respondText}
            onChange={(e) => setRespondText(e.target.value)}
            className="text-sm"
          />
        )}


        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Response Format</div>
            <Select value={respondMode} onValueChange={(v) => setRespondMode(v as 'brief' | 'full')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Comment Reply (60-110 words)</SelectItem>
                <SelectItem value="full">Standalone Repost (120-180 words)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Extra Direction (optional)</div>
            <Input
              placeholder="e.g. Disagree with their framing. Lead with a stat."
              value={respondExtra}
              onChange={(e) => setRespondExtra(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={generateResponse}
          disabled={respondLoading || (respondSourceType === 'image' ? !respondImage : respondText.trim().length < 20)}
          className="w-full bg-amber text-background hover:bg-amber/90"
        >
          {respondLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquareReply className="w-4 h-4 mr-2" />}
          {respondLoading ? 'Reading post & drafting response…' : 'Respond to this post'}
        </Button>


        {(respondLoading || respondOutput) && (
          <div className="rounded-lg border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Forensic Response</div>
              {respondOutput && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={generateResponse} disabled={respondLoading} className="h-7 text-[10px]">
                    <RefreshCw className="w-3 h-3 mr-1" /> Redo
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyResponse} className="h-7 text-[10px]">
                    {respondCopied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                  </Button>
                </div>
              )}
            </div>
            {respondLoading ? (
              <div className="space-y-2">
                {[90, 75, 85, 60].map((w, i) => (
                  <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <>
                <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{respondOutput}</div>
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[10px] text-muted-foreground">
                    Turn this reply into a full post for your own page.
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createPostFromResponse(
                      respondSourceType === 'text' ? respondText.trim() : `[screenshot uploaded: ${respondFileName || 'LinkedIn post'}]`,
                      respondOutput,
                    )}
                    disabled={creatingPost}
                    className="h-7 text-[10px] bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
                  >
                    {creatingPost ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand className="w-3 h-3 mr-1" />}
                    {creatingPost ? 'Creating post…' : 'Create standalone post'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}


        {/* Response Library */}
        <div className="pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={() => setLibraryOpen(o => !o)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-amber" />
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">
                Response Library
              </div>
              <span className="text-[10px] text-muted-foreground">({responseLibrary.length})</span>
            </div>
            <span className="text-[10px] text-muted-foreground group-hover:text-amber">
              {libraryOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          {libraryOpen && (
            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto pr-1">
              {libraryLoading ? (
                <div className="text-[11px] text-muted-foreground">Loading…</div>
              ) : responseLibrary.length === 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  No saved responses yet. Generate one above and it will be saved here automatically.
                </div>
              ) : (
                responseLibrary.map((item) => {
                  const img = (item.input_data as any)?.imageDataUrl as string | undefined;
                  const body = (item.output_data as any)?.body as string | undefined;
                  const mode = (item.output_data as any)?.mode as string | undefined;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 p-2 rounded-md border border-border bg-background/40 hover:border-amber/40 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setViewItem(item)}
                        className="flex-shrink-0"
                        aria-label="View"
                      >
                        {img ? (
                          <img src={img} alt="Post" className="w-16 h-16 object-cover rounded border border-border" />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}

                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewItem(item)}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-amber/80">
                            {mode === 'full' ? 'Repost' : 'Reply'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/90 line-clamp-2">{body}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => { navigator.clipboard.writeText(body || ''); toast({ title: 'Copied' }); }}
                          title="Copy"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deleteLibraryItem(item.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Card>

      {viewItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewItem(null)}>
          <div className="bg-background rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-border" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setViewItem(null)}>
              <X className="w-5 h-5" />
            </Button>
            <div className="text-[10px] uppercase tracking-widest text-amber mb-2">
              {(viewItem.output_data as any)?.mode === 'full' ? 'Standalone Repost' : 'Comment Reply'} · {new Date(viewItem.created_at).toLocaleString()}
            </div>
            {(viewItem.input_data as any)?.imageDataUrl && (
              <img
                src={(viewItem.input_data as any).imageDataUrl}
                alt="Original post"
                className="max-h-72 mx-auto rounded border border-border mb-4"
              />
            )}
            {(viewItem.input_data as any)?.postText && (
              <div className="text-[11px] text-foreground/70 bg-background/40 border border-border rounded p-3 mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Source post</div>
                {(viewItem.input_data as any).postText}
              </div>
            )}
            {(viewItem.input_data as any)?.extraContext && (
              <div className="text-[11px] text-muted-foreground mb-3">
                <span className="font-semibold text-foreground/80">Direction: </span>
                {(viewItem.input_data as any).extraContext}
              </div>
            )}
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed border-t border-border pt-4">
              {(viewItem.output_data as any)?.body}
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                size="sm"
                onClick={() => {
                  const src = (viewItem.input_data as any)?.postText
                    || `[screenshot: ${(viewItem.input_data as any)?.fileName || 'LinkedIn post'}]`;
                  const draft = (viewItem.output_data as any)?.body || '';
                  setViewItem(null);
                  createPostFromResponse(src, draft);
                }}
                disabled={creatingPost}
                className="bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
              >
                {creatingPost ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand className="w-3 h-3 mr-1" />}
                Create standalone post
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText((viewItem.output_data as any)?.body || ''); toast({ title: 'Copied' }); }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteLibraryItem(viewItem.id)}
              >
                <Trash2 className="w-3 h-3 mr-1 text-red-400" /> Delete
              </Button>
            </div>

          </div>
        </div>
      )}

      <Card className="p-5 glass border-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">01, Topic</div>
            <button onClick={cycleTopic} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Cycle
            </button>
          </div>
          <Textarea
            rows={3}
            placeholder="What's the post about? Specific is better."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Premade topics, click to use</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {['All', ...Object.keys(PREMADE_TOPICS)].map((cat) => {
                const on = topicCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTopicCategory(cat)}
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition ${
                      on ? 'bg-amber text-background border-amber font-bold' : 'bg-background/40 border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                    }`}
                  >{cat}</button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 border border-border/40 rounded-md bg-background/30">
              {visibleTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                    topic === t
                      ? 'bg-amber/15 border-amber text-amber'
                      : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">02, Parameters</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Content Pillar</div>
            <Select value={pillar} onValueChange={setPillar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {PILLARS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Post Format</div>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-select</SelectItem>
                {POST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extra Direction (optional)</div>
            <button onClick={cyclePrompt} className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider flex items-center gap-1">
              <Wand2 className="w-3 h-3" /> Cycle prompt
            </button>
          </div>
          <Input
            placeholder="e.g. Open with a stat. Mid-post pivot. End with a sharp question."
            value={extraPrompt}
            onChange={(e) => setExtraPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PREMADE_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setExtraPrompt(p)}
                className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                  extraPrompt === p
                    ? 'bg-amber/15 border-amber text-amber'
                    : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                }`}
              >{p}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 glass border-border space-y-3">
        <div className="text-[10px] uppercase tracking-widest font-bold text-amber">03, Creator Tag</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {[
            { key: 'auto', name: 'Auto-Select', niche: 'AI picks best fit' },
            { key: 'none', name: 'No Creator', niche: 'Skip tagging' },
            ...CREATORS.map((c) => ({ key: c.name, name: c.name, niche: c.niche, handle: c.handle })),
          ].map((c) => {
            const on = creator === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCreator(c.key)}
                className={`text-left p-2 rounded-md border transition ${
                  on ? 'bg-amber/10 border-amber' : 'bg-background/40 border-border hover:border-amber/50'
                }`}
              >
                <div className={`text-xs font-bold ${on ? 'text-amber' : 'text-foreground'}`}>{c.name}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{c.niche}</div>
                {'handle' in c && c.handle && <div className="text-[10px] text-amber/70 mt-0.5">{c.handle}</div>}
              </button>
            );
          })}
        </div>
      </Card>

      <Button
        onClick={generate}
        disabled={loading || !topic.trim()}
        className="w-full bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {loading ? 'Generating Post…' : 'Generate LinkedIn Post'}
      </Button>

      {(loading || generated) && (
        <Card className="p-5 glass border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Generated Post</div>
            {generated && (
              <Button variant="outline" size="sm" onClick={copyPost} className="h-7 text-[10px]">
                {copied ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
              </Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[100, 80, 90, 60, 75].map((w, i) => (
                <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{generated}</div>
          )}

          {generated && !loading && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber flex items-center gap-1.5">
                <CalendarPlus className="w-3 h-3" /> Save & schedule on calendar
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick the date this post should land on. It will appear in the Content Calendar and can be moved later.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => { setScheduleDate(e.target.value); setSavedId(null); }}
                  className="w-auto h-9 text-xs"
                />
                <Button
                  size="sm"
                  onClick={saveToCalendar}
                  disabled={saving || !scheduleDate}
                  className="bg-amber text-background hover:bg-amber/90"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1" />}
                  {saving ? 'Saving…' : savedId ? 'Saved, save again' : 'Save to calendar'}
                </Button>
                {savedId && (
                  <span className="text-[11px] text-amber flex items-center gap-1">
                    <Check className="w-3 h-3" /> On {new Date(`${scheduleDate}T12:00:00`).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
