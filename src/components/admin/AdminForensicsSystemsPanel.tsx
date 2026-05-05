import { useState } from 'react';
import { ChevronLeft, Loader2, Download, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FORENSICS_SYSTEMS, ForensicsSystem } from '@/lib/forensicsSystems';
import { downloadForensicsPlaybookPdf } from '@/lib/generateForensicsPdf';

export function AdminForensicsSystemsPanel() {
  const [active, setActive] = useState<ForensicsSystem | null>(null);
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillUrl, setAutofillUrl] = useState('');
  const [result, setResult] = useState<{ markdown: string; title: string } | null>(null);

  const open = (sys: ForensicsSystem) => {
    setActive(sys);
    setIntake({});
    setAutofillUrl('');
    setResult(null);
  };

  const autofillFromUrl = async () => {
    if (!active) return;
    const url = autofillUrl.trim();
    if (!url) {
      toast({ title: 'Enter a URL first', variant: 'destructive' });
      return;
    }
    setAutofilling(true);
    try {
      const fieldsSpec = active.intake.map(f => ({ name: f.name, label: f.label, type: f.type }));
      const { data, error } = await supabase.functions.invoke('autofill-intake-from-url', {
        body: { url, fields: fieldsSpec, toolTitle: active.title },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const filled = data?.values || {};
      setIntake(prev => {
        const next = { ...prev };
        for (const k of Object.keys(filled)) {
          const v = filled[k];
          if (v != null && String(v).trim() && !next[k]?.trim()) next[k] = String(v);
        }
        return next;
      });
      toast({ title: 'Autofilled', description: `Pulled ${Object.keys(filled).length} fields from ${url}` });
    } catch (e: unknown) {
      toast({ title: 'Autofill failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setAutofilling(false);
    }
  };

  const submit = async () => {
    if (!active) return;
    for (const f of active.intake) {
      if (f.required && !intake[f.name]?.trim()) {
        toast({ title: 'Missing field', description: f.label, variant: 'destructive' });
        return;
      }
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-run-system', {
        body: { priceId: active.priceId, intake },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({ markdown: data.markdown, title: data.title });
    } catch (e: unknown) {
      toast({ title: 'Generation failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result || !active) return;
    downloadForensicsPlaybookPdf({
      title: result.title,
      toolLabel: active.title,
      markdown: result.markdown,
    });
  };

  if (!active) {
    const tiers = Array.from(new Set(FORENSICS_SYSTEMS.map(s => s.tier)));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Forensics Systems</h2>
          <span className="text-xs text-muted-foreground ml-2">Public checkout disabled — admin-only access, runs free, no Stripe</span>
        </div>
        {tiers.map(tier => (
          <div key={tier}>
            <h3 className="text-sm font-mono uppercase text-muted-foreground mb-2">{tier}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FORENSICS_SYSTEMS.filter(s => s.tier === tier).map(sys => (
                <button
                  key={sys.priceId}
                  onClick={() => open(sys)}
                  className="glass p-4 rounded-xl text-left border border-border hover:border-amber/50 transition-colors"
                >
                  <div className="font-bold text-foreground font-display">{sys.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{sys.intake.length} intake fields</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => { setActive(null); setResult(null); }}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Systems
      </Button>
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">{active.title}</h2>
        <p className="text-sm text-muted-foreground">{active.tier}</p>
      </div>

      {!result && (
        <div className="glass p-6 rounded-xl space-y-4 max-w-2xl">
          <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-amber">Autofill from URL</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={autofillUrl}
                onChange={e => setAutofillUrl(e.target.value)}
                placeholder="https://company.com — AI scrapes & fills the rest"
              />
              <Button onClick={autofillFromUrl} disabled={autofilling} variant="outline" size="sm" className="shrink-0">
                {autofilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1" />Autofill</>}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Only fills empty fields. Edit anything after.</p>
          </div>
          {active.intake.map(field => (
            <div key={field.name} className="space-y-1">
              <Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={intake[field.name] || ''}
                  onChange={e => setIntake({ ...intake, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  type={field.type}
                  value={intake[field.name] || ''}
                  onChange={e => setIntake({ ...intake, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : 'Generate Deliverable'}
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={download} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Download .md
            </Button>
            <Button onClick={() => { setResult(null); }} variant="ghost" size="sm">Run again</Button>
          </div>
          <div className="glass p-6 rounded-xl prose prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
            {result.markdown}
          </div>
        </div>
      )}
    </div>
  );
}
