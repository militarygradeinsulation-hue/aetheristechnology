import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Send, CheckCircle2, Loader2 } from 'lucide-react';

export const BuildMeASystemSection: React.FC = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.message.trim()) {
      toast({ title: 'Add your email and the problem', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: form.name || 'Custom system request',
        email: form.email.trim(),
        message: `[home_build_me_a_system]\n\n${form.message.trim()}`,
        service_interest: 'custom_system_request',
      });
      if (error) throw error;
      setDone(true);
      toast({ title: 'Got it — I\'ll be in touch personally.' });
    } catch (err) {
      toast({
        title: 'Send failed',
        description: err instanceof Error ? err.message : 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 max-w-3xl mx-auto animate-fade-in" style={{ animationFillMode: 'both' }}>
      <div className="rounded-sm border border-amber/30 bg-card/60 backdrop-blur-sm p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="rounded-sm bg-amber/15 border border-amber/30 p-2 shrink-0">
            <Wrench className="w-5 h-5 text-amber" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Custom Build Request</div>
            <h2 className="font-forensic text-xl sm:text-2xl font-bold mt-1 leading-tight">
              Got a problem you want solved — big or small? Tell me. I'll build the system for you.
            </h2>
            <p className="text-sm text-foreground/75 mt-2 leading-relaxed">
              A stuck workflow, a broken handoff, a report you hate building by hand, an AI agent you wish existed —
              describe it in plain words. If I can build it, I will. Direct to me. No forms passed around.
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-6 rounded-sm border border-amber/30 bg-amber/5 p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber shrink-0 mt-0.5" />
            <div>
              <p className="font-forensic font-bold">Received.</p>
              <p className="text-sm text-foreground/75 mt-1">
                I'll reply personally with a build plan (or an honest "no, here's why"). Usually within 24 hours.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Name (optional)</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                  className="mt-1 bg-background/60"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Email <span className="text-amber">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="mt-1 bg-background/60"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                The problem <span className="text-amber">*</span>
              </label>
              <Textarea
                required
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Describe what's broken, slow, or missing. Big or small. I read every one."
                rows={5}
                className="mt-1 bg-background/60 resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-amber text-background hover:bg-amber/90 font-mono uppercase tracking-wider text-xs"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send it to Joseph</>
              )}
            </Button>
            <p className="text-[11px] text-foreground/50 font-mono">
              Goes straight to my inbox. No sales sequence. No autoresponder chain.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};

export default BuildMeASystemSection;
