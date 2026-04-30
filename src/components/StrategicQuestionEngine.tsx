import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Brain, AlertTriangle, Users, TrendingUp, Briefcase, Target, DollarSign, Heart, Rocket, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToolRun } from '@/lib/toolSaveHelper';

const PHASES = [
  { label: 'Analyzing your business profile...', target: 20 },
  { label: 'Mapping organizational blind spots...', target: 40 },
  { label: 'Generating leadership questions...', target: 60 },
  { label: 'Building departmental deep-dives...', target: 80 },
  { label: 'Prioritizing by urgency...', target: 98 },
];

const PRESSURE_OPTIONS = ['Marketing', 'Sales', 'Operations', 'Hiring', 'Fulfillment', 'Customer Retention', 'Leadership', 'Pricing'];
const GOAL_OPTIONS = ['Grow', 'Stabilize', 'Rebuild', 'Prepare to Scale'];
const GROWTH_STAGES = ['Startup (0-2 years)', 'Early Growth (2-5 years)', 'Established (5-10 years)', 'Mature (10+ years)', 'Turnaround'];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  leadership: Brain, sales: Target, marketing: TrendingUp, operations: Briefcase,
  hiringAndPeople: Users, pricingAndOffer: DollarSign, customerJourney: Heart, growthAndExpansion: Rocket,
};
const CATEGORY_LABELS: Record<string, string> = {
  leadership: 'Leadership', sales: 'Sales', marketing: 'Marketing', operations: 'Operations',
  hiringAndPeople: 'Hiring & People', pricingAndOffer: 'Pricing & Offer', customerJourney: 'Customer Journey', growthAndExpansion: 'Growth & Expansion',
};

