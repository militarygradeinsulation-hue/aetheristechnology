import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Download, Film, Wand2, RefreshCw, Check, Music, X, Library, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { listRepLibrary, deleteFromRepLibrary, type RepLibraryItem } from '@/lib/portalWorkspace';

interface StudioImage {
  id: string;
  prompt: string;
  url: string;
  source: string;
  created_at: string;
}

interface Scene {
  imageId: string;
  caption: string;
  voiceover: string;
  durationMs: number;
}
interface Plan { title: string; scenes: Scene[]; }
interface Voice { voice_id: string; name: string; }

const ASPECTS = [
  { key: '9:16', label: 'Vertical (9:16)', w: 1080, h: 1920 },
  { key: '1:1',  label: 'Square (1:1)',     w: 1080, h: 1080 },
  { key: '16:9', label: 'Wide (16:9)',      w: 1920, h: 1080 },
];

const PROMPT_STARTERS = [
  '30-second cold-open about the 5 hidden leaks in service businesses. End with the Forensic Diagnostic CTA.',
  'Founder-to-founder story about a $40k revenue leak we found in CRM hygiene.',
  'Hard-truth video: why your sales team is bleeding deals at "proposal sent". 6 scenes.',
];

const PREMADE_TITLES: string[] = [
  'Your Business Is Leaking, You Just Can\'t See It',
  'The $200k Leak Hiding in Your CRM',
  '7 Steps of The Leak Audit™',
  'Stop Hiring Reps. Fix the Process.',
  'The Forensic Diagnostic: $2,500 to Find the Bleed',
  'Trade-Show Leads Decay in 72 Hours',
  'The Follow-Up Gap Costing $40k/Month',
  'AI Won\'t Save a Broken Process',
];

const PREMADE_TOPICS: string[] = [
  'Manufacturers losing 30%+ of trade-show leads to bad follow-up.',
  'The dead-lead pile worth $200k that nobody resurrects.',
  'Quote-to-cash leakage between sales and ops.',
  'Stalled deals nobody triages, the silent revenue killer.',
  'Discount creep eating 4 points of margin per quarter.',
  'CRM stages lying about pipeline value.',
  'The 72-hour warm-lead decay curve.',
  'AI-assisted CRM hygiene for $5M-$50M operators.',
  'Why "more reps" is the wrong fix.',
  'Discovery calls leak deals, here\'s the script that plugs it.',
];

const MUSIC_PRESETS: { label: string; text: string }[] = [
  { label: 'Forensic tension', text: 'Slow cinematic forensic underscore. Low cello drone, sparse dark piano, subtle ticking clock, building tension. No vocals. Loopable.' },
  { label: 'Operator hustle',  text: 'Confident mid-tempo lo-fi hip-hop instrumental. Warm bass, dusty drums, muted Rhodes. Founder-energy. No vocals.' },
  { label: 'Boardroom power',  text: 'Modern corporate cinematic with bold brass stabs and driving percussion. High-stakes, decisive. No vocals.' },
  { label: 'Late-night noir',  text: 'Dark synthwave noir. Analog pads, gated reverb snare, slow arpeggio. No vocals.' },
  { label: 'Documentary slow', text: 'Sparse acoustic documentary score. Felt piano, soft strings, contemplative. No vocals.' },
  { label: 'Heist clock',      text: 'Pulsing electronic heist score. Tight kick, ticking hi-hats, plucked synth ostinato. No vocals. Loopable.' },
];

