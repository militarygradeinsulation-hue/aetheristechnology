import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PlaybookFile { name: string; url: string; assetId?: string; attached: boolean; }

export const PlaybookAttachments: React.FC = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<PlaybookFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: list, error } = await supabase.storage.from('playbooks').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) throw error;
      const pdfs = (list || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));

      const { data: assets } = await supabase.from('campaign_assets').select('id,url,is_attached').eq('type', 'playbook');
      const assetByUrl = new Map((assets || []).map(a => [a.url, a]));

      const enriched = pdfs.map(f => {
        const { data: pub } = supabase.storage.from('playbooks').getPublicUrl(f.name);
        const asset = assetByUrl.get(pub.publicUrl);
        return { name: f.name, url: pub.publicUrl, assetId: asset?.id, attached: asset?.is_attached || false };
      });
      setFiles(enriched);
    } catch (e) {
      toast({ title: 'Failed to load playbooks', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (f: PlaybookFile, value: boolean) => {
    if (f.assetId) {
      await supabase.from('campaign_assets').update({ is_attached: value }).eq('id', f.assetId);
    } else {
      await supabase.from('campaign_assets').insert({ type: 'playbook', name: f.name, url: f.url, is_attached: value });
    }
    load();
  };

  const copyLink = (f: PlaybookFile) => {
    const html = `<a href="${f.url}" style="color:#f59e0b;">${f.name}</a>`;
    navigator.clipboard.writeText(html);
    toast({ title: 'Playbook link copied' });
  };

  return (
    <div className="glass p-6 rounded-xl space-y-3">
      <div>
        <h3 className="text-lg font-bold text-foreground font-display">Playbook Attachments</h3>
        <p className="text-xs text-muted-foreground">Toggle which PDFs auto-attach to the next generated batch.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No playbooks in storage yet.</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.name} className="flex items-center justify-between gap-3 p-3 bg-secondary/40 rounded-lg">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-amber shrink-0" />
                <span className="text-sm text-foreground truncate">{f.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => copyLink(f)}><Copy className="w-4 h-4" /></Button>
                <Switch checked={f.attached} onCheckedChange={(v) => toggle(f, v)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