export const StrategicQuestionEngine: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ industry: '', companySize: '', yearsInBusiness: '', mainProduct: '', growthStage: '', biggestFrustration: '', pressureAreas: [] as string[], revenueRange: '', goal: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePressure = (area: string) => {
    setForm(prev => ({ ...prev, pressureAreas: prev.pressureAreas.includes(area) ? prev.pressureAreas.filter(a => a !== area) : [...prev.pressureAreas, area] }));
  };

  const handleGenerate = async () => {
    if (!form.industry || !form.companySize || !form.mainProduct || !form.growthStage || !form.biggestFrustration || !form.pressureAreas.length || !form.goal) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setLoading(true); setProgress(0); setResult(null);
    let phase = 0;
    const interval = setInterval(() => { if (phase < PHASES.length) { const p = PHASES[phase]; setPhaseLabel(p.label); setProgress(prev => Math.min(prev + Math.random() * 8 + 4, p.target)); phase++; } }, 4000);
    try {
      const { data, error } = await supabase.functions.invoke('generate-strategic-questions', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed to generate');
      setProgress(100); setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToolRun({
          tool_type: 'strategic_questions',
          title: `${form.industry} — ${form.companySize} — ${new Date().toLocaleDateString()}`,
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

  const FREE_CATEGORIES = ['leadership', 'sales'];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Input Form */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Your Business Profile</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div><label className="text-sm text-muted-foreground mb-1 block">Industry *</label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g., SaaS, Construction, Healthcare" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Company Size *</label><Input value={form.companySize} onChange={e => setForm(p => ({ ...p, companySize: e.target.value }))} placeholder="e.g., 5 employees, 50 employees" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Years in Business</label><Input value={form.yearsInBusiness} onChange={e => setForm(p => ({ ...p, yearsInBusiness: e.target.value }))} placeholder="e.g., 3 years" /></div>
            <div><label className="text-sm text-muted-foreground mb-1 block">Revenue Range (optional)</label><Input value={form.revenueRange} onChange={e => setForm(p => ({ ...p, revenueRange: e.target.value }))} placeholder="e.g., $500K-$1M" /></div>
          </div>
          <div className="mb-4"><label className="text-sm text-muted-foreground mb-1 block">Main Product/Service *</label><Input value={form.mainProduct} onChange={e => setForm(p => ({ ...p, mainProduct: e.target.value }))} placeholder="What do you sell or deliver?" /></div>
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Growth Stage *</label>
            <div className="flex flex-wrap gap-2">{GROWTH_STAGES.map(s => (<button key={s} onClick={() => setForm(p => ({ ...p, growthStage: s }))} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.growthStage === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{s}</button>))}</div>
          </div>
          <div className="mb-4"><label className="text-sm text-muted-foreground mb-1 block">Biggest Frustration Right Now *</label><Textarea value={form.biggestFrustration} onChange={e => setForm(p => ({ ...p, biggestFrustration: e.target.value }))} placeholder="What keeps you up at night?" rows={3} /></div>
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Where do you feel the most pressure? *</label>
            <div className="flex flex-wrap gap-2">{PRESSURE_OPTIONS.map(a => (<button key={a} onClick={() => togglePressure(a)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.pressureAreas.includes(a) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{a}</button>))}</div>
          </div>
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">Your Goal *</label>
            <div className="flex flex-wrap gap-2">{GOAL_OPTIONS.map(g => (<button key={g} onClick={() => setForm(p => ({ ...p, goal: g }))} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.goal === g ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>{g}</button>))}</div>
          </div>
          <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8 w-full md:w-auto">Generate Question Map</Button>
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
          {/* Snapshot */}
          <div className="glass rounded-xl p-6 border border-border">
            <h2 className="text-2xl font-bold text-foreground font-display mb-3">Company Snapshot</h2>
            <p className="text-muted-foreground">{result.companySnapshot}</p>
          </div>

          {/* Top 10 */}
          <div>
            <h3 className="text-xl font-bold text-foreground font-display mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber" /> Top 10 Critical Questions</h3>
            <div className="space-y-3">
              {result.top10CriticalQuestions?.map((q: any, i: number) => (
                <div key={i} className="glass rounded-lg p-4 border border-border relative group">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${q.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : q.urgency === 'high' ? 'bg-amber/20 text-amber' : 'bg-primary/20 text-primary'}`}>{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">{q.question}</p>
                      <p className="text-xs text-muted-foreground">{q.whyItMatters}</p>
                      <span className={`text-[10px] font-bold uppercase mt-1 inline-block ${q.urgency === 'critical' ? 'text-red-400' : q.urgency === 'high' ? 'text-amber' : 'text-primary'}`}>{q.urgency} · {q.category}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(q.question, `top-${i}`)}>{copiedId === `top-${i}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</Button>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const questions = result.categories?.[key];
            if (!questions?.length) return null;
            const isFree = FREE_CATEGORIES.includes(key);
            const visible = unlocked || isFree;
            const Icon = CATEGORY_ICONS[key] || Brain;
            return (
              <div key={key} className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground font-display">{label}</h3>
                </div>
                <div className={`space-y-2 ${!visible ? 'select-none' : ''}`}>
                  {questions.map((q: any, i: number) => (
                    <div key={i} className="relative glass rounded-lg p-4 border border-border">
                      {!visible && <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>}
                      <p className="text-sm font-semibold text-foreground mb-1">{q.question}</p>
                      <p className="text-xs text-muted-foreground">{q.whyItMatters}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Locked sections preview */}
          {!unlocked && (
            <>
              {['questionsYouProbablyArentAsking', 'leadershipTeamDiscussion', 'workshopPrompts'].map(section => (
                <div key={section} className="relative glass rounded-xl p-6 border border-border select-none">
                  <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-xl z-10 flex items-center justify-center"><Lock className="w-6 h-6 text-muted-foreground" /></div>
                  <h3 className="text-lg font-bold text-foreground font-display mb-2">{section === 'questionsYouProbablyArentAsking' ? "Questions You're Probably Not Asking" : section === 'leadershipTeamDiscussion' ? 'Leadership Team Discussion' : 'Workshop Prompts'}</h3>
                  <div className="space-y-2">{[1,2,3].map(i => (<div key={i} className="h-12 bg-muted/30 rounded-lg" />))}</div>
                </div>
              ))}
            </>
          )}

          {/* Unlocked sections */}
          {unlocked && result.questionsYouProbablyArentAsking && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /> Questions You're Probably Not Asking</h3>
              <div className="space-y-2">{result.questionsYouProbablyArentAsking.map((q: any, i: number) => (<div key={i} className="glass rounded-lg p-4 border border-red-500/20"><p className="text-sm font-semibold text-foreground mb-1">{q.question}</p><p className="text-xs text-muted-foreground">{q.whyItMatters}</p></div>))}</div>
            </div>
          )}

          {unlocked && result.leadershipTeamDiscussion && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Leadership Team Discussion</h3>
              <div className="space-y-2">{result.leadershipTeamDiscussion.map((q: any, i: number) => (<div key={i} className="glass rounded-lg p-4 border border-border"><p className="text-sm font-semibold text-foreground mb-1">{q.question}</p><p className="text-xs text-muted-foreground">{q.context}</p></div>))}</div>
            </div>
          )}

          {unlocked && result.workshopPrompts && (
            <div><h3 className="text-lg font-bold text-foreground font-display mb-3">Workshop Prompts</h3>
              <div className="space-y-2">{result.workshopPrompts.map((w: any, i: number) => (<div key={i} className="glass rounded-lg p-4 border border-border"><p className="text-sm font-semibold text-foreground mb-1">{w.prompt}</p><p className="text-xs text-muted-foreground">{w.format} · {w.timeEstimate}</p></div>))}</div>
            </div>
          )}

          {/* Paywall */}
          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Question Map</h3>
              <p className="text-muted-foreground mb-4">Get all 8 categories, urgency rankings, "Questions You're Probably Not Asking," leadership discussion prompts, and workshop templates.</p>
              <p className="text-3xl font-bold text-amber mb-4">$79</p>
              <Button onClick={() => setShowCheckout(true)} className="bg-amber hover:bg-amber/90 text-background font-bold px-10 py-3 text-lg">Unlock Now</Button>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && !adminMode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setShowCheckout(false)}><X className="w-5 h-5" /></Button>
            <h3 className="text-xl font-bold mb-4">Complete Purchase</h3>
            <StripeEmbeddedCheckout priceId="strategic_question_engine_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'strategic_questions' }} />
          </div>
        </div>
      )}
    </div>
  );
};
