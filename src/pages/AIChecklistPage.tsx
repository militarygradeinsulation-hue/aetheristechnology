import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CheckCircle2, Download, FileText, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { generateAIChecklistPdf } from '@/lib/generateAIChecklistPdf';
import { toast } from '@/hooks/use-toast';

export default function AIChecklistPage() {
  const { trackEvent } = useTrackEvent();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', biggest_pain: '' });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      await supabase.from('checklist_leads').insert([{
        email: form.email.trim().toLowerCase(),
        name: form.name.trim() || null,
        company: form.company.trim() || null,
        role: form.role.trim() || null,
        biggest_pain: form.biggest_pain.trim() || null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        user_agent: navigator.userAgent,
      }]);
      trackEvent('lead_capture', { source: 'ai_implementation_checklist', has_company: !!form.company });

      const pdf = generateAIChecklistPdf({ name: form.name, company: form.company, email: form.email });
      pdf.save('Aetheris-AI-Implementation-Checklist.pdf');
      setDone(true);
    } catch (err) {
      console.error(err);
      toast({ title: 'Something went wrong', description: 'Please try again or email hello@aetheris.technology', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const redownload = () => {
    const pdf = generateAIChecklistPdf({ name: form.name, company: form.company, email: form.email });
    pdf.save('Aetheris-AI-Implementation-Checklist.pdf');
  };

  return (
    <>
      <Helmet>
        <title>AI Implementation Checklist for Operations Managers | Aetheris</title>
        <meta name="description" content="Free 7-section forensic checklist for ops managers rolling out AI. Pre-flight, use-case triage, data hygiene, pilots, rollout, risk, and ROI measurement." />
        <link rel="canonical" href="https://aetheris.technology/ai-implementation-checklist" />
      </Helmet>

      <div className="min-h-screen pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {/* Left: pitch */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-sm border border-amber/30">
              <span className="font-case text-[10px] uppercase tracking-widest text-amber">Free Lead Magnet · PDF</span>
            </div>
            <h1 className="font-forensic text-4xl md:text-5xl font-bold leading-[1.05] text-foreground">
              The AI Implementation Checklist <span className="text-amber italic">for Operations Managers</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              7 forensic sections. 35 checkboxes. Every box you cannot tick is a leak —
              and pilots launched on top of unchecked boxes don't fail loudly. They fail
              quietly while the invoice keeps clearing.
            </p>

            <ul className="space-y-3 text-sm">
              {[
                'Pre-flight operational readiness — what to confirm before any tool touches your stack',
                'Use-case triage: build vs. buy vs. skip (with a kill-it scoring rubric)',
                'Data & access hygiene — the audit-log + DPA list ops managers always forget',
                '30-day pilot design with pre-defined kill criteria',
                'Rollout, change management, risk, and ROI measurement',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 text-xs text-muted-foreground font-case uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> No spam. Used to send the PDF + occasional ops field notes. Unsubscribe one click.
            </div>
          </div>

          {/* Right: form */}
          <div className="glass p-6 rounded-xl border border-border space-y-4 h-fit">
            {!done ? (
              <>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber" />
                  <h2 className="font-forensic text-xl font-bold text-foreground">Get the checklist</h2>
                </div>
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <Label htmlFor="email">Work email *</Label>
                    <Input id="email" type="email" required value={form.email} onChange={update('email')} placeholder="you@company.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={form.name} onChange={update('name')} />
                    </div>
                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" value={form.company} onChange={update('company')} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={form.role} onChange={update('role')} placeholder="VP Ops, COO, Director of Operations…" />
                  </div>
                  <div>
                    <Label htmlFor="pain">Biggest operational leak right now</Label>
                    <Textarea id="pain" rows={3} value={form.biggest_pain} onChange={update('pain' as never) as never} placeholder="Optional — we read every one." />
                  </div>
                  <Button type="submit" size="lg" disabled={submitting} className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    {submitting ? 'Generating PDF…' : (<><Download className="w-4 h-4 mr-2" />Download the Checklist</>)}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center font-case uppercase tracking-wider">PDF · 35 checkboxes · 4–5 pages</p>
                </form>
              </>
            ) : (
              <div className="space-y-4 text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-amber mx-auto" />
                <h2 className="font-forensic text-2xl font-bold text-foreground">Your PDF downloaded.</h2>
                <p className="text-sm text-muted-foreground">If your browser blocked it, hit the button below. We also have it on file.</p>
                <Button onClick={redownload} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" /> Download again
                </Button>
                <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 text-left">
                  <div className="flex items-center gap-2 text-amber font-case uppercase text-[10px] tracking-widest mb-2">
                    <AlertTriangle className="w-4 h-4" /> Next step
                  </div>
                  <p className="text-sm text-foreground">
                    Want an operator to actually run this against your business? The
                    <strong className="text-amber"> Forensic Diagnostic ($2,500 flat)</strong> applies 1:1 toward any engagement.
                  </p>
                  <a href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst" target="_blank" rel="noopener noreferrer">
                    <Button className="w-full mt-3 bg-amber hover:bg-amber/90 text-primary-foreground">Book the Forensic Diagnostic</Button>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
