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
import { LeadsManager } from './campaign/LeadsManager';
import { CampaignActivity } from '@/components/CampaignActivity';
import { FailedSends } from './campaign/FailedSends';

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
  const [busy, setBusy] = useState({ send: false, generate: false, replies: false });

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

      let totalSent = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      let lastMessage = '';
      let stopReason = '';

      // Hard safety cap on iterations so we cannot infinite-loop.
      const MAX_ITERATIONS = 25;

      const parseCounts = (msg: string) => {
        const m = msg.match(/(\d+)\s+sent,\s+(\d+)\s+skipped,\s+(\d+)\s+failed/i);
        if (!m) return null;
        return { sent: Number(m[1]), skipped: Number(m[2]), failed: Number(m[3]) };
      };

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const { data, error } = await supabase.functions.invoke('process-drip', { body: {} });
        if (error) throw error;
        const msg: string = data?.message || '';
        lastMessage = msg;

        const lower = msg.toLowerCase();

        if (lower.includes('daily limit reached') || lower.includes('campaign is paused')) {
          stopReason = msg;
          break;
        }

        const counts = parseCounts(msg);
        if (counts) {
          totalSent += counts.sent;
          totalSkipped += counts.skipped;
          totalFailed += counts.failed;
          // If we got 0 sent and 0 skipped from a non-empty pass, stop to avoid spinning.
          if (counts.sent === 0 && counts.skipped === 0 && counts.failed === 0) {
            stopReason = msg;
            break;
          }
          // Otherwise continue immediately to drain more due emails.
          continue;
        }

        if (lower.includes('no pending emails')) {
          // Generate a fresh wave from imported prospects and try again.
          const gen = await supabase.functions.invoke('generate-drip-batch', { body: { batchSize: 10 } });
          if (gen.error) throw gen.error;
          const genMsg: string = gen.data?.message || '';
          const genLower = genMsg.toLowerCase();
          // If generation produced nothing new, stop.
          if (
            genLower.includes('no prospects') ||
            genLower.includes('no new prospects') ||
            genLower.includes('0 emails generated') ||
            genLower.includes('generated 0')
          ) {
            stopReason = `No more leads to send. ${genMsg}`.trim();
            break;
          }
          // Loop again to send the freshly generated wave.
          continue;
        }

        // Unknown response — stop and surface it.
        stopReason = msg || 'Unknown response';
        break;
      }

      const summary = `Sent ${totalSent}, skipped ${totalSkipped}, failed ${totalFailed}. ${stopReason || lastMessage}`.trim();
      toast({ title: 'Batch complete', description: summary });
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

  const checkReplies = async () => {
    setBusy(b => ({ ...b, replies: true }));
    try {
      const { data, error } = await supabase.functions.invoke('handle-drip-replies', { body: {} });
      if (error) throw error;
      toast({ title: 'Inbox scanned', description: data?.message || 'Done' });
    } catch (e) {
      toast({ title: 'Reply check failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(b => ({ ...b, replies: false }));
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
        onCheckReplies={checkReplies}
        busy={busy}
      />

      <LeadsManager />

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

      <FailedSends />

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
