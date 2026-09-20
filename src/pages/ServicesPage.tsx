import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import {
  CTA,
  ENGAGEMENT_STAGES,
  ENGAGEMENT_STAGES_HEADLINE,
  ENGAGEMENT_STAGES_INTRO,
  FOUNDER_TRUST,
  EXPECTATION_NOTE,
} from '@/lib/engagementModel';

const ServicesPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Services, Diagnostic + Active Case | Aetheris"
        description="Two stages. The 21-Day Revenue Diagnostic and the Active Case, the continuing engagement that stays live until the leaks are sealed and the partnership is earned."
        path="/services"
        keywords="revenue diagnostic, active case engagement, manufacturing CRM forensics"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Two stages. Earned, not sold.
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
                Diagnose, then earn the right to fix it.
              </h1>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                We don't sell à la carte. You start with the Diagnostic. If the findings are worth acting on, we open an Active Case — a continuing partnership whose terms we agree on openly once the value is clear.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="forensic-tile rounded-sm border border-amber/40 p-7 flex flex-col">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Stage 1 · Investigate</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground">21-Day Revenue Diagnostic</h2>
                <p className="text-xs text-muted-foreground mt-4">A one-time, scoped engagement. Terms are agreed up front — nothing else required to read the report.</p>
                <ul className="space-y-2 mt-5 text-sm text-foreground/85 flex-1">
                  {[
                    'Map every leak in CRM, sales follow-up, and lead flow',
                    'Written report with prioritized fixes + ROI',
                    'Source-data appendix, every CSV and query',
                    'CRM-agnostic (CSV export works)',
                  ].map((i) => (
                    <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />{i}</li>
                  ))}
                </ul>
                <Link to="/diagnostic" className="mt-6">
                  <Button className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(217,169,58,0.35)]">
                    {CTA.primary} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="forensic-tile rounded-sm border border-border/60 p-7 flex flex-col">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Stage 2 · Earned Partnership</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground">Active Case</h2>
                <p className="text-xs text-muted-foreground mt-4">Opened only for Diagnostic clients, once the value is proven. Case stays open until leaks are sealed; economics are agreed openly at that point.</p>
                <ul className="space-y-2 mt-5 text-sm text-foreground/85 flex-1">
                  {[
                    'We execute the prioritized fixes ourselves',
                    'CRM build / rebuild + data migration',
                    'Weekly readout, monthly metric re-measurement',
                    'Living Leak Register tracks every fix + recovery',
                    'Documented handoff so your team can run it',
                  ].map((i) => (
                    <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />{i}</li>
                  ))}
                </ul>
                <Link to="/implementation" className="mt-6">
                  <Button variant="outline" className="w-full glass-hover border-amber/40 text-amber font-bold">
                    {CTA.secondary} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-12 text-center forensic-tile rounded-sm border border-amber/30 p-6">
              <p className="text-foreground font-semibold">Methodology goes to every prospect before we discuss terms.</p>
              <Link to="/methodology" className="text-amber font-semibold hover:underline">Read it →</Link>
            </div>

            <section className="mt-16 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">How the relationship works</div>
              <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">{ENGAGEMENT_STAGES_HEADLINE}</h2>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{ENGAGEMENT_STAGES_INTRO}</p>
              <div className="grid md:grid-cols-5 gap-4 mt-8 text-left">
                {ENGAGEMENT_STAGES.map((stage) => (
                  <div key={stage.n} className="forensic-tile rounded-sm border border-border/60 p-4">
                    <div className="font-mono text-[10px] text-amber">{stage.n}</div>
                    <div className="font-forensic font-bold text-foreground mt-1">{stage.title}</div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{stage.line}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12 forensic-tile rounded-sm border border-amber/30 p-6 md:p-8">
              <p className="text-foreground/90 italic leading-relaxed">"{FOUNDER_TRUST.quote}"</p>
              <p className="text-xs text-muted-foreground mt-3 font-mono uppercase tracking-widest">{FOUNDER_TRUST.attribution}</p>
              <p className="text-xs text-muted-foreground mt-4">{EXPECTATION_NOTE}</p>
            </section>

            {/* Referral bonuses */}
            <section className="mt-16">
              <div className="text-center mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                  Referral Program
                </div>
                <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
                  Send us a deal. <span className="text-amber">Get paid when it closes.</span>
                </h2>
                <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                  If you introduce us to a specialty manufacturer and they sign, you collect, no contracts, no quotas, no fine print designed to dodge the payout.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <div className="forensic-tile rounded-sm border border-amber/40 p-6">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">When a Diagnostic closes</div>
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                    A reward is paid once the Diagnostic is signed and underway. We settle the details in a direct conversation, not a rate card.
                  </p>
                </div>

                <div className="forensic-tile rounded-sm border border-amber/40 p-6">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">While an Active Case stays open</div>
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                    Referrers whose introduction leads to an ongoing engagement continue to be recognized for as long as that case stays open.
                  </p>
                </div>

                <div className="forensic-tile rounded-sm border border-border/60 p-6">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">For a qualified conversation</div>
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                    Even if a referral doesn't sign, showing up to a real discovery call is worth something to us — and we say so directly, prospect by prospect.
                  </p>
                </div>
              </div>

              <div className="mt-6 forensic-tile rounded-sm border border-border/60 p-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Who qualifies</div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  US-based specialty manufacturer, $5M-$25M revenue, decision-maker on the call. We confirm fit on the discovery call, then talk openly about what your introduction is worth.
                </p>
              </div>

              <div className="mt-6 text-center">
                <Button onClick={() => setContactOpen(true)} size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(217,169,58,0.35)]">
                  {CTA.talk} about a referral <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Reps and partners on the internal program follow the terms in the rep portal; this is for outside referrers.
                </p>
              </div>
            </section>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default ServicesPage;
