import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Globe, FileText, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';

const PHASES = [
  { label: 'Scraping your website copy...', target: 15 },
  { label: 'Scanning for vague language...', target: 35 },
  { label: 'Detecting corporate filler...', target: 55 },
  { label: 'Analyzing emotional strength...', target: 75 },
  { label: 'Building friction report...', target: 98 },
];

const TONE_OPTIONS = ['Premium', 'Simple', 'Expert', 'Warm', 'Authoritative', 'Bold', 'Conversational', 'Corporate', 'Playful', 'Direct'];
const CATEGORY_LABELS: Record<string, string> = { vague: 'Vague Language', corporate_filler: 'Corporate Filler', weak_emotional: 'Weak Emotional Language', risky_wording: 'Risky Wording', flat_cta: 'Flat CTAs' };
const CATEGORY_COLORS: Record<string, string> = { vague: 'text-purple-400 bg-purple-500/20', corporate_filler: 'text-blue-400 bg-blue-500/20', weak_emotional: 'text-amber bg-amber/20', risky_wording: 'text-red-400 bg-red-500/20', flat_cta: 'text-orange-400 bg-orange-500/20' };

export const FrictionVocabularyAudit: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ url: '', desiredTone: [] as string[], industry: '', targetCustomer: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleTone = (t: string) => { setForm(prev => ({ ...prev, desiredTone: prev.desiredTone.includes(t) ? prev.desiredTone.filter(x => x !== t) : [...prev.desiredTone, t] })); };

  const handleGenerate = async () => {
    if (!form.url || !form.desiredTone.length || !form.industry || !form.targetCustomer) {
      toast({ title: 'Missing fields', description: 'All fields are required.', variant: 'destructive' }); return;
    }
    setLoading(true); setProgress(0); setResult(null);
    let phase = 0;
    const interval = setInterval(() => { if (phase < PHASES.length) { const p = PHASES[phase]; setPhaseLabel(p.label); setProgress(prev => Math.min(prev + Math.random() * 8 + 4, p.target)); phase++; } }, 4000);
    try {
      const { data, error } = await supabase.functions.invoke('generate-friction-audit', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed to audit');
      setProgress(100); setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToAdminLibrary({
          tool_type: 'friction_audit',
          title: `${form.url} — Friction audit — ${new Date().toLocaleDateString()}`,
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
          <div className="flex items-center gap-3 mb-6"><FileText className="w-6 h-6 text-amber" /><h2 className="text-2xl font-bold text-foreground font-display">Audit Your Copy</h2></div>
          <div className="space-y-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Website URL *</label><Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://yourbusiness.com" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Industry *</label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g., Real Estate, SaaS, Healthcare" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Target Customer *</label><Input value={form.targetCustomer} onChange={e => setForm(p => ({ ...p, targetCustomer: e.target.value }))} placeholder="Who are you writing for?" /></div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Desired Brand Tone *</label>
              <div className="flex flex-wrap gap-2">{TONE_OPTIONS.map(t => (<button key={t} onClick={() => toggleTone(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.desiredTone.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{t}</button>))}</div>
            </div>
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8">Audit My Copy</Button>
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
            <h2 className="text-2xl font-bold text-foreground font-display mb-2">Copy Friction Score</h2>
            <div className={`text-6xl font-bold font-display mb-2 ${(result.frictionScore || 0) >= 70 ? 'text-green-400' : (result.frictionScore || 0) >= 40 ? 'text-amber' : 'text-red-400'}`}>{result.frictionScore || 0}<span className="text-2xl text-muted-foreground">/100</span></div>
            <p className="text-muted-foreground max-w-xl mx-auto">{result.overallAssessment}</p>
          </div>

          {/* Flagged Phrases */}
          <div>
            <h3 className="text-xl font-bold text-foreground font-display mb-4">Flagged Phrases</h3>
            <div className="space-y-3">
              {result.flaggedPhrases?.map((f: any, i: number) => {
                const visible = unlocked || i < 5;
                return (
                  <div key={i} className={`relative glass rounded-lg p-4 border border-border ${!visible ? 'select-none' : ''}`}>
                    {!visible && <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>}
                    <div className="flex items-start justify-between mb-2">
                      <code className="text-sm font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">"{f.originalPhrase}"</code>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${CATEGORY_COLORS[f.category] || CATEGORY_COLORS.vague}`}>{CATEGORY_LABELS[f.category] || f.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{f.issue}</p>
                    {visible && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-400 line-through">{f.originalPhrase}</span>
                        <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-green-400 font-semibold">{f.suggestedReplacement}</span>
                      </div>
                    )}
                    {visible && <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyText(`Original: ${f.originalPhrase}\nReplacement: ${f.suggestedReplacement}`, `f-${i}`)}>{copiedId === `f-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</Button>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Locked sections */}
          {!unlocked && (
            <>
              {['Tone Alignment', 'Stronger CTAs', 'Top Priority Fixes', 'Copy Strengths'].map(section => (
                <div key={section} className="relative glass rounded-xl p-6 border border-border select-none">
                  <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-xl z-10 flex items-center justify-center"><Lock className="w-6 h-6 text-muted-foreground" /></div>
                  <h3 className="text-lg font-bold text-foreground font-display mb-2">{section}</h3>
                  <div className="space-y-2">{[1,2,3].map(i => (<div key={i} className="h-8 bg-muted/30 rounded-lg" />))}</div>
                </div>
              ))}
            </>
          )}

          {/* Unlocked sections */}
          {unlocked && result.toneAlignment && (
            <div className="glass rounded-xl p-6 border border-border">
              <h3 className="text-lg font-bold text-foreground font-display mb-3">Tone Alignment</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-3">
                <div><p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Current Tone</p><p className="text-sm text-foreground">{result.toneAlignment.currentTone}</p></div>
                <div><p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Desired Tone</p><p className="text-sm text-foreground">{result.toneAlignment.desiredTone}</p></div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{result.toneAlignment.gap}</p>
              <ul className="space-y-1">{result.toneAlignment.recommendations?.map((r: string, i: number) => (<li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5"><Check className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />{r}</li>))}</ul>
            </div>
          )}

          {unlocked && result.strongerCTAs && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Stronger CTAs</h3>
              <div className="space-y-2">{result.strongerCTAs.map((c: any, i: number) => (
                <div key={i} className="glass rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 text-sm mb-1"><span className="text-red-400 line-through">{c.current}</span><ArrowRight className="w-3 h-3 text-primary" /><span className="text-green-400 font-semibold">{c.replacement}</span></div>
                  <p className="text-xs text-muted-foreground">{c.whyBetter}</p>
                </div>
              ))}</div>
            </div>
          )}

          {unlocked && result.topPriorityFixes && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Top Priority Fixes</h3>
              <div className="space-y-2">{result.topPriorityFixes.map((f: string, i: number) => (<div key={i} className="glass rounded-lg p-3 border border-border flex items-start gap-2"><span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span><p className="text-sm text-muted-foreground">{f}</p></div>))}</div>
            </div>
          )}

          {unlocked && result.copyStrengths && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Copy Strengths</h3>
              <div className="space-y-2">{result.copyStrengths.map((s: string, i: number) => (<div key={i} className="glass rounded-lg p-3 border border-green-500/20"><p className="text-sm text-muted-foreground flex items-start gap-1.5"><Check className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />{s}</p></div>))}</div>
            </div>
          )}

          {/* Paywall */}
          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Friction Audit</h3>
              <p className="text-muted-foreground mb-4">Get all flagged phrases with replacements, tone alignment analysis, stronger CTAs, and priority fix list.</p>
              <p className="text-3xl font-bold text-amber mb-4">$69</p>
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
            <StripeEmbeddedCheckout priceId="friction_vocabulary_audit_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'friction_audit' }} />
          </div>
        </div>
      )}
    </div>
  );
};
