import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Globe, AlertTriangle, Shield, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { QuickDownloadBar } from './QuickDownloadBar';
import { isPortalSession } from '@/lib/portalWorkspace';

const PHASES = [
  { label: 'Scraping your website...', target: 15 },
  { label: 'Extracting brand signals...', target: 35 },
  { label: 'Analyzing message vs. visual identity...', target: 55 },
  { label: 'Scanning tone, pricing, and process signals...', target: 75 },
  { label: 'Building contradiction report...', target: 98 },
];

const PERCEPTION_OPTIONS = ['Premium', 'Trustworthy', 'Fast', 'Innovative', 'Family-Owned', 'Elite', 'Simple', 'Warm', 'Authoritative', 'Modern', 'Consultative', 'Reliable'];

const SEVERITY_COLORS: Record<string, string> = { critical: 'text-red-400 bg-red-500/20', high: 'text-amber bg-amber/20', moderate: 'text-primary bg-primary/20' };

export const BrandContradictionFinder: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ url: '', socialLinks: '', idealCustomer: '', desiredPerception: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePerception = (p: string) => {
    setForm(prev => ({ ...prev, desiredPerception: prev.desiredPerception.includes(p) ? prev.desiredPerception.filter(x => x !== p) : [...prev.desiredPerception, p] }));
  };

  const handleGenerate = async () => {
    if (!form.url || !form.idealCustomer || !form.desiredPerception.length) {
      toast({ title: 'Missing fields', description: 'URL, ideal customer, and at least one perception are required.', variant: 'destructive' }); return;
    }
    setLoading(true); setProgress(0); setResult(null);
    let phase = 0;
    const interval = setInterval(() => { if (phase < PHASES.length) { const p = PHASES[phase]; setPhaseLabel(p.label); setProgress(prev => Math.min(prev + Math.random() * 8 + 4, p.target)); phase++; } }, 4000);
    try {
      const { data, error } = await supabase.functions.invoke('generate-brand-contradictions', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed to analyze');
      setProgress(100); setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode || isPortalSession()) {
        saveToolRun({
          tool_type: 'brand_contradictions',
          title: `${form.url} — Brand audit — ${new Date().toLocaleDateString()}`,
          input_data: form,
          output_data: data,
        }).catch(e => console.error('Library save failed:', e));
      }
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false); setProgress(0);
    }
  };

  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); toast({ title: 'Copied!' }); };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6"><Globe className="w-6 h-6 text-amber" /><h2 className="text-2xl font-bold text-foreground font-display">Your Brand Details</h2></div>
          <div className="space-y-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Website URL *</label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://yourbusiness.com" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Social Links (optional)</label><Input value={form.socialLinks} onChange={e => setForm(p => ({ ...p, socialLinks: e.target.value }))} placeholder="LinkedIn, Facebook, Instagram URLs" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Describe Your Ideal Customer *</label><Textarea value={form.idealCustomer} onChange={e => setForm(p => ({ ...p, idealCustomer: e.target.value }))} placeholder="Who are you trying to attract? Be specific." rows={3} /></div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">How do you WANT to be perceived? *</label>
              <div className="flex flex-wrap gap-2">{PERCEPTION_OPTIONS.map(p => (<button key={p} onClick={() => togglePerception(p)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.desiredPerception.includes(p) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{p}</button>))}</div>
            </div>
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8">Analyze Brand</Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <p className="text-amber font-semibold mb-4">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-8">
          {/* Score */}
          <div className="glass rounded-xl p-8 border border-border text-center">
            <h2 className="text-2xl font-bold text-foreground font-display mb-2">Brand Alignment Score</h2>
            <div className={`text-6xl font-bold font-display mb-2 ${(result.contradictionScore || 0) >= 70 ? 'text-green-400' : (result.contradictionScore || 0) >= 40 ? 'text-amber' : 'text-red-400'}`}>{result.contradictionScore || 0}<span className="text-2xl text-muted-foreground">/100</span></div>
            <p className="text-muted-foreground max-w-xl mx-auto">{result.overallAssessment}</p>
          </div>

          {/* Contradictions */}
          <div>
            <h3 className="text-xl font-bold text-foreground font-display mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber" /> Brand Contradictions</h3>
            <div className="space-y-4">
              {result.contradictions?.map((c: any, i: number) => {
                const visible = unlocked || i < 2;
                return (
                  <div key={i} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
                    {!visible && <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-bold text-foreground">{c.title}</h4>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.moderate}`}>{c.severity}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{c.description}</p>
                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <div className="bg-red-500/5 rounded-lg p-3"><p className="text-[10px] font-bold text-red-400 uppercase mb-1">Emotional Impact</p><p className="text-xs text-muted-foreground">{c.emotionalImpact}</p></div>
                      <div className="bg-amber/5 rounded-lg p-3"><p className="text-[10px] font-bold text-amber uppercase mb-1">Buyer Perception</p><p className="text-xs text-muted-foreground">{c.buyerPerception}</p></div>
                    </div>
                    {visible && c.recommendedFix && (<div className="bg-primary/5 rounded-lg p-3 mb-3"><p className="text-[10px] font-bold text-primary uppercase mb-1">Recommended Fix</p><p className="text-xs text-muted-foreground">{c.recommendedFix}</p></div>)}
                    {visible && c.beforeAfter && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex-1 bg-red-500/5 rounded-lg p-2"><span className="font-bold text-red-400">Before:</span> <span className="text-muted-foreground">{c.beforeAfter.before}</span></div>
                        <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 bg-green-500/5 rounded-lg p-2"><span className="font-bold text-green-400">After:</span> <span className="text-muted-foreground">{c.beforeAfter.after}</span></div>
                      </div>
                    )}
                    {visible && <Button variant="ghost" size="sm" className="absolute top-2 right-12" onClick={() => copyText(`${c.title}\n${c.description}\nFix: ${c.recommendedFix}`, `c-${i}`)}>{copiedId === `c-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</Button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked sections */}
          {!unlocked && (
            <>
              {['Priority Fixes', 'Hidden Strengths'].map(section => (
                <div key={section} className="relative glass rounded-xl p-6 border border-border select-none">
                  <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-xl z-10 flex items-center justify-center"><Lock className="w-6 h-6 text-muted-foreground" /></div>
                  <h3 className="text-lg font-bold text-foreground font-display mb-2">{section}</h3>
                  <div className="space-y-2">{[1,2,3].map(i => (<div key={i} className="h-8 bg-muted/30 rounded-lg" />))}</div>
                </div>
              ))}
            </>
          )}

          {unlocked && result.priorityFixes && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Priority Fixes</h3>
              <div className="space-y-2">{result.priorityFixes.map((f: string, i: number) => (<div key={i} className="glass rounded-lg p-3 border border-border flex items-start gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span><p className="text-sm text-muted-foreground">{f}</p></div>))}</div>
            </div>
          )}

          {unlocked && result.hiddenStrengths && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /> Hidden Strengths</h3>
              <div className="space-y-2">{result.hiddenStrengths.map((s: string, i: number) => (<div key={i} className="glass rounded-lg p-3 border border-green-500/20"><p className="text-sm text-muted-foreground">{s}</p></div>))}</div>
            </div>
          )}

          {/* Paywall */}
          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Contradiction Report</h3>
              <p className="text-muted-foreground mb-4">Get all contradictions, emotional impact analysis, before/after positioning, priority fixes, and hidden strengths.</p>
              <p className="text-3xl font-bold text-amber mb-4">$99</p>
              <Button onClick={() => setShowCheckout(true)} className="bg-amber hover:bg-amber/90 text-background font-bold px-10 py-3 text-lg">Unlock Now</Button>
            </div>
          )}
        </div>
      )}

      {showCheckout && !adminMode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setShowCheckout(false)}><X className="w-5 h-5" /></Button>
            <h3 className="text-xl font-bold mb-4">Complete Purchase</h3>
            <StripeEmbeddedCheckout priceId="brand_contradiction_finder_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'brand_contradictions' }} />
          </div>
        </div>
      )}
    </div>
  );
};
