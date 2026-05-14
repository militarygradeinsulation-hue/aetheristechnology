import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Download, Film, Wand2, RefreshCw, Check, Music, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';

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
  useEffect(() => { loadImages(); loadVoices(); }, []);

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

  const generatePlan = async (): Promise<Plan | null> => {
    if (!prompt.trim()) { toast({ title: 'Enter a prompt' }); return null; }
    if (available.length === 0) { toast({ title: 'No images available — generate or upload images in your Art Studio first', variant: 'destructive' }); return null; }
    setBusy(true); setStep('Asking AI for scene plan…'); setPlan(null); setVideoUrl('');
    try {
      const { data, error } = await invoke('plan_video', {
        prompt, durationSec: duration, aspect,
        images: available.map(i => ({ id: i.id, label: i.prompt?.slice(0, 80) })),
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data.plan); setStep('Plan ready — review or render.');
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
      setStep(`Done — ${mb} MB`);
      toast({ title: 'Video ready', description: `${mb} MB` });
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
    </div>
  );
};

export default RepCreationStudio;
