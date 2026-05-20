import { useState } from 'react';
import { ChevronLeft, Loader2, Download, Sparkles, Wand2, Send, Copy, Check, Eraser, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { FORENSICS_SYSTEMS, ForensicsSystem } from '@/lib/forensicsSystems';
import { downloadForensicsPlaybookPdf } from '@/lib/generateForensicsPdf';
import { getAdminToken } from '@/lib/adminAuth';

export function AdminForensicsSystemsPanel() {
  const [active, setActive] = useState<ForensicsSystem | null>(null);
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillUrl, setAutofillUrl] = useState('');
  const [result, setResult] = useState<{ markdown: string; title: string } | null>(null);

  // Package-for-lead state
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageExcerpt, setPackageExcerpt] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadContext, setLeadContext] = useState('');
  const [packageExtra, setPackageExtra] = useState('');
  const [packaging, setPackaging] = useState(false);
  const [packageResult, setPackageResult] = useState<{ polished: string; email: { subject: string; body: string } } | null>(null);
  const [copied, setCopied] = useState<string>('');

  // Simplify (plain-English) state
  const [simplifying, setSimplifying] = useState(false);
  const [simplified, setSimplified] = useState<string>('');

  const runSimplify = async (source: string) => {
    if (!active) return;
    if (!source || source.trim().length < 40) {
      toast({ title: 'Need more source content', variant: 'destructive' });
      return;
    }
    setSimplifying(true);
    setSimplified('');
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('forensics-simplify', {
        body: { source, toolLabel: active.title },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSimplified(data.simplified || '');
      toast({ title: 'Plain-English version ready' });
    } catch (e: unknown) {
      toast({ title: 'Simplify failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSimplifying(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
    toast({ title: 'Copied' });
  };

  const open = (sys: ForensicsSystem) => {
    setActive(sys);
    setIntake({});
    setAutofillUrl('');
    setResult(null);
    setPackageOpen(false);
    setPackageResult(null);
    setSimplified('');
  };

  const autofillFromUrl = async () => {
    if (!active) return;
    const url = autofillUrl.trim();
    if (!url) { toast({ title: 'Enter a URL first', variant: 'destructive' }); return; }
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
    setPackageResult(null);
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

  const runPackage = async () => {
    if (!result || !active) return;
    const source = (packageExcerpt.trim() || result.markdown).trim();
    if (source.length < 40) { toast({ title: 'Need more source content', variant: 'destructive' }); return; }
    setPackaging(true);
    setPackageResult(null);
    try {
      const adminToken = getAdminToken();
      const { data, error } = await supabase.functions.invoke('forensics-lead-package', {
        body: {
          source,
          toolLabel: active.title,
          leadName: leadName.trim(),
          leadCompany: leadCompany.trim(),
          leadContext: leadContext.trim(),
          extraPrompt: packageExtra.trim(),
        },
        headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPackageResult({ polished: data.polished || '', email: data.email || { subject: '', body: '' } });
      toast({ title: 'Lead package ready' });
    } catch (e: unknown) {
      toast({ title: 'Package failed', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setPackaging(false);
    }
  };

  if (!active) {
    const tiers = Array.from(new Set(FORENSICS_SYSTEMS.map(s => s.tier)));
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Forensics Systems</h2>
          <span className="text-xs text-muted-foreground ml-2">Public checkout disabled, admin-only access, runs free, no Stripe</span>
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
      <Button variant="ghost" size="sm" onClick={() => { setActive(null); setResult(null); setPackageResult(null); }}>
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
                placeholder="https://company.com, AI scrapes & fills the rest"
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={download} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Download Playbook PDF
            </Button>
            <Button
              onClick={() => setPackageOpen(o => !o)}
              size="sm"
              className="bg-gradient-to-r from-amber to-orange-500 text-background hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-1" /> {packageOpen ? 'Close lead package' : 'Package for a lead'}
            </Button>
            <Button onClick={() => { setResult(null); setPackageResult(null); setPackageOpen(false); }} variant="ghost" size="sm">Run again</Button>
          </div>

          {packageOpen && (
            <div className="glass p-5 rounded-xl border border-amber/40 space-y-3">
              <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Package for a lead</div>
              <p className="text-xs text-muted-foreground">
                Optionally paste the exact section you want to send (or leave blank to use the full report). I'll rewrite it in polished Aetheris deliverable style AND draft an email in Joseph's forensic comment voice.
              </p>
              <Textarea
                rows={5}
                placeholder="Optional: paste the specific section you want sent. Blank = use the full report above."
                value={packageExcerpt}
                onChange={(e) => setPackageExcerpt(e.target.value)}
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder="Lead first name (optional)" value={leadName} onChange={(e) => setLeadName(e.target.value)} />
                <Input placeholder="Lead company (optional)" value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} />
              </div>
              <Textarea
                rows={2}
                placeholder="What you know about this lead (industry, pain, prior convo)…"
                value={leadContext}
                onChange={(e) => setLeadContext(e.target.value)}
              />
              <Input
                placeholder="Extra direction (e.g. 'Hit follow-up failure hard. Push for a 20-min diagnostic call.')"
                value={packageExtra}
                onChange={(e) => setPackageExtra(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={runPackage} disabled={packaging} className="bg-amber text-background hover:bg-amber/90">
                  {packaging ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  {packaging ? 'Rewriting & drafting email…' : 'Build lead package'}
                </Button>
                {(packageExcerpt || leadName || leadCompany || leadContext || packageExtra) && (
                  <Button variant="ghost" onClick={() => { setPackageExcerpt(''); setLeadName(''); setLeadCompany(''); setLeadContext(''); setPackageExtra(''); }}>
                    <Eraser className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {packageResult && (
                <div className="space-y-4 pt-3 border-t border-border">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Polished Aetheris Section</div>
                      <Button variant="outline" size="sm" onClick={() => copy(packageResult.polished, 'polished')} className="h-7 text-[10px]">
                        {copied === 'polished' ? <><Check className="w-3 h-3 mr-1" /> Copied</> : <><Copy className="w-3 h-3 mr-1" /> Copy</>}
                      </Button>
                    </div>
                    <div className="bg-background/40 border border-border rounded p-4 text-sm whitespace-pre-wrap text-foreground/90 max-h-96 overflow-y-auto">
                      {packageResult.polished}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-amber">Email to Lead (Joseph's voice)</div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => copy(packageResult.email.subject, 'subj')} className="h-7 text-[10px]">
                          {copied === 'subj' ? <Check className="w-3 h-3" /> : 'Copy subject'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copy(packageResult.email.body, 'body')} className="h-7 text-[10px]">
                          {copied === 'body' ? <Check className="w-3 h-3" /> : 'Copy body'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copy(`Subject: ${packageResult.email.subject}\n\n${packageResult.email.body}`, 'both')} className="h-7 text-[10px]">
                          {copied === 'both' ? <Check className="w-3 h-3" /> : 'Copy both'}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-background/40 border border-border rounded p-4 text-sm space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Subject</div>
                        <div className="text-foreground font-semibold">{packageResult.email.subject}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Body</div>
                        <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{packageResult.email.body}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="glass p-6 rounded-xl prose prose-invert max-w-none whitespace-pre-wrap text-sm text-foreground">
            {result.markdown}
          </div>
        </div>
      )}
    </div>
  );
}
