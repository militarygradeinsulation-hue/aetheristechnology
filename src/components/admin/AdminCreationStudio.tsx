import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Sparkles, Mic, Film, Upload, X, Download, Play, RefreshCw } from 'lucide-react';

// Auto-pull every image bundled in src/assets
const ASSET_GLOB = import.meta.glob('/src/assets/**/*.{jpg,jpeg,png,webp,JPG,PNG}', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

type AssetImage = { id: string; url: string; label: string; source: 'site' | 'upload' };
type Scene = { imageId: string; caption: string; voiceover: string; durationMs: number };
type Plan = { title: string; scenes: Scene[] };
type Voice = { voice_id: string; name: string; category?: string; preview_url?: string };

const ASPECTS: { key: string; w: number; h: number; label: string }[] = [
  { key: '9:16', w: 1080, h: 1920, label: '9:16 (Reels/Shorts/TikTok)' },
  { key: '1:1',  w: 1080, h: 1080, label: '1:1 (Feed)' },
  { key: '16:9', w: 1920, h: 1080, label: '16:9 (LinkedIn/YouTube)' },
];

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
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoExt(mime.includes('mp4') ? 'mp4' : 'webm');
      setProgress(100);
      toast({ title: 'Video ready', description: `${(blob.size / 1024 / 1024).toFixed(1)} MB` });
    } catch (e) {
      toast({ title: 'Render failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setRendering(false); }
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
              <Film className="w-5 h-5 text-amber" /> Creation Studio
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              AI-scripted video with your ElevenLabs voice + real site photos. Renders in your browser.
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

        <div className="mt-4">
          <Label>Prompt — what's the video about?</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder='e.g. "Punchy 30-second LinkedIn post about how a $5M-$25M manufacturer leaks $200k/yr in stalled deals — pitch the 21-Day Revenue Diagnostic."'
            className="mt-1"
          />
        </div>

        <Button
          onClick={generatePlan}
          disabled={planning || rendering || !prompt.trim()}
          className="mt-4 bg-amber text-charcoal hover:bg-amber/90"
        >
          {planning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate Script & Scene Plan
        </Button>
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
            {activePlan.scenes.map((s, i) => {
              const img = allAvailable.find(a => a.id === s.imageId);
              return (
                <div key={i} className="flex gap-3 p-3 bg-background/40 rounded-lg border border-border">
                  <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden bg-charcoal">
                    {img && <img src={img.url} alt="" className="w-full h-full object-cover" />}
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
                    />
                    <Textarea
                      value={s.voiceover}
                      rows={2}
                      onChange={(e) => {
                        const next = { ...plan }; next.scenes[i] = { ...s, voiceover: e.target.value };
                        setPlan(next);
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              );
            })}
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
    </div>
  );
};

export default AdminCreationStudio;
