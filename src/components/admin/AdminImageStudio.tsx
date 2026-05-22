import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Upload, Download, Trash2, Wand2, ImageIcon, RefreshCw, Maximize2, X, Linkedin, Shuffle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';

interface StudioImage {
  id: string;
  prompt: string;
  url: string;
  source: 'generated' | 'uploaded' | 'edited' | string;
  model: string | null;
  created_at: string;
}

const MODELS = [
  { key: 'google/gemini-3.1-flash-image-preview', label: 'Nano Banana 2 (fast, high quality)' },
  { key: 'google/gemini-2.5-flash-image', label: 'Nano Banana (standard)' },
  { key: 'google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro (best, slower)' },
];

export const AdminImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0].key);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [editTarget, setEditTarget] = useState<StudioImage | null>(null);
  const [preview, setPreview] = useState<StudioImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // LinkedIn Banner Creator state
  const BANNER_PRESETS = [
    { key: 'stop_guessing', headline: 'Stop Guessing.', accent: 'Start Understanding.', sub: 'I break down where your business is leaking money — with real numbers, real costs, real fixes.' },
    { key: 'leak_audit',    headline: 'Your business is leaking.', accent: "You just can't see it from the inside.", sub: 'Forensic Diagnostic. Operator-led. $2,500 flat, applied to engagement.' },
    { key: 'forensics',     headline: 'Business Forensics.', accent: 'Not Consulting.', sub: 'I find the leak, prove it with math, and plug it. No retainers. No fluff.' },
    { key: 'autopsy',       headline: 'Every dead deal', accent: 'has a cause of death.', sub: 'I run the autopsy. You get the receipts. Then we stop the bleed.' },
    { key: 'silent_bleed',  headline: 'The silent bleed', accent: 'is the expensive one.', sub: 'The leaks you can see are cheap. The ones you can\'t are killing your margin.' },
    { key: 'six_figures',   headline: 'Six figures', accent: 'are walking out the back door.', sub: 'Most owners are within 90 days of finding the leak. They just need someone outside the building.' },
    { key: 'not_a_growth',  headline: "You don't have a growth problem.", accent: 'You have a leak problem.', sub: 'Scaling a broken system just bleeds faster. Plug the holes first.' },
    { key: 'evidence',      headline: 'Opinions are cheap.', accent: 'Evidence is forensic.', sub: 'Every recommendation comes with the math, the source, and the cost of doing nothing.' },
    { key: 'cant_see',      headline: "You can't read the label", accent: 'from inside the jar.', sub: 'Outside operator. Inside view. Real numbers in 14 days.' },
    { key: 'custom',        headline: '', accent: '', sub: '' },
  ];

  // Pools the Shuffle button samples from independently for each line.
  const HEADLINE_POOL = [
    'Stop Guessing.',
    'Your business is leaking.',
    'Business Forensics.',
    'Every dead deal',
    'The silent bleed',
    'Six figures',
    "You don't have a growth problem.",
    'Opinions are cheap.',
    "You can't read the label",
    'The leak is real.',
    'Most owners are bleeding.',
    'Your P&L is lying to you.',
  ];
  const ACCENT_POOL = [
    'Start Understanding.',
    "You just can't see it from the inside.",
    'Not Consulting.',
    'has a cause of death.',
    'is the expensive one.',
    'are walking out the back door.',
    'You have a leak problem.',
    'Evidence is forensic.',
    'from inside the jar.',
    "They just can't see it yet.",
    'Find it. Prove it. Plug it.',
    'The receipts say otherwise.',
  ];
  const SUBLINE_POOL = [
    'I break down where your business is leaking money — with real numbers, real costs, real fixes.',
    'Forensic Diagnostic. Operator-led. $2,500 flat, applied to engagement.',
    'I find the leak, prove it with math, and plug it. No retainers. No fluff.',
    'I run the autopsy. You get the receipts. Then we stop the bleed.',
    "The leaks you can see are cheap. The ones you can't are killing your margin.",
    'Most owners are within 90 days of finding the leak. They just need someone outside the building.',
    'Scaling a broken system just bleeds faster. Plug the holes first.',
    'Every recommendation comes with the math, the source, and the cost of doing nothing.',
    'Outside operator. Inside view. Real numbers in 14 days.',
    '14-day forensic diagnostic. Ledger-grade evidence. No theater.',
    'Operator, not consultant. Built on receipts, not slide decks.',
  ];
  const [bannerPreset, setBannerPreset] = useState('stop_guessing');
  const [bannerHeadline, setBannerHeadline] = useState(BANNER_PRESETS[0].headline);
  const [bannerAccent, setBannerAccent] = useState(BANNER_PRESETS[0].accent);
  const [bannerSub, setBannerSub] = useState(BANNER_PRESETS[0].sub);
  const [bannerBg, setBannerBg] = useState<'network' | 'matrix' | 'blueprint' | 'noir' | 'case_file'>('network');
  const [bannerBusy, setBannerBusy] = useState(false);

  const applyPreset = (key: string) => {
    setBannerPreset(key);
    const p = BANNER_PRESETS.find(x => x.key === key);
    if (p && key !== 'custom') {
      setBannerHeadline(p.headline); setBannerAccent(p.accent); setBannerSub(p.sub);
    }
  };

  const pick = <T,>(arr: T[], avoid?: T): T => {
    if (arr.length <= 1) return arr[0];
    let v = arr[Math.floor(Math.random() * arr.length)];
    let guard = 0;
    while (v === avoid && guard++ < 6) v = arr[Math.floor(Math.random() * arr.length)];
    return v;
  };

  const shuffleField = (field: 'headline' | 'accent' | 'sub') => {
    setBannerPreset('custom');
    if (field === 'headline') setBannerHeadline(pick(HEADLINE_POOL, bannerHeadline));
    if (field === 'accent')   setBannerAccent(pick(ACCENT_POOL, bannerAccent));
    if (field === 'sub')      setBannerSub(pick(SUBLINE_POOL, bannerSub));
  };

  const shuffleAll = () => {
    setBannerPreset('custom');
    setBannerHeadline(pick(HEADLINE_POOL, bannerHeadline));
    setBannerAccent(pick(ACCENT_POOL, bannerAccent));
    setBannerSub(pick(SUBLINE_POOL, bannerSub));
    const bgs = ['network', 'matrix', 'blueprint', 'noir', 'case_file'] as const;
    setBannerBg(pick(bgs as any, bannerBg));
  };


  const BG_DESC: Record<string, string> = {
    network:   'dark charcoal background (#0a0a0a) with subtle amber/gold constellation network — thin connected dots and lines like a node graph, very faint',
    matrix:    'dark charcoal background with faint vertical amber matrix-rain code streams, subtle, low opacity',
    blueprint: 'dark charcoal background with faint amber blueprint grid lines, schematic ticks, technical drafting feel',
    noir:      'pure black background with a single hard amber rim light from upper right, cinematic shadow, near-empty',
    case_file: 'dark manila / charcoal background with redaction bars, case-file stamp marks in faint crimson, forensic dossier feel',
  };

  const generateBanner = async () => {
    if (!bannerHeadline.trim()) { toast({ title: 'Headline required' }); return; }
    setBannerBusy(true);
    try {
      const fullHeadline = bannerAccent
        ? `${bannerHeadline} ${bannerAccent}`
        : bannerHeadline;
      const prompt =
`LinkedIn banner image, 4:1 ultra-wide aspect ratio (1584 x 396 pixels), designed for the LinkedIn cover photo slot.

LAYOUT (CRITICAL — LinkedIn profile photo sits as a ~400px circle anchored at the BOTTOM-LEFT of this banner and overlaps the lower-left quadrant; ALL TYPOGRAPHY MUST AVOID THAT ZONE):
- Background fills the entire banner: ${BG_DESC[bannerBg]}
- RESERVED EMPTY ZONE: the entire LEFT 32% of the banner AND the bottom 60% of that left area must stay clean background — NO text, NO logo, NO key graphic elements there (this is where the profile photo will cover everything)
- Place ALL typography in the CENTER-RIGHT region of the banner, horizontally centered between roughly 38% and 92% of the width, vertically centered
- Headline is center-aligned within that right zone
- Big serif display headline in TWO COLORS on one or two lines:
  · "${bannerHeadline}" rendered in CRISP WHITE (#FFFFFF)
  · "${bannerAccent}" rendered in WARM AMBER GOLD (#E8A33D)
- Use a high-end serif similar to Fraunces / Playfair — bold, elegant, italic on the amber portion if natural
- Below the headline, smaller body line in light grey (#D4D4D4), sans-serif (Inter-like), max ~110 chars, also center-aligned in the right zone:
  "${bannerSub}"
- Tiny amber monospace eyebrow label above the headline (still in the right zone, center-aligned): "AETHERIS · BUSINESS FORENSICS"
- Bottom-right corner: small amber monospace watermark "aetheris.technology"

STYLE:
- Aetheris forensic brand: dark, editorial, investigative — never corporate-glossy, never AI-guru gradient, never neon
- High contrast typography, cinematic
- Text must be perfectly legible, NO spelling errors, NO duplicated letters, NO garbled glyphs
- Keep the left third visually quiet so the profile picture lands cleanly on top of background only


Exact text to render (do not change spelling):
HEADLINE WHITE: "${bannerHeadline}"
HEADLINE AMBER: "${bannerAccent}"
SUBLINE: "${bannerSub}"
EYEBROW: "AETHERIS · BUSINESS FORENSICS"
WATERMARK: "aetheris.technology"`;

      const { data, error } = await invoke({
        action: 'generate',
        prompt,
        model: 'google/gemini-3-pro-image-preview', // best for legible typography
        aetheris_style: false, // we already wrote brand styling in-prompt
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'LinkedIn banner generated', description: 'Saved to your library below.' });
      load();
    } catch (e: any) {
      toast({ title: 'Banner generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setBannerBusy(false);
    }
  };


  const invoke = async (body: Record<string, unknown>) => {
    const token = getAdminToken();
    return supabase.functions.invoke('admin-image-studio', {
      body, headers: token ? { 'x-admin-token': token } : {},
    });
  };

  const load = async () => {
    const { data, error } = await invoke({ action: 'list' });
    if (error) { toast({ title: 'Failed to load', description: error.message, variant: 'destructive' }); return; }
    if (data?.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
    setImages(data.images || []);
  };

  useEffect(() => { load(); }, []);

  const generate = async (opts: { aetherisStyle?: boolean; cartoon?: boolean } = {}) => {
    if (!prompt.trim()) { toast({ title: 'Enter a prompt' }); return; }
    setBusy(true);
    try {
      const { data, error } = await invoke({
        action: editTarget ? 'edit' : 'generate',
        prompt, model,
        source_image_url: editTarget?.url,
        aetheris_style: !!opts.aetherisStyle,
        cartoon_style: !!opts.cartoon,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: editTarget ? 'Image edited' : opts.aetherisStyle ? 'Image generated in Aetheris style' : opts.cartoon ? 'Editorial cartoon generated' : 'Image generated' });
      setPrompt('');
      setEditTarget(null);
      load();
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large (max 10MB)', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const base64 = btoa(bin);
      const { data, error } = await invoke({
        action: 'save_upload', filename: file.name, content_type: file.type || 'image/png', base64,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Image uploaded' });
      load();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    const { error, data } = await invoke({ action: 'delete', id });
    if (error || data?.error) {
      toast({ title: 'Delete failed', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    setImages(prev => prev.filter(i => i.id !== id));
  };

  const download = async (img: StudioImage) => {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aetheris-${img.id.slice(0, 8)}.${(img.url.split('.').pop() || 'png').split('?')[0]}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-amber" />
          <h2 className="text-xl font-bold text-foreground font-display">Image Studio</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Type a prompt and generate any image using AI. Upload your own, edit existing ones, and download anything you've made. Everything is saved.
        </p>

        {editTarget && (
          <div className="flex items-center gap-3 p-3 rounded-md border border-amber/30 bg-amber/5">
            <img src={editTarget.url} alt="" className="w-14 h-14 object-cover rounded" />
            <div className="flex-1 text-xs text-muted-foreground">
              <div className="font-bold text-foreground">Editing this image</div>
              <div className="line-clamp-1">{editTarget.prompt}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button>
          </div>
        )}

        <Textarea
          placeholder={editTarget
            ? "Describe how to edit it (e.g. make the background darker, add amber light)..."
            : "Describe the image you want (e.g. dark forensic case file with amber accents and a redacted header)..."}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <div className="flex flex-wrap gap-2 flex-1">
            <Button onClick={() => generate()} disabled={busy || !prompt.trim()} className="flex-1 min-w-[120px]">
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {editTarget ? 'Edit Image' : 'Generate'}
            </Button>
            {!editTarget && (
              <>
                <Button
                  onClick={() => generate({ aetherisStyle: true })}
                  disabled={busy || !prompt.trim()}
                  className="flex-1 min-w-[180px] bg-amber text-background hover:bg-amber/90"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Generate in Aetheris Style
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generate({ cartoon: true })}
                  disabled={busy || !prompt.trim()}
                  className="flex-1 min-w-[180px] border-amber/40 text-amber hover:bg-amber/10"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Editorial Cartoon
                </Button>
              </>
            )}
            <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
          </div>
        </div>
      </div>

      {/* LinkedIn Banner Creator */}
      <div className="glass p-6 rounded-xl space-y-4 border border-amber/20">
        <div className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-amber" />
          <h2 className="text-xl font-bold text-foreground font-display">LinkedIn Banner Creator</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber/70 ml-2">1584 × 396 · 4:1</span>
        </div>
        <p className="text-sm text-muted-foreground">
          One-click Aetheris-branded LinkedIn cover banners. Pick a hook, choose a background, generate. Lands in your library below at the right ratio.
        </p>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Hook preset</label>
          <select
            value={bannerPreset}
            onChange={e => applyPreset(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {BANNER_PRESETS.map(p => (
              <option key={p.key} value={p.key}>
                {p.key === 'custom' ? '— Custom (write your own)' : `${p.headline} ${p.accent}`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-foreground/70 font-mono">Headline (white)</label>
            <Input value={bannerHeadline} onChange={e => { setBannerHeadline(e.target.value); setBannerPreset('custom'); }} placeholder="Stop Guessing." />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Accent (amber)</label>
            <Input value={bannerAccent} onChange={e => { setBannerAccent(e.target.value); setBannerPreset('custom'); }} placeholder="Start Understanding." />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-foreground/70 font-mono">Subline</label>
          <Textarea
            rows={2}
            value={bannerSub}
            onChange={e => { setBannerSub(e.target.value); setBannerPreset('custom'); }}
            placeholder="One short line. Real numbers. Real fixes. No fluff."
            className="resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-amber font-mono">Background style</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['network', 'matrix', 'blueprint', 'noir', 'case_file'] as const).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setBannerBg(k)}
                className={`text-xs font-mono uppercase tracking-wider px-2 py-2 rounded-md border transition-colors ${
                  bannerBg === k
                    ? 'border-amber bg-amber/15 text-amber'
                    : 'border-border bg-background/50 text-muted-foreground hover:border-amber/40'
                }`}
              >
                {k.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={generateBanner}
          disabled={bannerBusy || !bannerHeadline.trim()}
          className="w-full bg-amber text-background hover:bg-amber/90"
        >
          {bannerBusy
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Painting banner (~30s)...</>
            : <><Linkedin className="w-4 h-4 mr-2" /> Generate LinkedIn Banner</>}
        </Button>
        <p className="text-[10px] text-muted-foreground/70 text-center">
          Uses Gemini 3 Pro for legible typography. Saved automatically — download from the library below.
        </p>
      </div>



      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber" /> Saved Images ({images.length})
          </h3>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
        </div>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No images yet. Generate or upload one above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-border bg-background/30">
                <img
                  src={img.url}
                  alt={img.prompt}
                  className="w-full h-44 object-cover cursor-zoom-in"
                  onClick={() => setPreview(img)}
                />
                <div className="p-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[2.5em]">{img.prompt || '(no prompt)'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase tracking-wider text-amber font-mono">{img.source}</span>
                    <span className="text-[9px] text-muted-foreground">{new Date(img.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <Button size="sm" variant="outline" onClick={() => setPreview(img)}>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditTarget(img); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <Wand2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(img)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(img.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl p-2 bg-background border-amber/30">
          {preview && (
            <div className="space-y-2">
              <img src={preview.url} alt={preview.prompt} className="w-full max-h-[80vh] object-contain rounded" />
              <div className="flex items-center justify-between gap-2 px-2 pb-1">
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{preview.prompt || '(no prompt)'}</p>
                <Button size="sm" variant="outline" onClick={() => download(preview)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminImageStudio;
