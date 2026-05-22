import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Upload, Download, Trash2, Wand2, ImageIcon, RefreshCw, Maximize2, X, Linkedin } from 'lucide-react';
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
