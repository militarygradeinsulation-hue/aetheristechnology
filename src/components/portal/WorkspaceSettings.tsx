import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { getRepSettings, saveRepSettings } from '@/lib/portalWorkspace';

const FIELDS: { key: string; label: string; placeholder: string; type?: 'textarea' }[] = [
  { key: 'business_name', label: 'Default business / target name', placeholder: 'e.g. Acme Plumbing' },
  { key: 'industry', label: 'Default industry', placeholder: 'e.g. Home services' },
  { key: 'target_audience', label: 'Target audience', placeholder: 'Owners doing $1M-$5M' },
  { key: 'tone', label: 'Default tone', placeholder: 'Direct, no fluff' },
  { key: 'sender_name', label: 'Your name (sender)', placeholder: 'Joseph T.' },
  { key: 'sender_title', label: 'Your title', placeholder: 'Business Forensics Operator' },
  { key: 'cta_link', label: 'Default CTA link', placeholder: 'https://aetheris.technology/leak-audit' },
  { key: 'signature', label: 'Email signature', placeholder: 'Joseph T. — aetheris.technology', type: 'textarea' },
];

export const WorkspaceSettings: React.FC = () => {
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getRepSettings();
        setDefaults((s.defaults || {}) as Record<string, string>);
      } catch (e: any) {
        toast({ title: 'Failed to load settings', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k: string, v: string) => setDefaults(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRepSettings(defaults);
      toast({ title: 'Settings saved', description: 'These will auto-fill your tool inputs.' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass p-12 rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto" />
      </div>
    );
  }

  return (
    <div className="glass p-6 rounded-lg border border-border space-y-4 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-foreground font-display">Your defaults</h3>
        <p className="text-sm text-muted-foreground">
          These values pre-fill the tools (Sales Scripts, Follow-Up, Strategic Questions, etc.) so you don't retype them every time.
        </p>
      </div>
      <div className="space-y-3">
        {FIELDS.map(f => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            {f.type === 'textarea' ? (
              <Textarea
                value={defaults[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
              />
            ) : (
              <Input
                value={defaults[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
        Save settings
      </Button>
    </div>
  );
};
