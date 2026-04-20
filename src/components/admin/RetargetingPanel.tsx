import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Facebook, Activity, Download, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react';

interface Settings {
  linkedin_partner_id: string | null;
  meta_pixel_id: string | null;
  google_ads_id: string | null;
  rb2b_script_id: string | null;
  enabled: boolean;
}

export const RetargetingPanel: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({
    linkedin_partner_id: '',
    meta_pixel_id: '',
    google_ads_id: '',
    rb2b_script_id: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('retargeting_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        setSettings({
          linkedin_partner_id: data.linkedin_partner_id || '',
          meta_pixel_id: data.meta_pixel_id || '',
          google_ads_id: data.google_ads_id || '',
          rb2b_script_id: data.rb2b_script_id || '',
          enabled: data.enabled || false,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('retargeting_settings')
      .update({
        linkedin_partner_id: settings.linkedin_partner_id || null,
        meta_pixel_id: settings.meta_pixel_id || null,
        google_ads_id: settings.google_ads_id || null,
        rb2b_script_id: settings.rb2b_script_id || null,
        enabled: settings.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Pixel settings updated. Reload site to apply.' });
    }
  };

  const downloadEmailList = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-retargeting-audience');
      if (error) throw error;
      const blob = new Blob([data as string], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retargeting-emails-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Export failed', description: String(e), variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="glass p-6 rounded-xl text-muted-foreground">Loading…</div>;

  const livePixels = [
    settings.linkedin_partner_id ? 'LinkedIn' : null,
    settings.meta_pixel_id ? 'Meta' : null,
    settings.rb2b_script_id ? 'RB2B' : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber" /> Retargeting Status
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {settings.enabled
                ? livePixels.length > 0
                  ? `Active — ${livePixels.join(', ')} firing on every page`
                  : 'Enabled but no pixel IDs configured'
                : 'Disabled — flip the switch below to start collecting audiences'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${settings.enabled && livePixels.length > 0 ? 'bg-amber/20 text-amber' : 'bg-muted text-muted-foreground'}`}>
            {settings.enabled && livePixels.length > 0 ? '● LIVE' : '○ OFF'}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="w-5 h-5 accent-amber"
          />
          <span className="text-sm text-foreground">Enable retargeting pixels site-wide</span>
        </label>
      </div>

      {/* Pixel IDs */}
      <div className="glass p-6 rounded-xl space-y-4">
        <h3 className="text-lg font-bold text-foreground font-display">Pixel IDs</h3>

        <PixelField
          icon={<Linkedin className="w-4 h-4 text-amber" />}
          label="LinkedIn Insight Tag — Partner ID"
          help="LinkedIn Campaign Manager → Account Assets → Insight Tag → Partner ID (e.g. 1234567)"
          docsUrl="https://www.linkedin.com/help/lms/answer/a427660"
          value={settings.linkedin_partner_id || ''}
          onChange={(v) => setSettings({ ...settings, linkedin_partner_id: v })}
          placeholder="1234567"
        />

        <PixelField
          icon={<Facebook className="w-4 h-4 text-amber" />}
          label="Meta Pixel ID"
          help="Meta Events Manager → Data Sources → Pixel ID (15-16 digit number)"
          docsUrl="https://www.facebook.com/business/help/952192354843755"
          value={settings.meta_pixel_id || ''}
          onChange={(v) => setSettings({ ...settings, meta_pixel_id: v })}
          placeholder="123456789012345"
        />

        <PixelField
          icon={<Sparkles className="w-4 h-4 text-amber" />}
          label="RB2B Script ID (Person/Company Identification)"
          help="RB2B → Settings → Install → copy the long ID from your script tag URL. Free up to 1k US visitors/mo."
          docsUrl="https://www.rb2b.com/"
          value={settings.rb2b_script_id || ''}
          onChange={(v) => setSettings({ ...settings, rb2b_script_id: v })}
          placeholder="ABCDE12345..."
        />

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>

      {/* Audience export */}
      <div className="glass p-6 rounded-xl">
        <h3 className="text-lg font-bold text-foreground font-display mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-amber" /> Email Match List
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          De-duplicated CSV of every email you've collected (contact submissions, assessment leads, diagnostic leads, subscribers). Upload to LinkedIn Matched Audiences, Meta Custom Audiences, or Google Customer Match.
        </p>
        <Button onClick={downloadEmailList} disabled={downloading} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Generating…' : 'Download CSV'}
        </Button>
      </div>

      {/* Suggested audiences */}
      <div className="glass p-6 rounded-xl">
        <h3 className="text-lg font-bold text-foreground font-display mb-4">Suggested Audiences</h3>
        <div className="space-y-3 text-sm">
          <AudienceRow label="🔥 Hot — Pricing/services viewers, no contact" filter="URL contains /services OR /why-us OR /capabilities — exclude conversions" />
          <AudienceRow label="🌡 Warm — Blog readers" filter="URL contains /blog" />
          <AudienceRow label="🧊 Cold — Homepage only" filter="URL equals / — exclude all other paths" />
          <AudienceRow label="🎯 Converters (lookalike seed)" filter="URL contains /checkout/return OR /contact" />
        </div>
      </div>

      {/* Setup checklist */}
      <div className="glass p-6 rounded-xl">
        <h3 className="text-lg font-bold text-foreground font-display mb-4">Setup Checklist</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Create a LinkedIn Campaign Manager account, install Insight Tag, paste Partner ID above</li>
          <li>Create a Meta Business account, create a Pixel, paste Pixel ID above</li>
          <li>(Optional) Sign up for RB2B free tier, paste Script ID above</li>
          <li>Toggle "Enable retargeting pixels" ON and Save</li>
          <li>Build the Suggested Audiences listed above in each ad platform</li>
          <li>Download the Email Match List CSV and upload as a Custom Audience</li>
          <li>Launch a $20–50/day Sponsored Content / Boosted Post targeting non-converters</li>
        </ol>
      </div>
    </div>
  );
};

const PixelField: React.FC<{
  icon: React.ReactNode;
  label: string;
  help: string;
  docsUrl: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ icon, label, help, docsUrl, value, onChange, placeholder }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        {icon} {label}
        {value ? <CheckCircle2 className="w-3 h-3 text-amber" /> : <AlertCircle className="w-3 h-3 text-muted-foreground" />}
      </label>
      <a href={docsUrl} target="_blank" rel="noreferrer" className="text-xs text-amber hover:underline flex items-center gap-1">
        Docs <ExternalLink className="w-3 h-3" />
      </a>
    </div>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    <p className="text-xs text-muted-foreground mt-1">{help}</p>
  </div>
);

const AudienceRow: React.FC<{ label: string; filter: string }> = ({ label, filter }) => (
  <div className="bg-secondary/40 p-3 rounded-lg">
    <div className="font-medium text-foreground">{label}</div>
    <code className="text-xs text-muted-foreground font-mono">{filter}</code>
  </div>
);
