import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Asset { id: string; name: string; url: string; created_at: string; }

export const ImageGenerator: React.FC = () => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Asset[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('campaign_assets')
      .select('id,name,url,created_at')
      .eq('type', 'image')
      .order('created_at', { ascending: false })
      .limit(24);
    setImages((data || []) as Asset[]);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('campaign-image-generator', { body: { prompt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Image generated', description: 'Saved to your library.' });
      setPrompt('');
      load();
    } catch (e) {
      toast({ title: 'Generation failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyTag = (img: Asset) => {
    const html = `<img src="${img.url}" alt="${img.name}" style="max-width:100%;border-radius:8px;" />`;
    navigator.clipboard.writeText(html);
    toast({ title: 'Image tag copied' });
  };

  const remove = async (id: string) => {
    await supabase.from('campaign_assets').delete().eq('id', id);
    load();
  };

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground font-display">AI Image Generator</h3>
        <p className="text-xs text-muted-foreground">Generate branded images for emails. Click any image to copy its tag.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="e.g. dark abstract gradient with gold particles"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && generate()}
        />
        <Button onClick={generate} disabled={busy || !prompt.trim()}>
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Generate
        </Button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={img.url} alt={img.name} className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" onClick={() => copyTag(img)}><Copy className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => remove(img.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <p className="text-[10px] text-muted-foreground p-1 truncate">{img.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No images generated yet.</p>
      )}
    </div>
  );
};
