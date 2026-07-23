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
        title="Strategic Scout Program — Aetheris Forensic Alliance"
        description="Introduce qualified businesses to Aetheris and earn on collected revenue: 15% of every paid 21-Day Revenue Diagnostic, 10% of Active Case revenue for 12 paid months, and 10% of the first custom implementation. 1099 independent."
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
                  <Lock className="w-3.5 h-3.5" /> Forensic Alliance · Strategic Scout Program · 1099 independent
                </div>
                <CardTitle className="font-display text-3xl mt-2">
                  Introduce the business. <span className="text-crimson">Earn on the revenue Aetheris collects.</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                  You provide a documented, qualified introduction. Aetheris runs the outreach, the diagnostic, the delivery, and the collection.
                  You get paid <span className="text-amber font-semibold">only after cleared payment</span> — every commission calculated from collected net revenue.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Compensation at a glance */}
                <div className="space-y-2">
                  <p className="font-mono uppercase text-[10px] tracking-[0.3em] text-amber">Scout compensation</p>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">21-Day Revenue Diagnostic</p>
                        <span className="font-mono text-amber text-sm">15% of collected</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Example: $2,775 on an $18,500 paid diagnostic. One-time per client.
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">Active Case engagement</p>
                        <span className="font-mono text-amber text-sm">10% monthly</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        10% of collected monthly revenue for the client's first 12 paid months, while the account remains current and in good standing.
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">First custom implementation</p>
                        <span className="font-mono text-amber text-sm">10% of net collected</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Example: $2,500 on a $25,000 implementation. First implementation only, per client.
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">Founding Scout incentive <span className="text-emerald-400 text-xs font-mono ml-1">(optional launch bonus)</span></p>
                        <span className="font-mono text-emerald-400 text-sm">20% on first 3</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Founding Strategic Scouts receive 20% ($3,700 on $18,500) on their first three qualified paid diagnostics.
                      </p>
                    </div>
                  </div>
                </div>

                {/* First-year worked example */}
                <div className="rounded-xl border border-crimson/40 bg-crimson/5 p-4">
                  <p className="font-mono uppercase text-[10px] tracking-[0.3em] text-crimson mb-2">First-year worked example</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    $18,500 diagnostic + $10,000/mo Active Case × 12 months + $25,000 implementation =
                    <span className="font-mono text-amber font-semibold"> $17,275 total Scout compensation</span> on $163,500 of client revenue (10.6% effective).
                  </p>
                </div>

                {/* Rules that protect the payout */}
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <ShieldCheck className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Paid only after collection</p>
                    <p className="text-muted-foreground text-xs mt-1">Commissions earn after Aetheris receives cleared payment and any refund window has ended. No pay on refunds, disputes, or chargebacks.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <Rocket className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Documented warm intro</p>
                    <p className="text-muted-foreground text-xs mt-1">A qualified intro means a shared email, message, scheduled call, or written confirmation the owner has given permission to be contacted. Attribution holds for 12 months.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <DollarSign className="w-4 h-4 text-amber mb-1" />
                    <p className="font-semibold text-foreground">Collected net revenue</p>
                    <p className="text-muted-foreground text-xs mt-1">Commission excludes taxes, refunds, chargebacks, financing fees, vendor pass-throughs, ad spend, and client-purchased software.</p>
                  </div>
                </div>

                {/* Fit criteria */}
                <div className="rounded-lg border border-amber/30 bg-background/40 p-4">
                  <p className="font-mono uppercase text-[10px] tracking-[0.3em] text-amber mb-2">Who Aetheris is built for</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Established businesses with measurable revenue, active sales or marketing motion, operational complexity, and an owner who believes revenue, leads, time, or opportunities are being lost somewhere in the organization. Existing Aetheris clients, active opportunities, and companies already in the pipeline are excluded from attribution.
                  </p>
                </div>

                <Button
                  asChild
                  size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-bold shadow-[0_0_25px_rgba(217,169,58,0.4)]"
                >
                  <a href="https://obsidianvibe.live/api/public/share/094n00556o155b#submit" target="_blank" rel="noopener noreferrer">
                    Apply to become a Strategic Scout →
                  </a>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  1099 independent contractor · Final terms in the executed Strategic Scout agreement · Subject to legal, tax, and compliance review
                </p>
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
