import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Sparkles, Mic, Film, Upload, X, Download, Play, RefreshCw, Save, Trash2, Library } from 'lucide-react';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { listAdminLibrary, deleteFromAdminLibrary, type AdminLibraryItem } from '@/lib/adminLibrary';

// Auto-pull every image bundled in src/assets
const ASSET_GLOB = import.meta.glob('/src/assets/**/*.{jpg,jpeg,png,webp,JPG,PNG}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

type AssetImage = { id: string; url: string; label: string; source: 'site' | 'upload' };
type SceneImageStyle = 'case_file' | 'autopsy_diagram' | 'blueprint' | 'editorial_cartoon' | 'data_macro' | 'noir_object' | 'isometric' | 'free';
type Scene = { imageId: string; caption: string; voiceover: string; durationMs: number; imagePrompt?: string; imageStyle?: SceneImageStyle };
type Plan = { title: string; scenes: Scene[] };
type Voice = { voice_id: string; name: string; category?: string; preview_url?: string };

const SCENE_STYLE_OPTIONS: { key: SceneImageStyle; label: string; desc: string }[] = [
  { key: 'case_file',         label: 'Case File',         desc: 'Manila folder · redaction · crimson' },
  { key: 'autopsy_diagram',   label: 'Autopsy Diagram',   desc: 'Anatomical chart of a broken process' },
  { key: 'blueprint',         label: 'Blueprint',         desc: 'CRM / pipeline schematic' },
  { key: 'editorial_cartoon', label: 'Editorial Cartoon', desc: 'Op-ed ink illustration · amber' },
  { key: 'data_macro',        label: 'Data Macro',        desc: 'CRT terminal close-up · scan lines' },
  { key: 'noir_object',       label: 'Noir Object',       desc: 'Single object · hard amber light' },
  { key: 'isometric',         label: 'Isometric',         desc: 'Clean vector · negative space' },
  { key: 'free',              label: 'Free Prompt',       desc: 'No brand overlay — anything goes' },
];

const ASPECTS: { key: string; w: number; h: number; label: string }[] = [
  { key: '9:16', w: 1080, h: 1920, label: '9:16 (Reels/Shorts/TikTok)' },
  { key: '1:1',  w: 1080, h: 1080, label: '1:1 (Feed)' },
  { key: '16:9', w: 1920, h: 1080, label: '16:9 (LinkedIn/YouTube)' },
];

// ===== Premade ideation: titles, topics, prompt recipes =====
const PREMADE_TITLES: string[] = [
  'Your Business Is Leaking — You Just Can\'t See It',
  'The $200k Leak Hiding in Your CRM',
  'Why Your "Best Rep" Is Your Biggest Leak',
  '7 Steps of The Leak Audit™',
  'Stop Hiring Reps. Fix the Process They\'re Drowning In.',
  'AI Won\'t Save a Broken Process — It Speeds the Bleed',
  'The Forensic Diagnostic: $2,500 to Find the Bleed',
  'Trade-Show Leads Decay in 72 Hours. Here\'s the Fix.',
  'Quote-to-Cash Leakage: The Silent 8-12% Margin Killer',
  'The Follow-Up Gap Costing Commercial Services $40k/Month',
  'Change-Order Leak: 4-7% of Every Construction Project',
  'Your Tech Stack Isn\'t the Problem. The Handoffs Are.',
];

const PREMADE_TOPICS: Record<string, string[]> = {
  'Revenue Leaks': [
    'Manufacturers losing 30%+ of trade-show leads to bad follow-up.',
    'The dead-lead pile worth $200k that nobody resurrects.',
    'Quote-to-cash leakage between sales and ops.',
    'Stalled deals nobody triages — the silent revenue killer.',
  ],
  'Systems & Ops': [
    'CEO dashboards growth-stage owners refuse to build.',
    'Handoff failures between CRM, quoting, and dispatch.',
    'Why "more reps" is the wrong fix.',
    'Process documentation that actually gets followed.',
  ],
  'AI / Practical': [
    'Dead-lead resurrection with AI — the cheapest win.',
    'AI-assisted CRM hygiene for $5M-$50M operators.',
    'Why most AI consultants are SaaS resellers in a hoodie.',
    'Forensic diagnostics powered by your own data.',
  ],
  'Sales & Pipeline': [
    'Stuck-deal triage — 4 questions that move or kill a deal.',
    'Discovery calls leak deals — here\'s the script that plugs it.',
    'CRM stages lying about pipeline value.',
    'The 72-hour warm-lead decay curve.',
  ],
  'Founder POV': [
    'Owner-operators: the 4 weekly reports finance should run.',
    'Discounting is a symptom, not a strategy.',
    'When to fire your "rockstar" — operator\'s checklist.',
    'Stop measuring activity. Start measuring leaks.',
  ],
  'Industry-Specific': [
    'Specialty manufacturers and the trade-show decay curve.',
    'Commercial services: dispatch as a revenue leak.',
    'Construction change-order leakage.',
    'Indianapolis mid-market margin squeeze.',
  ],
};

const PREMADE_PROMPTS: { label: string; text: string }[] = [
  { label: 'Hook + Stat + CTA', text: 'Open with a hard hook in scene 1. Cite one specific dollar figure. End with a CTA to the free Leak Audit at /leak-audit.' },
  { label: 'Story-driven (no names)', text: 'Tell a 30-second case story (no names). Mid-video pivot to the lesson. Close with the Forensic Diagnostic offer ($2,500, applied toward engagement).' },
  { label: 'Contrarian take', text: 'Disagree with a piece of conventional wisdom in scene 1. Defend it with 3 sharp scenes. Close with one blunt question.' },
  { label: 'Numbered list (3-5)', text: 'Structure as a numbered list of 3-5 leak points. One sentence per scene. Close with "Which one is bleeding you right now?"' },
  { label: 'Founder-to-founder', text: 'Founder-to-founder voice. Blunt. No buzzwords. Cite real numbers. End with "What\'s leaking in yours?"' },
  { label: 'Demo / walkthrough', text: 'Walk through one specific leak with on-screen captions naming the metric. Close with the Forensic Diagnostic.' },
];

const ALL_TOPICS_FLAT = Object.values(PREMADE_TOPICS).flat();
const pickRand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function adminInvoke(action: string, body: Record<string, unknown> = {}) {
  const token = getAdminToken();
  return supabase.functions.invoke('creation-studio', {
    body: { action, ...body },
    headers: token ? { 'x-admin-token': token } : {},
  });
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function base64ToBlob(b64: string, mime: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function pickRecorderMime(): string {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const m of candidates) if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  return 'video/webm';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export const AdminCreationStudio: React.FC = () => {
  const { toast } = useToast();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string>('');
  const [loadingVoices, setLoadingVoices] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<typeof ASPECTS[number]['key']>('9:16');
  const [durationSec, setDurationSec] = useState(30);

  // Premade ideation state
  const [pickedTitle, setPickedTitle] = useState<string>('');
  const [pickedTopics, setPickedTopics] = useState<string[]>([]);
  const [pickedRecipe, setPickedRecipe] = useState<string>('');
  const [topicCategory, setTopicCategory] = useState<string>('All');

  const composePrompt = (overrides?: { title?: string; topics?: string[]; recipe?: string }) => {
    const t = overrides?.title ?? pickedTitle;
    const topics = overrides?.topics ?? pickedTopics;
    const recipe = overrides?.recipe ?? pickedRecipe;
    const parts: string[] = [];
    if (t) parts.push(`TITLE: ${t}`);
    if (topics.length) parts.push(`TOPICS:\n- ${topics.join('\n- ')}`);
    if (recipe) parts.push(`STRUCTURE: ${recipe}`);
    return parts.join('\n\n');
  };

  const applyComposed = (overrides?: { title?: string; topics?: string[]; recipe?: string }) => {
    const composed = composePrompt(overrides);
    if (composed) setPrompt(composed);
  };

  const toggleTopic = (t: string) => {
    setPickedTopics((prev) => {
      const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
      applyComposed({ topics: next });
      return next;
    });
  };

  const cycleAll = () => {
    const title = pickRand(PREMADE_TITLES);
    const pool = topicCategory === 'All' ? ALL_TOPICS_FLAT : (PREMADE_TOPICS[topicCategory] || ALL_TOPICS_FLAT);
    const t1 = pickRand(pool);
    let t2 = pickRand(pool);
    if (t2 === t1) t2 = pickRand(pool);
    const topics = [t1, t2];
    const recipe = pickRand(PREMADE_PROMPTS).text;
    setPickedTitle(title);
    setPickedTopics(topics);
    setPickedRecipe(recipe);
    applyComposed({ title, topics, recipe });
  };

  const [uploads, setUploads] = useState<AssetImage[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoExt, setVideoExt] = useState<'mp4' | 'webm'>('webm');
  const [generatingSceneIdx, setGeneratingSceneIdx] = useState<number | null>(null);

  // ===== Video library (auto-saved past renders) =====
  const [videoLibrary, setVideoLibrary] = useState<AdminLibraryItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libDeletingId, setLibDeletingId] = useState<string | null>(null);
  const loadVideoLibrary = async () => {
    setLibLoading(true);
    try {
      const items = await listAdminLibrary();
      setVideoLibrary(items.filter(i => i.tool_type === 'video'));
    } catch (e) {
      console.error('[CreationStudio] load library failed', e);
    } finally { setLibLoading(false); }
  };
  useEffect(() => { loadVideoLibrary(); }, []);
  const deleteLibraryVideo = async (id: string) => {
    if (!window.confirm('Delete this video from your library? This cannot be undone.')) return;
    setLibDeletingId(id);
    const prev = videoLibrary;
    setVideoLibrary(p => p.filter(v => v.id !== id));
    try { await deleteFromAdminLibrary(id); toast({ title: 'Removed from library' }); }
    catch (e) { setVideoLibrary(prev); toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' }); }
    finally { setLibDeletingId(null); }
  };

  // ===== Image library (every generated/uploaded image — admin + reps) =====
  type ImageLibItem = {
    id: string;
    prompt: string;
    url: string;
    storage_path?: string | null;
    source: string;
    model?: string | null;
    created_at: string;
    source_table: 'admin_image_studio' | 'rep_image_studio';
    owner_label: string;
  };
  const [imageLibrary, setImageLibrary] = useState<ImageLibItem[]>([]);
  const [imgLibLoading, setImgLibLoading] = useState(false);
  const [imgDeletingId, setImgDeletingId] = useState<string | null>(null);

  const loadImageLibrary = async () => {
    setImgLibLoading(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('admin-image-studio', {
        body: { action: 'list_all' },
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImageLibrary(data.images || []);
    } catch (e) {
      console.error('[CreationStudio] load image library failed', e);
    } finally { setImgLibLoading(false); }
  };
  useEffect(() => { loadImageLibrary(); }, []);

  const addLibraryImageToScenes = (img: ImageLibItem) => {
    const id = `lib:${img.id}`;
    if (uploads.find(u => u.id === id)) {
      toast({ title: 'Already added' });
      return;
    }
    setUploads(prev => [...prev, { id, url: img.url, label: img.prompt?.slice(0, 60) || img.owner_label, source: 'upload' }]);
    toast({ title: 'Added to this video', description: 'Now selectable as a scene image.' });
  };

  const deleteLibraryImage = async (img: ImageLibItem) => {
    if (!window.confirm('Delete this image from the shared library? This cannot be undone.')) return;
    setImgDeletingId(img.id);
    const prev = imageLibrary;
    setImageLibrary(p => p.filter(i => i.id !== img.id));
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('admin-image-studio', {
        body: { action: 'delete_any', id: img.id, source_table: img.source_table },
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Image deleted' });
    } catch (e) {
      setImageLibrary(prev);
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setImgDeletingId(null); }
  };

  const generateSceneImage = async (sceneIdx: number) => {
    if (!plan) return;
    const scene = plan.scenes[sceneIdx];
    const fallback = [scene.caption, scene.voiceover].filter(Boolean).join(' — ').trim();
    const promptText = (scene.imagePrompt?.trim() || fallback);
    const style = scene.imageStyle || 'case_file';
    if (!promptText) {
      toast({ title: 'Add an image prompt, caption, or voiceover first', variant: 'destructive' });
      return;
    }
    setGeneratingSceneIdx(sceneIdx);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('generate-content-image', {
        body: { prompt: promptText, style },
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data.image_url as string;
      const id = `gen-${Date.now()}-${sceneIdx}`;
      const newImg: AssetImage = { id, url, label: `Scene ${sceneIdx + 1}: ${scene.caption || 'Generated'}`, source: 'upload' };
      setUploads(prev => [...prev, newImg]);
      const next = { ...plan, scenes: plan.scenes.map((s, i) => i === sceneIdx ? { ...s, imageId: id } : s) };
      setPlan(next);
      toast({ title: `Scene ${sceneIdx + 1} image generated` });
      loadImageLibrary();
    } catch (e) {
      toast({ title: 'Image generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setGeneratingSceneIdx(null);
    }
  };

  // ===== Background music =====
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.18);
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const musicBufferRef = useRef<ArrayBuffer | null>(null);

  const MUSIC_PRESETS: { label: string; text: string }[] = [
    { label: 'Forensic tension',     text: 'Slow cinematic forensic underscore. Low cello drone, sparse dark piano, subtle ticking clock, building tension. Investigative thriller. No vocals. Loopable.' },
    { label: 'Operator hustle',      text: 'Confident mid-tempo lo-fi hip-hop instrumental. Warm bass, dusty drums, muted Rhodes. Focused, blunt, founder-energy. No vocals.' },
    { label: 'Boardroom power',      text: 'Modern corporate cinematic with bold brass stabs and driving percussion. High-stakes, decisive. No vocals.' },
    { label: 'Late-night noir',      text: 'Dark synthwave noir. Analog pads, gated reverb snare, slow arpeggio. Late-night detective mood. No vocals.' },
    { label: 'Documentary slow',     text: 'Sparse acoustic documentary score. Felt piano, soft strings, contemplative. Reflective, serious. No vocals.' },
    { label: 'Trailer drop',         text: 'Cinematic trailer cue: low rumble, riser, single hard hit at 8s, then sustained tension. No vocals.' },
    { label: 'Heist clock',          text: 'Pulsing electronic heist score. Tight kick, ticking hi-hats, plucked synth ostinato, rising bass arp. Tense countdown energy. No vocals. Loopable.' },
    { label: 'Investigation lo-fi',  text: 'Detective lo-fi underscore. Brushed drums, upright bass, muted trumpet stabs, vinyl crackle. Smoky after-hours mood. No vocals.' },
    { label: 'Crime scene ambient',  text: 'Dark cinematic ambient. Sub drones, distant evidence-bag rustle, single piano notes, faint police radio static. Eerie, forensic. No vocals.' },
    { label: 'Money on the line',    text: 'High-stakes finance trailer. Driving 16th-note strings, anvil hits, brass swells, war-room urgency. No vocals.' },
    { label: 'Slow burn build',      text: 'Eight-bar slow-burn build. Sparse start with cello and piano, layering strings and percussion until a single decisive snare hit. Dramatic. No vocals.' },
    { label: 'Founder grind',        text: 'Energetic deep-focus instrumental. Driving four-on-the-floor kick, warm analog bass, motivational synth lead. Builder energy. No vocals.' },
    { label: 'Closer confidence',    text: 'Smooth confident neo-soul instrumental. Wurlitzer chords, finger-snap groove, smoky sax pads. Closer-walking-into-the-room energy. No vocals.' },
    { label: 'Whistleblower',        text: 'Sparse documentary thriller score. Lone whistled motif, soft piano, low pulsing bass, subtle tape hiss. Investigative, ominous. No vocals.' },
    { label: 'Boardroom power 2.0',  text: 'Modern corporate cinematic with hybrid orchestra. Tight strings, taiko hits, brass risers, decisive resolution. No vocals.' },
    { label: 'Underground hustle',   text: 'Dark trap-influenced instrumental. 808 sub, crisp hi-hat rolls, minor-key piano, gritty atmosphere. Operator-on-the-move energy. No vocals.' },
    { label: 'Cinematic newsroom',   text: 'Driving newsroom score. Sequenced piano, marcato strings, light percussion, urgent forward motion. Investigative journalism vibe. No vocals.' },
    { label: 'Dossier reveal',       text: 'Slow reveal cue. Reversed cymbal swells, low piano, evolving pad, single sub drop at the end. Mystery uncovered. No vocals.' },
    { label: 'Quiet authority',      text: 'Minimal piano-led score. Felt piano, sustained strings, soft clock tick, restrained tension. Calm-but-serious operator tone. No vocals. Loopable.' },
    { label: 'Pipeline pressure',    text: 'Mid-tempo electronic underscore. Pulsing arpeggio, punchy snare, bass groove, building synth stack. Sales-pipeline pressure mood. No vocals.' },
    { label: 'Forensic minimal',     text: 'Ultra-minimal soundscape. Single sustained drone, occasional metallic clink, distant breath. Stark, clinical, evidence-locker feel. No vocals. Loopable.' },
    { label: 'Hopeful resolve',      text: 'Warm cinematic resolve. Major-key piano, lifting strings, soft acoustic guitar, gentle percussion. After-the-leak-is-fixed mood. No vocals.' },
    { label: 'Hard truth (no music)', text: 'Almost no music. Faint room tone, single low piano note every 8 seconds, subtle paper rustle. Lets the voiceover hit hard. No vocals.' },
  ];

  const generateMusic = async () => {
    const p = musicPrompt.trim() || MUSIC_PRESETS[0].text;
    if (!p) return;
    setMusicGenerating(true);
    try {
      // Estimate duration from plan or fallback to durationSec
      const planSec = plan ? plan.scenes.reduce((a, s) => a + s.durationMs / 1000, 0) : durationSec;
      const ms = Math.max(10000, Math.min(180000, Math.round(planSec * 1000) + 2000));
      const { data, error } = await adminInvoke('generate_music', { prompt: p, durationMs: ms });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const blob = base64ToBlob(data.audioBase64, data.mime || 'audio/mpeg');
      musicBufferRef.current = await blob.arrayBuffer();
      setMusicUrl(URL.createObjectURL(blob));
      toast({ title: 'Music ready', description: `${(blob.size / 1024 / 1024).toFixed(1)} MB · will mix into next render` });
    } catch (e) {
      toast({ title: 'Music generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setMusicGenerating(false);
    }
  };

  const clearMusic = () => {
    musicBufferRef.current = null;
    setMusicUrl('');
  };


  const fileInputRef = useRef<HTMLInputElement>(null);

  // Site library
  const siteLibrary: AssetImage[] = useMemo(() => {
    return Object.entries(ASSET_GLOB).map(([path, url]) => {
      const name = path.split('/').pop() || path;
      return {
        id: `site:${name}`,
        url,
        label: name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        source: 'site' as const,
      };
    });
  }, []);

  useEffect(() => {
    // Default-select the first 8 site images so the AI has options
    setSelectedSiteIds(new Set(siteLibrary.slice(0, 8).map(s => s.id)));
  }, [siteLibrary]);

  const allAvailable = useMemo<AssetImage[]>(() => {
    const sel = siteLibrary.filter(s => selectedSiteIds.has(s.id));
    return [...sel, ...uploads];
  }, [siteLibrary, selectedSiteIds, uploads]);

  const fetchVoices = async () => {
    setLoadingVoices(true);
    try {
      const { data, error } = await adminInvoke('list_voices');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVoices(data.voices || []);
      if (data.voices?.[0] && !voiceId) setVoiceId(data.voices[0].voice_id);
    } catch (e) {
      toast({ title: 'Could not load voices', description: (e as Error).message, variant: 'destructive' });
    } finally { setLoadingVoices(false); }
  };

  useEffect(() => { fetchVoices(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const next: AssetImage[] = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      next.push({ id: `up:${Date.now()}-${f.name}`, url, label: f.name, source: 'upload' });
    }
    setUploads(prev => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generatePlan = async (): Promise<Plan | null> => {
    setLastError('');
    if (!prompt.trim()) {
      const m = 'Add a prompt first';
      setLastError(m);
      toast({ title: m, variant: 'destructive' });
      return null;
    }
    if (allAvailable.length === 0) {
      const m = 'Pick or upload at least one image';
      setLastError(m);
      toast({ title: m, variant: 'destructive' });
      return null;
    }
    setPlanning(true); setPlan(null); setVideoUrl(''); setStep('Asking AI for scene plan…');
    try {
      console.log('[CreationStudio] plan_video request', { prompt, durationSec, aspect, imageCount: allAvailable.length });
      const { data, error } = await adminInvoke('plan_video', {
        prompt,
        durationSec,
        aspect,
        images: allAvailable.map(i => ({ id: i.id, label: i.label })),
      });
      console.log('[CreationStudio] plan_video response', { data, error });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.plan) throw new Error('Empty response from server');
      setPlan(data.plan);
      setStep('Plan ready — review or render.');
      return data.plan as Plan;
    } catch (e) {
      const msg = (e as Error).message || 'Plan failed';
      console.error('[CreationStudio] plan failed', e);
      setLastError(msg);
      setStep('');
      toast({ title: 'Plan failed', description: msg, variant: 'destructive' });
      return null;
    } finally { setPlanning(false); }
  };

  const renderVideo = async (overridePlan?: Plan) => {
    const activePlan = overridePlan || plan;
    if (!activePlan) return;
    if (!voiceId) {
      const m = 'Pick a voice first (Reload voices if empty)';
      setLastError(m);
      toast({ title: m, variant: 'destructive' });
      return;
    }
    setLastError('');
    setRendering(true); setProgress(0); setVideoUrl('');
    setStep('Generating voiceover…');

    try {
      // 1) Get TTS for each scene (sequential to avoid rate limits)
      const audios: HTMLAudioElement[] = [];
      const audioBuffers: ArrayBuffer[] = [];
      for (let i = 0; i < activePlan.scenes.length; i++) {
        const s = activePlan.scenes[i];
        const { data, error } = await adminInvoke('tts', { text: s.voiceover, voiceId });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const blob = base64ToBlob(data.audioBase64, data.mime || 'audio/mpeg');
        const buf = await blob.arrayBuffer();
        audioBuffers.push(buf);
        const audio = new Audio(URL.createObjectURL(blob));
        audio.preload = 'auto';
        await new Promise<void>((res) => { audio.onloadedmetadata = () => res(); audio.onerror = () => res(); });
        // Override scene duration to actual VO length + small pad, but keep a min
        const dur = isFinite(audio.duration) ? Math.max(2.2, audio.duration + 0.3) : (s.durationMs / 1000);
        s.durationMs = Math.round(dur * 1000);
        audios.push(audio);
        setProgress(Math.round(((i + 1) / activePlan.scenes.length) * 30));
      }

      // 2) Setup canvas
      const aspectDef = ASPECTS.find(a => a.key === aspect)!;
      const canvas = document.createElement('canvas');
      canvas.width = aspectDef.w; canvas.height = aspectDef.h;
      const ctx = canvas.getContext('2d')!;

      // 3) Preload images
      const sceneImgs: HTMLImageElement[] = [];
      for (const s of activePlan.scenes) {
        const a = allAvailable.find(x => x.id === s.imageId)!;
        sceneImgs.push(await loadImage(a.url));
      }

      // 4) Build combined audio MediaStream via WebAudio
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AC();
      const dest = audioCtx.createMediaStreamDestination();
      const decoded: AudioBuffer[] = [];
      for (const buf of audioBuffers) {
        decoded.push(await audioCtx.decodeAudioData(buf.slice(0)));
      }

      // 5) Combine streams + recorder
      const videoStream = (canvas as any).captureStream(30) as MediaStream;
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
      const mime = pickRecorderMime();
      const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise<void>((r) => { recorder.onstop = () => r(); });
      recorder.start(250);

      // 6) Schedule audio sources at offsets
      let acc = 0;
      const startTime = audioCtx.currentTime + 0.15;
      const offsets: number[] = [];
      for (let i = 0; i < decoded.length; i++) {
        offsets.push(acc);
        const src = audioCtx.createBufferSource();
        src.buffer = decoded[i];
        src.connect(dest);
        src.start(startTime + acc);
        acc += activePlan.scenes[i].durationMs / 1000;
      }
      const totalSec = acc;

      // 6b) Mix background music if present (ducked + faded)
      if (musicBufferRef.current) {
        try {
          const musicBuf = await audioCtx.decodeAudioData(musicBufferRef.current.slice(0));
          const musicSrc = audioCtx.createBufferSource();
          musicSrc.buffer = musicBuf;
          musicSrc.loop = musicBuf.duration < totalSec;
          const gain = audioCtx.createGain();
          const v = Math.max(0, Math.min(1, musicVolume));
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(v, startTime + 0.8);
          gain.gain.setValueAtTime(v, startTime + totalSec - 1.2);
          gain.gain.linearRampToValueAtTime(0, startTime + totalSec);
          musicSrc.connect(gain).connect(dest);
          musicSrc.start(startTime);
          musicSrc.stop(startTime + totalSec + 0.1);
        } catch (musicErr) {
          console.warn('[CreationStudio] music mix failed', musicErr);
        }
      }

      // 7) Animate canvas. Ken-Burns on each scene + caption.
      const animStart = performance.now();
      let scenePtr = 0;

      const drawScene = (sceneIdx: number, localT: number, sceneDur: number) => {
        const img = sceneImgs[sceneIdx];
        const s = activePlan.scenes[sceneIdx];
        const cw = canvas.width, ch = canvas.height;

        // Cover-fit + zoom
        const t = Math.min(1, localT / sceneDur);
        const zoom = 1.05 + 0.12 * t; // ken-burns
        const panX = (sceneIdx % 2 === 0 ? -1 : 1) * 0.04 * t * cw;
        const ir = img.width / img.height;
        const cr = cw / ch;
        let dw, dh;
        if (ir > cr) { dh = ch * zoom; dw = dh * ir; } else { dw = cw * zoom; dh = dw / ir; }
        const dx = (cw - dw) / 2 + panX;
        const dy = (ch - dh) / 2;

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);

        // Bottom gradient for caption legibility
        const grad = ctx.createLinearGradient(0, ch * 0.55, 0, ch);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, ch * 0.55, cw, ch * 0.45);

        // Caption
        const fontSize = Math.round(cw * 0.058);
        ctx.font = `900 ${fontSize}px "Space Grotesk", "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        const lines = wrapText(ctx, s.caption.toUpperCase(), cw * 0.86);
        const lineH = fontSize * 1.15;
        const startY = ch - lineH * lines.length - cw * 0.06;
        lines.forEach((ln, idx) => ctx.fillText(ln, cw / 2, startY + idx * lineH));
        ctx.shadowBlur = 0;

        // Aetheris watermark
        ctx.font = `600 ${Math.round(cw * 0.018)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fillText('AETHERIS AI STUDIO', cw - cw * 0.03, ch - cw * 0.018);
      };

      const tick = () => {
        const elapsed = (performance.now() - animStart) / 1000;
        // find scene
        let cum = 0; let idx = 0; let local = 0;
        for (let i = 0; i < activePlan.scenes.length; i++) {
          const d = activePlan.scenes[i].durationMs / 1000;
          if (elapsed < cum + d) { idx = i; local = elapsed - cum; break; }
          cum += d; idx = i; local = d;
        }
        scenePtr = idx;
        drawScene(idx, local, activePlan.scenes[idx].durationMs / 1000);
        const pct = Math.min(99, 30 + Math.round((elapsed / totalSec) * 70));
        setProgress(pct);
        if (elapsed < totalSec) requestAnimationFrame(tick);
        else setTimeout(() => recorder.stop(), 200);
      };
      requestAnimationFrame(tick);

      await stopped;
      audioCtx.close();
      const blob = new Blob(chunks, { type: mime });
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoExt(ext);
      setProgress(100);
      const sizeMb = (blob.size / 1024 / 1024).toFixed(1);
      setStep(`Done — ${sizeMb} MB`);
      toast({ title: 'Video ready', description: `${sizeMb} MB` });

      // Auto-save to library so it can be revisited
      try {
        const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const upload = await supabase.storage
          .from('workspace-files')
          .upload(path, blob, { contentType: mime, upsert: false });
        if (upload.error) throw upload.error;
        const { data: pub } = supabase.storage.from('workspace-files').getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        await saveToolRun({
          tool_type: 'video',
          title: activePlan.title || `Video — ${new Date().toLocaleString()}`,
          input_data: { prompt, aspect, scenes: activePlan.scenes.length },
          output_data: {
            title: activePlan.title,
            video_url: publicUrl,
            ext,
            size_mb: Number(sizeMb),
            aspect,
            scenes: activePlan.scenes,
          },
          file_url: publicUrl,
        });
        toast({ title: 'Saved to Library', description: 'Find it any time in your Library.' });
        loadVideoLibrary();
      } catch (saveErr) {
        console.error('[CreationStudio] save to library failed', saveErr);
        toast({
          title: 'Saved locally only',
          description: (saveErr as Error).message || 'Could not upload to library.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      const msg = (e as Error).message || 'Render failed';
      console.error('[CreationStudio] render failed', e);
      setLastError(msg);
      setStep('');
      toast({ title: 'Render failed', description: msg, variant: 'destructive' });
    } finally { setRendering(false); }
  };

  const generateAll = async () => {
    const p = await generatePlan();
    if (p) await renderVideo(p);
  };

  const toggleSiteImg = (id: string) => {
    setSelectedSiteIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Film className="w-5 h-5 text-amber" /> Video Studio
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI-scripted video with your ElevenLabs voice + real site photos. Mix premade titles, topics, and prompt recipes — or write your own.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchVoices} disabled={loadingVoices}>
            {loadingVoices ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Reload voices</span>
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Voice (ElevenLabs)</Label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {voices.length === 0 && <option value="">— No voices loaded —</option>}
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} {v.category ? `· ${v.category}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Aspect</Label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as any)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ASPECTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Target length (sec)</Label>
              <Input type="number" min={10} max={90} value={durationSec}
                onChange={(e) => setDurationSec(Math.max(10, Math.min(90, Number(e.target.value) || 30)))} />
            </div>
          </div>
        </div>

        {/* Premade ideation: titles, topics, prompt recipes */}
        <div className="mt-5 space-y-4 rounded-lg border border-amber/20 bg-background/30 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Idea Mixer — pick & combine</div>
            <button
              type="button"
              onClick={cycleAll}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-amber flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Surprise me
            </button>
          </div>

          {/* Titles */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Titles</div>
            <div className="flex flex-wrap gap-1.5">
              {PREMADE_TITLES.map((t) => {
                const on = pickedTitle === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const next = on ? '' : t;
                      setPickedTitle(next);
                      applyComposed({ title: next });
                    }}
                    className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                      on ? 'bg-amber/15 border-amber text-amber' : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                    }`}
                  >{t}</button>
                );
              })}
            </div>
          </div>

          {/* Topics */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Topics — click to combine</div>
              {pickedTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setPickedTopics([]); applyComposed({ topics: [] }); }}
                  className="text-[10px] text-muted-foreground hover:text-amber uppercase tracking-wider"
                >Clear ({pickedTopics.length})</button>
              )}
            </div>
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
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {(topicCategory === 'All' ? ALL_TOPICS_FLAT : (PREMADE_TOPICS[topicCategory] || [])).map((t) => {
                const on = pickedTopics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTopic(t)}
                    className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                      on ? 'bg-amber/15 border-amber text-amber' : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                    }`}
                  >{t}</button>
                );
              })}
            </div>
          </div>

          {/* Prompt recipes */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Prompt recipes — pick a structure</div>
            <div className="flex flex-wrap gap-1.5">
              {PREMADE_PROMPTS.map((p) => {
                const on = pickedRecipe === p.text;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const next = on ? '' : p.text;
                      setPickedRecipe(next);
                      applyComposed({ recipe: next });
                    }}
                    title={p.text}
                    className={`text-[11px] rounded-full px-2.5 py-1 border transition text-left ${
                      on ? 'bg-amber/15 border-amber text-amber' : 'bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber'
                    }`}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <Label>Prompt — what's the video about?</Label>
            <button
              type="button"
              onClick={() => { setPickedTitle(''); setPickedTopics([]); setPickedRecipe(''); setPrompt(''); }}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-amber"
            >Clear all</button>
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder='Pick from the Idea Mixer above, or write your own. e.g. "Punchy 30-second LinkedIn video about how a $5M-$25M manufacturer leaks $200k/yr in stalled deals — pitch the Forensic Diagnostic."'
            className="mt-1"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={generateAll}
            disabled={planning || rendering || !prompt.trim()}
            className="bg-amber text-charcoal hover:bg-amber/90"
          >
            {(planning || rendering) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Film className="w-4 h-4 mr-2" />}
            {planning ? 'Planning…' : rendering ? `Rendering ${progress}%` : 'Generate Video (one click)'}
          </Button>
          <Button
            variant="outline"
            onClick={() => generatePlan()}
            disabled={planning || rendering || !prompt.trim()}
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Plan only (review first)
          </Button>
        </div>

        {(step || lastError) && (
          <div className={`mt-3 text-sm rounded-md px-3 py-2 border ${lastError ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-background/40 text-muted-foreground'}`}>
            {lastError ? <><strong>Error:</strong> {lastError}</> : step}
          </div>
        )}
      </div>

      {/* Image library + uploads */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass p-4 rounded-xl">
          <h3 className="font-bold mb-2 text-sm">Site library ({siteLibrary.length}) — click to include</h3>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {siteLibrary.map(img => {
              const on = selectedSiteIds.has(img.id);
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => toggleSiteImg(img.id)}
                  className={`relative aspect-square overflow-hidden rounded border-2 transition ${on ? 'border-amber' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  title={img.label}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  {on && <span className="absolute top-1 right-1 bg-amber text-charcoal text-[10px] font-bold px-1 rounded">ON</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Per-video uploads ({uploads.length})</h3>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3 mr-1" /> Add
            </Button>
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {uploads.map(img => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded border-2 border-amber">
                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setUploads(prev => prev.filter(u => u.id !== img.id))}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {uploads.length === 0 && <div className="col-span-4 text-xs text-muted-foreground py-6 text-center">No uploads yet</div>}
          </div>
        </div>
      </div>

      {/* Shared Image Library — every image generated/uploaded by anyone */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base font-display flex items-center gap-2">
            <Library className="w-5 h-5 text-amber" /> Image Library
            <span className="text-xs text-muted-foreground font-normal">({imageLibrary.length})</span>
          </h3>
          <Button size="sm" variant="outline" onClick={loadImageLibrary} disabled={imgLibLoading}>
            {imgLibLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Every image generated by the video creator, the admin image studio, or any rep's Art Studio. Click <strong className="text-amber">Add</strong> to use one as a scene image, or <strong className="text-crimson">Delete</strong> to remove it permanently.
        </p>
        {imgLibLoading && imageLibrary.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : imageLibrary.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">No images yet — generate one in a scene or in the Art Studio.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[420px] overflow-y-auto">
            {imageLibrary.map(img => (
              <div key={`${img.source_table}:${img.id}`} className="group relative aspect-square overflow-hidden rounded border border-border bg-background/30">
                <img src={img.url} alt={img.prompt || 'library image'} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute top-1 left-1 px-1 rounded bg-black/70 text-amber text-[9px] font-mono uppercase tracking-wider">{img.owner_label}</div>
                <div className="absolute inset-0 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1.5">
                  <p className="text-[9px] text-muted-foreground line-clamp-3 text-center mb-1">{img.prompt || '(no prompt)'}</p>
                  <Button size="sm" className="h-6 text-[10px] px-2 w-full bg-amber text-charcoal hover:bg-amber/90" onClick={() => addLibraryImageToScenes(img)}>
                    <Upload className="w-3 h-3 mr-1" /> Add
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 w-full border-crimson/50 text-crimson hover:bg-crimson/10" disabled={imgDeletingId === img.id} onClick={() => deleteLibraryImage(img)}>
                    {imgDeletingId === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" /> Delete</>}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan preview */}
      {plan && (
        <div className="glass p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold font-display text-lg">{plan.title}</h3>
            <Button onClick={() => renderVideo()} disabled={rendering} className="bg-amber text-charcoal hover:bg-amber/90">
              {rendering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
              {rendering ? `Rendering ${progress}%` : 'Generate Voice + Render Video'}
            </Button>
          </div>
          <div className="space-y-3">
            {plan.scenes.map((s, i) => {
              const img = allAvailable.find(a => a.id === s.imageId);
              return (
                <div key={i} className="flex gap-3 p-3 bg-background/40 rounded-lg border border-border">
                  <div className="w-24 flex-shrink-0 flex flex-col gap-2">
                    <div className="w-24 h-24 rounded overflow-hidden bg-charcoal border border-border/40 flex items-center justify-center">
                      {img ? (
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground text-center px-1">No image</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-2 border-amber/40 text-amber hover:bg-amber/10"
                      disabled={generatingSceneIdx === i}
                      onClick={() => generateSceneImage(i)}
                      title="Generate an image using this scene's image prompt + style"
                    >
                      {generatingSceneIdx === i ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {img ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="font-mono text-amber">SCENE {i + 1}</span>
                      <span>· {(s.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                    <Input
                      value={s.caption}
                      onChange={(e) => {
                        const next = { ...plan }; next.scenes[i] = { ...s, caption: e.target.value };
                        setPlan(next);
                      }}
                      className="font-bold mb-2"
                      placeholder="Caption (also drives image generation)"
                    />
                    <Textarea
                      value={s.voiceover}
                      rows={2}
                      onChange={(e) => {
                        const next = { ...plan }; next.scenes[i] = { ...s, voiceover: e.target.value };
                        setPlan(next);
                      }}
                      className="text-sm mb-2"
                      placeholder="Voiceover line (spoken aloud)"
                    />
                    <div className="rounded-md border border-amber/20 bg-amber/5 p-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest text-amber font-mono flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Image prompt for this scene
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] border-amber/40 text-amber hover:bg-amber/10"
                            disabled={!s.caption?.trim()}
                            title="Copy this scene's title/caption into the image prompt"
                            onClick={() => {
                              const next = { ...plan };
                              const existing = (s.imagePrompt ?? '').trim();
                              const title = (s.caption || '').trim();
                              if (!title) return;
                              next.scenes[i] = {
                                ...s,
                                imagePrompt: existing ? `${title} — ${existing}` : title,
                              };
                              setPlan(next);
                              toast({ title: 'Title pasted into image prompt' });
                            }}
                          >
                            ⤵ Use scene title
                          </Button>
                          <select
                            value={s.imageStyle || 'case_file'}
                            onChange={(e) => {
                              const next = { ...plan }; next.scenes[i] = { ...s, imageStyle: e.target.value as SceneImageStyle };
                              setPlan(next);
                            }}
                            className="h-6 rounded border border-border bg-background px-1.5 text-[10px] font-mono uppercase"
                          >
                            {SCENE_STYLE_OPTIONS.map(o => (
                              <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Textarea
                        value={s.imagePrompt ?? ''}
                        rows={2}
                        onChange={(e) => {
                          const next = { ...plan }; next.scenes[i] = { ...s, imagePrompt: e.target.value };
                          setPlan(next);
                        }}
                        placeholder={`Describe the visual you want. Falls back to caption + voiceover. e.g. "Manila case file open on a desk, redaction bars over a CRM screenshot, hard amber rim light, $187,400 stamped in red."`}
                        className="text-xs bg-background"
                      />
                      <div className="text-[10px] text-muted-foreground">
                        {SCENE_STYLE_OPTIONS.find(o => o.key === (s.imageStyle || 'case_file'))?.desc}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Music panel */}
          <div className="mt-5 rounded-lg border border-amber/30 bg-background/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-amber font-mono">Background music (optional)</div>
                <div className="text-xs text-muted-foreground">AI-generated original score via ElevenLabs Music — royalty-free, yours to use.</div>
              </div>
              {musicUrl && (
                <button type="button" onClick={clearMusic} className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-destructive">
                  Remove
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSIC_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setMusicPrompt(p.text)}
                  title={p.text}
                  className="text-[11px] rounded-full px-2.5 py-1 border bg-background/40 border-border text-foreground/80 hover:border-amber/50 hover:text-amber transition"
                >{p.label}</button>
              ))}
            </div>
            <Textarea
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
              rows={2}
              placeholder='Describe the music. e.g. "Slow forensic underscore, dark piano, low cello drone, ticking clock, no vocals, loopable."'
              className="text-sm"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={generateMusic}
                disabled={musicGenerating}
                className="border-amber/40 text-amber hover:bg-amber/10"
              >
                {musicGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {musicUrl ? 'Regenerate music' : 'Generate music'}
              </Button>
              <label className="text-[11px] text-muted-foreground flex items-center gap-2">
                Volume
                <input
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.02}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-32"
                />
                <span className="font-mono text-amber w-8">{Math.round(musicVolume * 100)}%</span>
              </label>
              {musicUrl && <audio src={musicUrl} controls className="h-8 max-w-xs" />}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Free music alternatives if you'd rather: <a href="https://pixabay.com/music/" target="_blank" rel="noreferrer" className="text-amber hover:underline">Pixabay Music</a>, <a href="https://www.bensound.com/" target="_blank" rel="noreferrer" className="text-amber hover:underline">Bensound</a>, <a href="https://freemusicarchive.org/" target="_blank" rel="noreferrer" className="text-amber hover:underline">Free Music Archive</a>. Generated music auto-mixes into the next render.
            </div>
          </div>

          {rendering && (
            <div className="mt-4">
              <div className="h-2 bg-border rounded overflow-hidden">
                <div className="h-full bg-amber transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {videoUrl && (
        <div className="glass p-6 rounded-xl">
          <h3 className="font-bold font-display text-lg mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-amber" /> Your video
          </h3>
          <video src={videoUrl} controls className="w-full max-h-[70vh] rounded-lg bg-black" />
          <a href={videoUrl} download={`aetheris-${Date.now()}.${videoExt}`}>
            <Button className="mt-3 bg-amber text-charcoal hover:bg-amber/90">
              <Download className="w-4 h-4 mr-2" /> Download .{videoExt}
            </Button>
          </a>
          {videoExt === 'webm' && (
            <p className="text-xs text-muted-foreground mt-2">
              WebM is accepted by LinkedIn, YouTube, Facebook, and X. For Instagram/TikTok, convert to MP4 (free at cloudconvert.com).
            </p>
          )}
        </div>
      )}

      {/* Video Library — every video you've made, auto-saved */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-bold font-display text-lg flex items-center gap-2">
            <Library className="w-5 h-5 text-amber" /> Video Library
            <span className="text-xs text-muted-foreground font-normal">({videoLibrary.length})</span>
          </h3>
          <Button size="sm" variant="outline" onClick={loadVideoLibrary} disabled={libLoading}>
            {libLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Refresh
          </Button>
        </div>
        {libLoading && videoLibrary.length === 0 ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : videoLibrary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No videos yet. Render one above and it'll auto-save here.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videoLibrary.map(v => {
              const url = v.file_url || (v.output_data as any)?.video_url || '';
              const ext = (v.output_data as any)?.ext || 'mp4';
              const sizeMb = (v.output_data as any)?.size_mb;
              return (
                <div key={v.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 flex flex-col gap-2">
                  {url ? (
                    <video src={url} controls preload="metadata" className="w-full aspect-video rounded bg-black" />
                  ) : (
                    <div className="w-full aspect-video rounded bg-black/40 flex items-center justify-center text-xs text-muted-foreground">
                      No file
                    </div>
                  )}
                  <div className="text-xs font-bold leading-tight line-clamp-2">{v.title || 'Untitled video'}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {new Date(v.created_at).toLocaleString()}{sizeMb ? ` · ${sizeMb} MB` : ''}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {url && (
                      <a href={url} download={`aetheris-${v.id}.${ext}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-8">
                          <Download className="w-3 h-3 mr-1" /> Download
                        </Button>
                      </a>
                    )}
                    <Button size="sm" variant="outline"
                      onClick={() => deleteLibraryVideo(v.id)}
                      disabled={libDeletingId === v.id}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8 px-2">
                      {libDeletingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreationStudio;
