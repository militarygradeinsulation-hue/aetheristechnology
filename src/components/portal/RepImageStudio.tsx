import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Upload, Download, Trash2, Wand2, ImageIcon, RefreshCw, Maximize2, BarChart3, Share2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';

interface StudioImage {
  id: string;
  prompt: string;
  url: string;
  source: 'generated' | 'uploaded' | 'edited' | string;
  model: string | null;
  created_at: string;
}

const MODELS = [
  { key: 'google/gemini-3.1-flash-image-preview', label: 'Fast (high quality)' },
  { key: 'google/gemini-2.5-flash-image', label: 'Standard' },
  { key: 'google/gemini-3-pro-image-preview', label: 'Best (slower)' },
];

const PROMPT_STARTERS: { label: string; prompt: string; infographic?: boolean }[] = [
  { label: '5 ways your business is leaking', prompt: '5 ways small business owners are silently losing $50k+ a year — show each leak as a forensic case-file fragment with a $ amount.', infographic: true },
  { label: 'Before / After Leak Audit', prompt: 'Before and after the Leak Audit — left side: chaotic dashboard bleeding red. Right side: clean, profitable, amber-lit operation.', infographic: true },
  { label: 'Forensic dashboard hero', prompt: 'A dramatic forensic business dashboard with redacted bars, glowing amber metrics, and a single crimson "ACTIVE LEAK" stamp.' },
  { label: '7-step Leak Audit infographic', prompt: 'The 7-step Leak Audit methodology shown as numbered evidence cards laid on a dark dossier desk.', infographic: true },
];

export const RepImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0].key);
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<StudioImage[]>([]);
  const [editTarget, setEditTarget] = useState<StudioImage | null>(null);
  const [preview, setPreview] = useState<StudioImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);

  const invoke = async (body: Record<string, unknown>) => {
    const token = getPortalToken();
    return supabase.functions.invoke('portal-image-studio', {
      body, headers: token ? { 'x-portal-token': token } : {},
    });
  };

  const load = async () => {
    const { data, error } = await invoke({ action: 'list' });
    if (error) { toast({ title: 'Failed to load', description: error.message, variant: 'destructive' }); return; }
    if (data?.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
    setImages(data.images || []);
  };

  useEffect(() => { load(); }, []);

  const generate = async (opts: { aetherisStyle?: boolean; infographic?: boolean } = {}) => {
    if (!prompt.trim()) { toast({ title: 'Enter a prompt' }); return; }
    setBusy(true);
    try {
      const { data, error } = await invoke({
        action: editTarget ? 'edit' : 'generate',
        prompt, model,
        source_image_url: editTarget?.url,
        aetheris_style: !!opts.aetherisStyle,
        infographic: !!opts.infographic,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: editTarget ? 'Image edited' : opts.infographic ? 'Infographic ready' : 'Image generated' });
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

  const copyLink = async (img: StudioImage) => {
    try {
      await navigator.clipboard.writeText(img.url);
      toast({ title: 'Link copied', description: 'Paste it into a DM or email to your lead.' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-amber" />
          <h2 className="text-xl font-bold text-foreground font-display">Art Studio</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate on-brand images and infographics to send your leads. Anything you make is saved here — download or copy a link to share.
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
            ? 'Describe how to edit it (e.g. make the background darker, add amber light)...'
            : 'Describe the image (e.g. an infographic showing the 5 hidden leaks in a service business)...'}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />

        {!editTarget && (
          <div className="flex flex-wrap gap-2">
            {PROMPT_STARTERS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPrompt(p.prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/40 text-muted-foreground hover:text-amber hover:border-amber/50 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

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
                  Aetheris Style
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generate({ infographic: true, aetherisStyle: true })}
                  disabled={busy || !prompt.trim()}
                  className="flex-1 min-w-[160px]"
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />}
                  Make Infographic
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

      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber" /> Your Images ({images.length})
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
                <div className="absolute inset-0 bg-background/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
                  <Button size="sm" variant="outline" onClick={() => setPreview(img)}>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditTarget(img); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <Wand2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(img)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(img)}>
                    <Share2 className="w-3.5 h-3.5" />
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyLink(preview)}>
                    <Share2 className="w-3.5 h-3.5 mr-1" /> Copy link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(preview)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RepImageStudio;