function base64ToBlob(b64: string, mime: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function pickRecorderMime() {
  const c = ['video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for (const m of c) if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  return 'video/webm';
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/); const out: string[] = []; let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

export const RepCreationStudio: React.FC = () => {
  const [images, setImages] = useState<StudioImage[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('9:16');
  const [duration, setDuration] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoExt, setVideoExt] = useState<'mp4'|'webm'>('webm');

  // Ideation
  const [pickedTitle, setPickedTitle] = useState('');
  const [pickedTopics, setPickedTopics] = useState<string[]>([]);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiTopics, setAiTopics] = useState<string[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Music
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.18);
  const [musicGenerating, setMusicGenerating] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const musicBufferRef = useRef<ArrayBuffer | null>(null);

  // Video library (auto-saved past renders)
  const [videoLibrary, setVideoLibrary] = useState<RepLibraryItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libDeletingId, setLibDeletingId] = useState<string | null>(null);

  const loadVideoLibrary = async () => {
    setLibLoading(true);
    try {
      const items = await listRepLibrary({ tool_type: 'video' });
      setVideoLibrary(items);
    } catch (e) {
      console.error('[RepCreationStudio] load library failed', e);
    } finally { setLibLoading(false); }
  };
  const deleteLibraryVideo = async (id: string) => {
    if (!window.confirm('Delete this video from your library? This cannot be undone.')) return;
    setLibDeletingId(id);
    const prev = videoLibrary;
    setVideoLibrary(p => p.filter(v => v.id !== id));
    try { await deleteFromRepLibrary(id); toast({ title: 'Removed from library' }); }
    catch (e: any) { setVideoLibrary(prev); toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }); }
    finally { setLibDeletingId(null); }
  };

  const invoke = (action: string, body: Record<string, unknown> = {}) => {
    const token = getPortalToken();
    return supabase.functions.invoke('portal-creation-studio', {
      body: { action, ...body },
      headers: token ? { 'x-portal-token': token } : {},
    });
  };
  const imageInvoke = (body: Record<string, unknown>) => {
    const token = getPortalToken();
    return supabase.functions.invoke('portal-image-studio', {
      body, headers: token ? { 'x-portal-token': token } : {},
    });
  };

  const loadImages = async () => {
    const { data, error } = await imageInvoke({ action: 'list' });
    if (error || data?.error) {
      toast({ title: 'Failed to load images', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    setImages(data.images || []);
  };
  const loadVoices = async () => {
    const { data, error } = await invoke('list_voices');
    if (error || data?.error) {
      toast({ title: 'Failed to load voices', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    setVoices(data.voices || []);
    if (!voiceId && data.voices?.[0]) setVoiceId(data.voices[0].voice_id);
  };
  useEffect(() => { loadImages(); loadVoices(); loadVideoLibrary(); }, []);

  const toggleSel = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const available = useMemo(
    () => (selectedIds.size > 0 ? images.filter(i => selectedIds.has(i.id)) : images),
    [images, selectedIds],
  );

  const allTitles = useMemo(() => [...aiTitles, ...PREMADE_TITLES], [aiTitles]);
  const allTopics = useMemo(() => [...aiTopics, ...PREMADE_TOPICS], [aiTopics]);

  const composePrompt = (overrides?: { title?: string; topics?: string[]; base?: string }) => {
    const t = overrides?.title ?? pickedTitle;
    const tps = overrides?.topics ?? pickedTopics;
    const base = (overrides?.base ?? prompt).trim();
    const parts: string[] = [];
    if (t) parts.push(`TITLE: ${t}`);
    if (tps.length) parts.push(`TOPICS:\n- ${tps.join('\n- ')}`);
    if (base) parts.push(base);
    return parts.join('\n\n');
  };

  const applyTitle = (t: string) => {
    const next = pickedTitle === t ? '' : t;
    setPickedTitle(next);
    setPrompt(composePrompt({ title: next }));
  };
  const toggleTopic = (t: string) => {
    const next = pickedTopics.includes(t) ? pickedTopics.filter(x => x !== t) : [...pickedTopics, t];
    setPickedTopics(next);
    setPrompt(composePrompt({ topics: next }));
  };
  const clearIdeation = () => {
    setPickedTitle(''); setPickedTopics([]);
    setPrompt(composePrompt({ title: '', topics: [] }));
  };

  const refreshTopics = async () => {
    setTopicsLoading(true);
    try {
      const exclude = [...PREMADE_TOPICS, ...aiTopics];
      const { data, error } = await invoke('generate_topics', { exclude, count: 10 });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fresh = (data?.topics || []).filter((t: string) => !exclude.includes(t));
      if (!fresh.length) { toast({ title: 'No new topics', variant: 'destructive' }); return; }
      setAiTopics(prev => [...fresh, ...prev].slice(0, 30));
      toast({ title: `Added ${fresh.length} fresh topics` });
    } catch (e: any) {
      toast({ title: 'Topic refresh failed', description: e.message, variant: 'destructive' });
    } finally { setTopicsLoading(false); }
  };

  const refreshIdeas = async () => {
    setIdeasLoading(true);
    try {
      const { data, error } = await invoke('generate_ideas', {
        excludeTitles: [...PREMADE_TITLES, ...aiTitles],
        excludeTopics: [...PREMADE_TOPICS, ...aiTopics],
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newTitles: string[] = data?.titles || [];
      const newTopics: string[] = data?.topics || [];
      if (newTitles.length) setAiTitles(prev => [...newTitles, ...prev].slice(0, 30));
      if (newTopics.length) setAiTopics(prev => [...newTopics, ...prev].slice(0, 30));
      toast({ title: `Refreshed ${newTitles.length + newTopics.length} ideas` });
    } catch (e: any) {
      toast({ title: 'Idea refresh failed', description: e.message, variant: 'destructive' });
    } finally { setIdeasLoading(false); }
  };

  const generateMusic = async () => {
    const p = (musicPrompt.trim() || MUSIC_PRESETS[0].text);
    setMusicGenerating(true);
    try {
      const planSec = plan ? plan.scenes.reduce((a, s) => a + s.durationMs / 1000, 0) : duration;
      const ms = Math.max(10000, Math.min(180000, Math.round(planSec * 1000) + 2000));
      const { data, error } = await invoke('generate_music', { prompt: p, durationMs: ms });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const blob = base64ToBlob(data.audioBase64, data.mime || 'audio/mpeg');
      musicBufferRef.current = await blob.arrayBuffer();
      setMusicUrl(URL.createObjectURL(blob));
      toast({ title: 'Music ready', description: `${(blob.size / 1024 / 1024).toFixed(1)} MB · mixes into next render` });
    } catch (e: any) {
      toast({ title: 'Music failed', description: e.message, variant: 'destructive' });
    } finally { setMusicGenerating(false); }
  };

  const clearMusic = () => { musicBufferRef.current = null; setMusicUrl(''); };

  const generatePlan = async (): Promise<Plan | null> => {
    if (!prompt.trim()) { toast({ title: 'Enter a prompt' }); return null; }
    if (available.length === 0) { toast({ title: 'No images available, generate or upload images in your Art Studio first', variant: 'destructive' }); return null; }
    setBusy(true); setStep('Asking AI for scene plan…'); setPlan(null); setVideoUrl('');
    try {
      const { data, error } = await invoke('plan_video', {
        prompt, durationSec: duration, aspect,
        images: available.map(i => ({ id: i.id, label: i.prompt?.slice(0, 80) })),
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan); setStep('Plan ready, review or render.');
      return data.plan as Plan;
    } catch (e: any) {
      toast({ title: 'Plan failed', description: e.message, variant: 'destructive' });
      setStep('');
      return null;
    } finally { setBusy(false); }
  };

  const renderVideo = async (override?: Plan) => {
    const active = override || plan;
    if (!active) return;
    if (!voiceId) { toast({ title: 'Pick a voice first', variant: 'destructive' }); return; }

    setBusy(true); setProgress(0); setVideoUrl(''); setStep('Generating voiceover…');
    try {
      const audioBuffers: ArrayBuffer[] = [];
      for (let i = 0; i < active.scenes.length; i++) {
        const s = active.scenes[i];
        const { data, error } = await invoke('tts', { text: s.voiceover, voiceId });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const blob = base64ToBlob(data.audioBase64, data.mime || 'audio/mpeg');
        const buf = await blob.arrayBuffer();
        audioBuffers.push(buf);
        const a = new Audio(URL.createObjectURL(blob)); a.preload = 'auto';
        await new Promise<void>(res => { a.onloadedmetadata = () => res(); a.onerror = () => res(); });
        const dur = isFinite(a.duration) ? Math.max(2.2, a.duration + 0.3) : s.durationMs / 1000;
        s.durationMs = Math.round(dur * 1000);
        setProgress(Math.round(((i + 1) / active.scenes.length) * 30));
      }

      const def = ASPECTS.find(a => a.key === aspect)!;
      const canvas = document.createElement('canvas');
      canvas.width = def.w; canvas.height = def.h;
      const ctx = canvas.getContext('2d')!;

      const sceneImgs: HTMLImageElement[] = [];
      for (const s of active.scenes) {
        const a = images.find(x => x.id === s.imageId)!;
        sceneImgs.push(await loadImg(a.url));
      }

      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AC();
      const dest = audioCtx.createMediaStreamDestination();
      const decoded: AudioBuffer[] = [];
      for (const buf of audioBuffers) decoded.push(await audioCtx.decodeAudioData(buf.slice(0)));

      const videoStream = (canvas as any).captureStream(30) as MediaStream;
      const combined = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const mime = pickRecorderMime();
      const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>(r => { recorder.onstop = () => r(); });
      recorder.start(250);

      let acc = 0;
      const startTime = audioCtx.currentTime + 0.15;
      for (let i = 0; i < decoded.length; i++) {
        const src = audioCtx.createBufferSource();
        src.buffer = decoded[i]; src.connect(dest); src.start(startTime + acc);
        acc += active.scenes[i].durationMs / 1000;
      }
      const totalSec = acc;

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
          gain.gain.setValueAtTime(v, startTime + Math.max(0.1, totalSec - 1.2));
          gain.gain.linearRampToValueAtTime(0, startTime + totalSec);
          musicSrc.connect(gain).connect(dest);
          musicSrc.start(startTime);
          musicSrc.stop(startTime + totalSec + 0.1);
        } catch (musicErr) { console.warn('music mix failed', musicErr); }
      }

      const animStart = performance.now();

      const drawScene = (idx: number, localT: number, sceneDur: number) => {
        const img = sceneImgs[idx]; const s = active.scenes[idx];
        const cw = canvas.width, ch = canvas.height;
        const t = Math.min(1, localT / sceneDur);
        const zoom = 1.05 + 0.12 * t;
        const panX = (idx % 2 === 0 ? -1 : 1) * 0.04 * t * cw;
        const ir = img.width / img.height; const cr = cw / ch;
        let dw, dh;
        if (ir > cr) { dh = ch * zoom; dw = dh * ir; } else { dw = cw * zoom; dh = dw / ir; }
        const dx = (cw - dw) / 2 + panX; const dy = (ch - dh) / 2;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
        const grad = ctx.createLinearGradient(0, ch * 0.55, 0, ch);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = grad; ctx.fillRect(0, ch * 0.55, cw, ch * 0.45);
        const fs = Math.round(cw * 0.058);
        ctx.font = `900 ${fs}px "Space Grotesk", "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
        const lines = wrap(ctx, s.caption.toUpperCase(), cw * 0.86);
        const lh = fs * 1.15;
        const sy = ch - lh * lines.length - cw * 0.06;
        lines.forEach((ln, i) => ctx.fillText(ln, cw / 2, sy + i * lh));
        ctx.shadowBlur = 0;
        ctx.font = `600 ${Math.round(cw * 0.018)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
        ctx.fillText('AETHERIS AI STUDIO', cw - cw * 0.03, ch - cw * 0.018);
      };

      const tick = () => {
        const elapsed = (performance.now() - animStart) / 1000;
        let cum = 0, idx = 0, local = 0;
        for (let i = 0; i < active.scenes.length; i++) {
          const d = active.scenes[i].durationMs / 1000;
          if (elapsed < cum + d) { idx = i; local = elapsed - cum; break; }
          cum += d; idx = i; local = d;
        }
        drawScene(idx, local, active.scenes[idx].durationMs / 1000);
        setProgress(Math.min(99, 30 + Math.round((elapsed / totalSec) * 70)));
        if (elapsed < totalSec) requestAnimationFrame(tick);
        else setTimeout(() => recorder.stop(), 200);
      };
      setStep('Rendering video…');
      requestAnimationFrame(tick);

      await stopped;
      audioCtx.close();
      const blob = new Blob(chunks, { type: mime });
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      setVideoUrl(URL.createObjectURL(blob));
      setVideoExt(ext); setProgress(100);
      const mb = (blob.size / 1024 / 1024).toFixed(1);
      setStep(`Done, ${mb} MB`);
      toast({ title: 'Video ready', description: `${mb} MB` });

      // Auto-save to rep library so it can be revisited
      try {
        const path = `rep-videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const upload = await supabase.storage
          .from('workspace-files')
          .upload(path, blob, { contentType: mime, upsert: false });
        if (upload.error) throw upload.error;
        const { data: pub } = supabase.storage.from('workspace-files').getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        await saveToolRun({
          tool_type: 'video',
          title: active.title || `Video, ${new Date().toLocaleString()}`,
          input_data: { prompt, aspect, scenes: active.scenes.length },
          output_data: {
            title: active.title,
            video_url: publicUrl,
            ext,
            size_mb: Number(mb),
            aspect,
            scenes: active.scenes,
          },
          file_url: publicUrl,
        });
        toast({ title: 'Saved to your Library' });
        loadVideoLibrary();
      } catch (saveErr: any) {
        console.error('[RepCreationStudio] save to library failed', saveErr);
        toast({
          title: 'Saved locally only',
          description: saveErr?.message || 'Could not upload to library.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Render failed', description: e.message, variant: 'destructive' });
      setStep('');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-amber" />
          <h2 className="text-xl font-bold text-foreground font-display">Personal Video Studio</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Turn your Art Studio images into a 30-60 second branded video with voiceover. Pick a voice (3 to choose from), describe what the video should say, and we'll plan + render it.
        </p>

        <Textarea
          placeholder="Describe the video (what story, who it's for, what to say)…"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {PROMPT_STARTERS.map((p, i) => (
            <button key={i} type="button" onClick={() => setPrompt(p)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/40 text-muted-foreground hover:text-amber hover:border-amber/50 transition">
              Starter {i + 1}
            </button>
          ))}
        </div>

        {/* Title (subject) picker */}
        <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-foreground uppercase tracking-wide">Subject / Title</div>
            <Button variant="ghost" size="sm" onClick={refreshIdeas} disabled={ideasLoading}>
              {ideasLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Fresh ideas
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {allTitles.map((t) => {
              const sel = pickedTitle === t;
              const isAi = aiTitles.includes(t);
              return (
                <button key={t} type="button" onClick={() => applyTitle(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    sel
                      ? 'bg-amber text-background border-amber'
                      : 'border-border bg-background/40 text-muted-foreground hover:text-amber hover:border-amber/50'
                  }`}>
                  {isAi && '✨ '}{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic picker */}
        <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-foreground uppercase tracking-wide">
              Topics {pickedTopics.length > 0 && <span className="text-amber">· {pickedTopics.length} selected</span>}
            </div>
            <div className="flex gap-1">
              {(pickedTitle || pickedTopics.length > 0) && (
                <Button variant="ghost" size="sm" onClick={clearIdeation}>Clear</Button>
              )}
              <Button variant="ghost" size="sm" onClick={refreshTopics} disabled={topicsLoading}>
                {topicsLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                More topics
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {allTopics.map((t) => {
              const sel = pickedTopics.includes(t);
              const isAi = aiTopics.includes(t);
              return (
                <button key={t} type="button" onClick={() => toggleTopic(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition text-left ${
                    sel
                      ? 'bg-amber text-background border-amber'
                      : 'border-border bg-background/40 text-muted-foreground hover:text-amber hover:border-amber/50'
                  }`}>
                  {isAi && '✨ '}{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Music panel */}
        <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wide">
              <Music className="w-3.5 h-3.5 text-amber" /> Background music
              {musicUrl && <span className="text-amber normal-case">· ready to mix</span>}
            </div>
            {musicUrl && (
              <Button variant="ghost" size="sm" onClick={clearMusic}><X className="w-3 h-3 mr-1" /> Remove</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MUSIC_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setMusicPrompt(p.text)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/40 text-muted-foreground hover:text-amber hover:border-amber/50 transition">
                {p.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Or describe the vibe (e.g., dark cinematic forensic underscore, no vocals)…"
            value={musicPrompt}
            onChange={e => setMusicPrompt(e.target.value)}
            rows={2}
            className="resize-none text-xs"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={generateMusic} disabled={musicGenerating}>
              {musicGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Music className="w-3.5 h-3.5 mr-1" />}
              Generate music
            </Button>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              Volume
              <input type="range" min={0} max={0.5} step={0.01}
                value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))}
                className="w-24 accent-amber" />
              <span className="font-mono text-amber w-8">{Math.round(musicVolume * 100)}%</span>
            </label>
            {musicUrl && <audio src={musicUrl} controls className="h-8" />}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <select value={voiceId} onChange={e => setVoiceId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {voices.length === 0 && <option value="">Loading voices…</option>}
            {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.name}</option>)}
          </select>
          <select value={aspect} onChange={e => setAspect(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {ASPECTS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {[20, 30, 45, 60, 90].map(s => <option key={s} value={s}>{s}s target</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generatePlan} disabled={busy || !prompt.trim()} className="flex-1 min-w-[160px]">
            {busy && step.includes('plan') ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Plan video
          </Button>
          <Button onClick={() => renderVideo()} disabled={busy || !plan} variant="default"
            className="flex-1 min-w-[160px] bg-amber text-background hover:bg-amber/90">
            {busy && !step.includes('plan') ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Render video
          </Button>
          <Button variant="outline" onClick={async () => { const p = await generatePlan(); if (p) await renderVideo(p); }} disabled={busy || !prompt.trim()}>
            One-click
          </Button>
        </div>

        {(step || progress > 0) && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{step}</div>
            {progress > 0 && (
              <div className="h-1.5 rounded bg-border overflow-hidden">
                <div className="h-full bg-amber transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass p-6 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground font-display">
            Pick scenes from your Art Studio ({selectedIds.size > 0 ? `${selectedIds.size} selected` : `${images.length} available`})
          </h3>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            )}
            <Button variant="ghost" size="sm" onClick={loadImages}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
          </div>
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No images yet. Generate or upload images in your Art Studio first.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {images.map(img => {
              const sel = selectedIds.has(img.id);
              return (
                <button key={img.id} type="button" onClick={() => toggleSel(img.id)}
                  className={`relative rounded border-2 overflow-hidden transition ${sel ? 'border-amber' : 'border-border hover:border-amber/40'}`}>
                  <img src={img.url} alt="" className="w-full h-20 object-cover" />
                  {sel && <div className="absolute top-1 right-1 bg-amber text-background rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {selectedIds.size === 0 ? 'AI will pick from all your images. Select specific ones to constrain the plan.' : `Plan will only use these ${selectedIds.size} image(s).`}
        </p>
      </div>

      {plan && (
        <div className="glass p-6 rounded-xl space-y-3">
          <h3 className="text-lg font-bold text-foreground font-display">{plan.title}</h3>
          <div className="space-y-2">
            {plan.scenes.map((s, i) => {
              const img = images.find(x => x.id === s.imageId);
              return (
                <div key={i} className="flex gap-3 p-2 rounded border border-border bg-background/30">
                  {img && <img src={img.url} alt="" className="w-20 h-20 object-cover rounded" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-xs font-mono text-amber">SCENE {i + 1} · {(s.durationMs / 1000).toFixed(1)}s</div>
                    <div className="text-sm font-bold text-foreground">{s.caption}</div>
                    <div className="text-xs text-muted-foreground">{s.voiceover}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {videoUrl && (
        <div className="glass p-6 rounded-xl space-y-3">
          <h3 className="text-lg font-bold text-foreground font-display">Your video</h3>
          <video src={videoUrl} controls className="w-full max-h-[70vh] rounded bg-black" />
          <a href={videoUrl} download={`aetheris-video-${Date.now()}.${videoExt}`}>
            <Button><Download className="w-4 h-4 mr-1" /> Download {videoExt.toUpperCase()}</Button>
          </a>
        </div>
      )}

      {/* Video Library, every video you've made, auto-saved */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="font-bold font-display text-lg flex items-center gap-2">
            <Library className="w-5 h-5 text-amber" /> Your Video Library
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

export default RepCreationStudio;
