import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Lock, Copy, Check, Phone, Mail, MessageSquare, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StripeEmbeddedCheckout } from './StripeEmbeddedCheckout';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';

const PHASES = [
  { label: 'Analyzing your industry...', target: 25 },
  { label: 'Building call script framework...', target: 50 },
  { label: 'Generating objection handlers...', target: 70 },
  { label: 'Writing follow-up templates...', target: 90 },
  { label: 'Finalizing scripts...', target: 98 },
];

export const SalesScriptGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [form, setForm] = useState({ industry: '', product: '', targetCustomer: '', objections: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<any>(null);
  const [unlocked, setUnlocked] = useState(adminMode);
  const [showCheckout, setShowCheckout] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!form.industry.trim() || !form.product.trim()) return;
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        const currentPhase = PHASES[phase];
        setPhaseLabel(currentPhase.label);
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, currentPhase.target));
        phase++;
      }
    }, 3000);

    try {
      const { data, error } = await supabase.functions.invoke('generate-sales-scripts', { body: form });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || 'Failed');
      setProgress(100);
      setPhaseLabel('Done!');
      setTimeout(() => setResult(data), 500);
      if (adminMode) {
        saveToAdminLibrary({
          tool_type: 'sales_scripts',
          title: `${form.industry} — ${form.product} — ${new Date().toLocaleDateString()}`,
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

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <Button variant="ghost" size="sm" onClick={() => copy(text, id)} className="absolute top-2 right-2">
      {copiedId === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </Button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <Phone className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Tell Us About Your Business</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><Label>Industry *</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. SaaS, Real Estate, HVAC" /></div>
            <div><Label>Product/Service *</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="e.g. CRM software, home inspections" /></div>
            <div><Label>Target Customer</Label><Input value={form.targetCustomer} onChange={(e) => setForm({ ...form, targetCustomer: e.target.value })} placeholder="e.g. small business owners" /></div>
            <div><Label>Common Objections</Label><Input value={form.objections} onChange={(e) => setForm({ ...form, objections: e.target.value })} placeholder="e.g. too expensive, not the right time" /></div>
          </div>
          <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8" disabled={!form.industry || !form.product}>Generate Scripts</Button>
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
        <div className="space-y-8">
          {/* Call Script - always visible */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="w-5 h-5 text-green-400" />
              <h3 className="text-xl font-bold text-foreground font-display">Call Script</h3>
            </div>
            <div className="glass rounded-lg p-6 border border-border relative space-y-4">
              <div><h4 className="text-sm font-bold text-amber uppercase mb-1">Opening</h4><p className="text-sm text-muted-foreground whitespace-pre-line">{result.callScript?.opening}</p></div>
              <div><h4 className="text-sm font-bold text-amber uppercase mb-1">Discovery</h4><p className="text-sm text-muted-foreground whitespace-pre-line">{result.callScript?.discovery}</p></div>
              <div className="relative">
                {!unlocked && (
                  <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>
                )}
                <h4 className="text-sm font-bold text-amber uppercase mb-1">Pitch</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{result.callScript?.pitch}</p>
                <h4 className="text-sm font-bold text-amber uppercase mb-1 mt-3">Close</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{result.callScript?.close}</p>
              </div>
              {unlocked && <CopyBtn text={`Opening:\n${result.callScript?.opening}\n\nDiscovery:\n${result.callScript?.discovery}\n\nPitch:\n${result.callScript?.pitch}\n\nClose:\n${result.callScript?.close}`} id="callscript" />}
            </div>
          </div>

          {/* Objection Handlers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-red-400" />
              <h3 className="text-xl font-bold text-foreground font-display">Objection Handlers</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {result.objectionHandlers?.map((obj: any, i: number) => {
                const visible = unlocked || i < 1;
                return (
                  <div key={i} className="relative glass rounded-lg p-5 border border-border">
                    {!visible && <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>}
                    <p className="text-sm font-bold text-red-400 mb-2">"{obj.objection}"</p>
                    <p className="text-sm text-muted-foreground mb-2">{obj.response}</p>
                    <p className="text-xs text-primary italic">{obj.reframe}</p>
                    {visible && <CopyBtn text={`Objection: ${obj.objection}\nResponse: ${obj.response}\nReframe: ${obj.reframe}`} id={`obj-${i}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Follow-up Templates */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-bold text-foreground font-display">Follow-Up Templates</h3>
            </div>
            <div className="space-y-4">
              {result.followUpTemplates?.map((tmpl: any, i: number) => {
                const visible = unlocked;
                return (
                  <div key={i} className="relative glass rounded-lg p-5 border border-border">
                    {!visible && <div className="absolute inset-0 backdrop-blur-md bg-background/60 rounded-lg z-10 flex items-center justify-center"><Lock className="w-5 h-5 text-muted-foreground" /></div>}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase text-amber bg-amber/10 px-2 py-0.5 rounded">{tmpl.type}</span>
                      <span className="text-xs text-muted-foreground">{tmpl.timing}</span>
                    </div>
                    {tmpl.subject && <p className="text-sm font-bold text-foreground mb-1">Subject: {tmpl.subject}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{tmpl.body}</p>
                    {visible && <CopyBtn text={tmpl.body} id={`tmpl-${i}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {!unlocked && !adminMode && (
            <div className="glass rounded-xl p-8 border-2 border-amber/40 text-center">
              <Lock className="w-8 h-8 text-amber mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-foreground font-display mb-2">Unlock Full Sales Script Pack</h3>
              <p className="text-muted-foreground mb-4">Get the complete call script, all objection handlers, follow-up templates, and SMS scripts.</p>
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
            <StripeEmbeddedCheckout priceId="sales_script_pack_once" returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=tool_purchase`} metadata={{ tool_type: 'sales_scripts' }} />
          </div>
        </div>
      )}
    </div>
  );
};
