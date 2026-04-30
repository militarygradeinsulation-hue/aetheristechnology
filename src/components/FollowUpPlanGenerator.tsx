import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Mail, Phone, MessageSquare, Linkedin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { isPortalSession } from '@/lib/portalWorkspace';

const PHASES = [
  { label: 'Analyzing your sales cycle...', target: 25 },
  { label: 'Building follow-up cadence...', target: 50 },
  { label: 'Generating templates...', target: 75 },
  { label: 'Optimizing timing...', target: 95 },
];

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
};

const channelColors: Record<string, string> = {
  email: 'text-blue-400',
  call: 'text-green-400',
  sms: 'text-purple-400',
  linkedin: 'text-sky-400',
};

export const FollowUpPlanGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ businessType: '', salesCycleLength: '', currentTools: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.businessType.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        setPhaseLabel(PHASES[phase].label);
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, PHASES[phase].target));
        phase++;
      }
    }, 3500);

    try {
      const { data, error } = await supabase.functions.invoke('generate-follow-up-plan', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed');
      setProgress(100);
      setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToolRun({
          tool_type: 'follow_up_plan',
          title: `${form.businessType} — Follow-up — ${new Date().toLocaleDateString()}`,
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

  const FREE_DAYS = 4;
  const days = result?.days || [];

  return (
    <div className="max-w-4xl mx-auto">
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Build Your Follow-Up System</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><Label>Business Type *</Label><Input value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} placeholder="e.g. B2B SaaS, Home Services" /></div>
            <div><Label>Sales Cycle Length</Label><Input value={form.salesCycleLength} onChange={(e) => setForm({ ...form, salesCycleLength: e.target.value })} placeholder="e.g. 2-4 weeks" /></div>
            <div className="md:col-span-2"><Label>Current Tools</Label><Input value={form.currentTools} onChange={(e) => setForm({ ...form, currentTools: e.target.value })} placeholder="e.g. Email, phone, HubSpot" /></div>
          </div>
          <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8" disabled={!form.businessType}>Generate Plan</Button>
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
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-foreground font-display mb-2">Your <span className="text-amber">14-Day</span> Follow-Up System</h2>
            {result.overview && <p className="text-muted-foreground max-w-2xl mx-auto">{result.overview}</p>}
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {days.map((day: any, i: number) => {
              const visible = unlocked || i < FREE_DAYS;
              const ch = day.channel?.toLowerCase() || 'email';
              return (
                <div key={i} className={`relative glass rounded-lg p-5 border border-border ${!visible ? 'select-none' : ''}`}>
                  {!visible && (
                    <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="text-xs font-bold text-background bg-amber rounded-full w-7 h-7 flex items-center justify-center">D{day.day}</span>
                      <span className={`${channelColors[ch] || 'text-muted-foreground'}`}>{channelIcons[ch] || channelIcons.email}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase text-amber">{ch}</span>
                        <span className="text-xs text-muted-foreground">{day.timing}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1">{day.action}</h4>
                      {day.subject && <p className="text-xs text-primary mb-1">Subject: {day.subject}</p>}
                      <p className="text-sm text-muted-foreground whitespace-pre-line mb-1">{day.template}</p>
                      <p className="text-xs text-muted-foreground italic">Goal: {day.goal}</p>
                      {day.tips && <p className="text-xs text-amber mt-1">💡 {day.tips}</p>}
                    </div>
                    {visible && (
                      <Button variant="ghost" size="sm" onClick={() => copy(day.template, `day-${i}`)}>
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
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full 14-Day System</h3>
              <p className="text-muted-foreground mb-4">Get all 14 days of templates, objection responses, and multi-channel cadences.</p>
              <p className="text-3xl font-bold text-amber mb-4">$49</p>
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
            <StripeEmbeddedCheckout priceId="follow_up_plan_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'follow_up_plan' }} />
          </div>
        </div>
      )}
    </div>
  );
};
