import { useState } from 'react';
import { ChevronLeft, Loader2, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FORENSICS_SYSTEMS, ForensicsSystem } from '@/lib/forensicsSystems';

export function AdminForensicsSystemsPanel() {
  const [active, setActive] = useState<ForensicsSystem | null>(null);
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ markdown: string; title: string } | null>(null);

  const open = (sys: ForensicsSystem) => {
    setActive(sys);
    setIntake({});
    setResult(null);
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
    if (!result) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!active) {
    const tiers = Array.from(new Set(FORENSICS_SYSTEMS.map(s => s.tier)));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Forensics Systems</h2>
          <span className="text-xs text-muted-foreground ml-2">Admin access — runs free, no Stripe</span>
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
