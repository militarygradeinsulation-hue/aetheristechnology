import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Calendar, X, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { PostImageGenerator } from './admin/PostImageGenerator';

const PHASES = [
  { label: 'Analyzing your industry...', target: 25 },
  { label: 'Mapping content themes...', target: 50 },
  { label: 'Generating 30 days of content...', target: 75 },
  { label: 'Optimizing posting times...', target: 95 },
];

export const ContentCalendarGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ industry: '', goals: '', platforms: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inferring, setInferring] = useState(false);

  const handleInferFromWebsite = async () => {
    if (!form.website.trim()) return;
    setInferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('infer-business-context', { body: { url: form.website.trim() } });
      if (error || !data) throw new Error(error?.message || 'Could not read website');
      setForm(prev => ({
        ...prev,
        industry: data.industry || prev.industry,
        goals: data.goals || prev.goals,
        platforms: prev.platforms,
      }));
      toast({ title: 'Auto-filled!', description: `Detected: ${data.businessName || data.industry}` });
    } catch (err: any) {
      toast({ title: 'Could not read site', description: err.message, variant: 'destructive' });
    } finally {
      setInferring(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.industry.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        const current = PHASES[phase];
        setPhaseLabel(current.label);
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, current.target));
        phase++;
      }
    }, 3500);

    try {
      const { data, error } = await supabase.functions.invoke('generate-content-calendar', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed');
      setProgress(100);
      setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToAdminLibrary({
          tool_type: 'content_calendar',
          title: `${form.industry} — 30-day calendar — ${new Date().toLocaleDateString()}`,
          input_data: form,
          output_data: data,
        }).catch(e => console.error('Library save failed:', e));
      }
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
      setProgress(0);
    }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied!' });
  };

  const days = result?.days || [];
  const FREE_DAYS = 7;

  return (
    <div className="max-w-4xl mx-auto">
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Build Your Content Calendar</h2>
          </div>
          <div className="mb-5">
            <Label>Website (auto-fill from your site)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="e.g. yourcompany.com" />
              <Button type="button" variant="outline" onClick={handleInferFromWebsite} disabled={inferring || !form.website.trim()} className="shrink-0">
                {inferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                <span className="ml-1.5">{inferring ? 'Reading…' : 'Auto-fill'}</span>
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><Label>Industry *</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Fitness, SaaS, Real Estate" /></div>
            <div><Label>Goals</Label><Input value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="e.g. Lead gen, brand awareness" /></div>
            <div className="md:col-span-2"><Label>Platforms</Label><Input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} placeholder="e.g. LinkedIn, Facebook, Instagram" /></div>
          </div>
          <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8" disabled={!form.industry}>Generate Calendar</Button>
        </div>
      )}

      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <p className="text-amber font-semibold mb-4">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">Your <span className="text-amber">30-Day</span> Content Calendar</h2>
            <p className="text-muted-foreground">Showing {unlocked ? 30 : FREE_DAYS} of 30 days {!unlocked && '— unlock for the full calendar'}</p>
          </div>

          <div className="space-y-3">
            {days.map((day: any, i: number) => {
              const visible = unlocked || i < FREE_DAYS;
              return (
                <div key={i} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
                  {!visible && (
                    <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-background bg-amber rounded-full w-7 h-7 flex items-center justify-center">{day.day}</span>
                        <span className="text-xs uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{day.platform}</span>
                        <span className="text-xs text-muted-foreground">{day.contentType} · {day.bestTime}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1">{day.topic}</h4>
                      <p className="text-sm text-amber font-semibold mb-2">{day.hook}</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{day.caption}</p>
                      {day.hashtags?.length > 0 && (
                        <p className="text-xs text-primary mt-1">{day.hashtags.map((h: string) => `#${h.replace('#', '')}`).join(' ')}</p>
                      )}
                    </div>
                    {visible && (
                      <Button variant="ghost" size="sm" onClick={() => copy(`Day ${day.day}: ${day.topic}\nHook: ${day.hook}\n${day.caption}\n${day.hashtags?.join(' ')}`, `day-${i}`)}>
                        {copiedId === `day-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full 30-Day Calendar</h3>
              <p className="text-muted-foreground mb-4">Get all 30 days with hooks, captions, hashtags, and optimal posting times.</p>
              <p className="text-3xl font-bold text-amber mb-4">$29</p>
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
            <StripeEmbeddedCheckout priceId="content_calendar_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'content_calendar' }} />
          </div>
        </div>
      )}
    </div>
  );
};
