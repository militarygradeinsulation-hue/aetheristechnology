import React, { useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Lock, DollarSign, CheckCircle2, Copy, ShieldCheck, Rocket } from 'lucide-react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { useSearchParams } from 'react-router-dom';

type Phase = 'pitch' | 'checkout' | 'verifying' | 'granted';

const LS_KEY = 'aetheris_instant_license';

export default function CareersLicensePage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('pitch');
  const [payerEmail, setPayerEmail] = useState('');
  const [payerName, setPayerName] = useState('');
  const [repCode, setRepCode] = useState<string | null>(null);
  const [grantedEmail, setGrantedEmail] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const sid = searchParams.get('session_id');
    if (sid) {
      setPhase('verifying');
      verify(sid);
      return;
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.code) { setRepCode(p.code); setGrantedEmail(p.email || null); setPhase('granted'); }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (session_id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-careers-license', {
        body: { session_id, environment: getStripeEnvironment(), name: payerName || undefined },
      });
      if (error) throw new Error(error.message);
      if (!(data as any)?.paid || !(data as any)?.code) throw new Error((data as any)?.error || 'License not granted');
      const code = (data as any).code as string;
      const email = (data as any).email as string | undefined;
      localStorage.setItem(LS_KEY, JSON.stringify({ code, email, ts: Date.now() }));
      setRepCode(code);
      setGrantedEmail(email || null);
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
      toast({ title: 'License granted', description: `Your rep code is ${code}` });
      setPhase('granted');
    } catch (e) {
      toast({ title: 'Could not verify payment', description: e instanceof Error ? e.message : '', variant: 'destructive' });
      setPhase('pitch');
    }
  };

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        priceId: 'careers_instant_license_v2',
        customerEmail: payerEmail || undefined,
        returnUrl: `${window.location.origin}/careers/license?session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
        metadata: { purpose: 'careers_instant_license', rep_name: payerName },
      },
    });
    if (error || !(data as any)?.clientSecret) {
      throw new Error(error?.message || 'Failed to create checkout session');
    }
    return (data as any).clientSecret;
  };

  const copyCode = () => {
    if (!repCode) return;
    navigator.clipboard.writeText(repCode);
    toast({ title: 'Copied', description: 'Rep code copied to clipboard.' });
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Instant Rep License — Aetheris Chaos Ecosystem"
        description="Skip the test. Pay $100, get your rep code, sell every Aetheris tool at full commission. 1099 independent, no employment relationship."
        path="/careers/license"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <div className="pt-24 pb-32 px-4 max-w-3xl mx-auto space-y-6">

          {phase === 'pitch' && (
            <Card className="bg-card/60 backdrop-blur border-amber/40 forensic-tile">
              <CardHeader>
                <div className="flex items-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-amber">
                  <Lock className="w-3.5 h-3.5" /> Instant License · $500 · No test · No interview
                </div>
                <CardTitle className="font-display text-3xl mt-2">
                  Skip the gatekeepers. <span className="text-crimson">Print your own paycheck.</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  $500 one-time gets you a personal rep code and the right to resell every Aetheris tool in the Chaos Ecosystem.
                  <span className="text-amber font-semibold"> One $18,500+ diagnostic pays your license back 5x.</span> One $18,500 flagship close puts <span className="text-amber font-semibold">$5,000 in your pocket.</span>
                  1099 independent — no employment, no manager, no quotas.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <ShieldCheck className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Personal rep code</p>
                    <p className="text-muted-foreground text-xs mt-1">Every sale tracked. Every commission auto-paid within 7 days of clearing.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <Rocket className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Sell the whole stack</p>
                    <p className="text-muted-foreground text-xs mt-1">Every tool, every flagship, every retainer. Highest split in the category.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <DollarSign className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Live in 5 minutes</p>
                    <p className="text-muted-foreground text-xs mt-1">Pay, get your code, portal + playbook unlock instantly. Start selling today.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Your name</Label>
                  <Input value={payerName} onChange={e => setPayerName(e.target.value)} maxLength={100} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email for receipt + license</Label>
                  <Input
                    type="email" value={payerEmail} onChange={e => setPayerEmail(e.target.value)}
                    placeholder="you@example.com" maxLength={255}
                  />
                </div>
                <Button
                  size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-bold shadow-[0_0_25px_rgba(217,169,58,0.4)]"
                  onClick={() => {
                    if (!payerName.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.trim())) { toast({ title: 'Valid email required', variant: 'destructive' }); return; }
                    setPhase('checkout');
                  }}
                >
                  Activate my license — $500 →
                </Button>
                <p className="text-xs text-center text-muted-foreground">Secure Stripe checkout · Rep code in your inbox in 60 seconds · 1099 independent</p>
              </CardContent>
            </Card>
          )}

          {phase === 'checkout' && (
            <div className="space-y-4">
              <Card className="bg-card/60 backdrop-blur border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg">Instant Rep License — $500</p>
                    <p className="text-xs text-muted-foreground">Paying as {payerEmail}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPhase('pitch')}>Change</Button>
                </CardContent>
              </Card>
              <div id="checkout" className="rounded-xl overflow-hidden">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>
          )}

          {phase === 'verifying' && (
            <Card className="bg-card/60 backdrop-blur border-border/50">
              <CardContent className="p-8 text-center space-y-3">
                <Loader2 className="w-10 h-10 text-amber mx-auto animate-spin" />
                <h2 className="font-display text-2xl">Provisioning your rep code…</h2>
                <p className="text-sm text-muted-foreground">One moment.</p>
              </CardContent>
            </Card>
          )}

          {phase === 'granted' && repCode && (
            <Card className="bg-card/60 backdrop-blur border-emerald-500/40 forensic-tile">
              <CardHeader>
                <div className="flex items-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> License granted
                </div>
                <CardTitle className="font-display text-3xl mt-2">You're an Aetheris Connector.</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {grantedEmail && <>Receipt sent to <strong className="text-foreground">{grantedEmail}</strong>. </>}
                  Save this code — it's how every sale is tied to you.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
                  <div className="font-mono uppercase text-[10px] tracking-[0.3em] text-emerald-400 mb-2">Your rep code</div>
                  <div className="font-mono text-4xl sm:text-5xl font-bold text-foreground tracking-widest">{repCode}</div>
                  <Button variant="outline" size="sm" className="mt-4 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={copyCode}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy code
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <a href="/rep-portal" className="block">
                    <Button className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
                      Open rep portal →
                    </Button>
                  </a>
                  <a href="/" className="block">
                    <Button variant="outline" className="w-full border-amber/40 text-amber hover:bg-amber/10">
                      Explore the tools you can sell
                    </Button>
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  You're a 1099 independent contractor. Every sale routed through your code pays commission based on the standard Aetheris split. No employment, no salary, no manager. Full commission structure and playbooks live inside the rep portal.
                </p>
              </CardContent>
            </Card>
          )}

        </div>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
