import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { MasterControls } from './campaign/MasterControls';
import { SenderIdentity } from './campaign/SenderIdentity';
import { LinksLibrary, LinkItem } from './campaign/LinksLibrary';
import { ImageGenerator } from './campaign/ImageGenerator';
import { PlaybookAttachments } from './campaign/PlaybookAttachments';
import { TemplateEditor } from './campaign/TemplateEditor';
import { CampaignActivity } from '@/components/CampaignActivity';

interface Settings {
  is_active: boolean;
  daily_limit: number;
  from_name: string;
  from_email: string;
  signature_html: string;
  default_links: LinkItem[];
}

const DEFAULTS: Settings = {
  is_active: false,
  daily_limit: 100,
  from_name: '',
  from_email: '',
  signature_html: '',
  default_links: [],
};

export const CampaignControlCenter: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState({ send: false, generate: false });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('campaign_settings').select('*').eq('id', 1).maybeSingle();
    if (error) toast({ title: 'Failed to load settings', description: error.message, variant: 'destructive' });
    if (data) {
      setSettings({
        is_active: data.is_active,
        daily_limit: data.daily_limit,
        from_name: data.from_name,
        from_email: data.from_email,
        signature_html: data.signature_html,
        default_links: (data.default_links as unknown as LinkItem[]) || [],
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = (p: Partial<Settings>) => setSettings(prev => ({ ...prev, ...p }));

  const persist = async (overrides?: Partial<Settings>) => {
    const next = { ...settings, ...(overrides || {}) };
    const { error } = await supabase.from('campaign_settings').update({
      is_active: next.is_active,
      daily_limit: next.daily_limit,
      from_name: next.from_name,
      from_email: next.from_email,
      signature_html: next.signature_html,
      default_links: next.default_links as unknown as never,
    }).eq('id', 1);
    if (error) throw error;
    setSettings(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await persist();
      toast({ title: 'Saved', description: 'Campaign settings updated.' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendBatch = async () => {
    setBusy(b => ({ ...b, send: true }));
    try {
      // Auto-activate so the send is not silently blocked by the paused flag.
      if (!settings.is_active) await persist({ is_active: true });
      const { data, error } = await supabase.functions.invoke('process-drip', { body: {} });
      if (error) throw error;
      toast({ title: 'Batch processed', description: data?.message || data?.error || 'Done' });
    } catch (e) {
      toast({ title: 'Send failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(b => ({ ...b, send: false }));
    }
  };

  const generateWave = async () => {
    setBusy(b => ({ ...b, generate: true }));
    try {
      const { data, error } = await supabase.functions.invoke('generate-drip-batch', { body: { batchSize: 10 } });
      if (error) throw error;
      toast({ title: 'Wave generated', description: data?.message || data?.error || 'Done' });
    } catch (e) {
      toast({ title: 'Generation failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(b => ({ ...b, generate: false }));
    }
  };

  if (loading) {
    return <div className="glass p-12 rounded-xl flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading campaign control center...</div>;
  }

  return (
    <div className="space-y-6">
      <MasterControls
        settings={{ is_active: settings.is_active, daily_limit: settings.daily_limit }}
        onChange={patch}
        onSave={save}
        saving={saving}
        onSendBatch={sendBatch}
        onGenerateWave={generateWave}
        busy={busy}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SenderIdentity
          fromName={settings.from_name}
          fromEmail={settings.from_email}
          signatureHtml={settings.signature_html}
          onChange={patch}
        />
        <LinksLibrary
          links={settings.default_links}
          onChange={(default_links) => patch({ default_links })}
        />
      </div>

      <ImageGenerator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaybookAttachments />
        <TemplateEditor />
      </div>

      <div>
        <h3 className="text-lg font-bold text-foreground font-display mb-3">Live Activity</h3>
        <CampaignActivity />
      </div>
    </div>
  );
};
