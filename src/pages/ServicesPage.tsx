import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';

const ServicesPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Services — 21-Day Diagnostic + Implementation | Aetheris"
        description="Two offers. The 21-Day Revenue Diagnostic ($18,500 fixed fee) and Implementation Retainer ($15K/mo, Diagnostic clients only)."
        path="/services"
        keywords="revenue diagnostic, implementation retainer, manufacturing CRM consulting"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Two offers. That's it.
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
                Diagnose, then implement.
              </h1>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                We don't sell à la carte. You start with the Diagnostic. If you want us to fix what we find, we run the implementation retainer.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="premium-tile rounded-sm border border-amber/40 p-7 flex flex-col">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Step 1 · Sales-led</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground">21-Day Revenue Diagnostic</h2>
                <div className="font-forensic text-5xl font-bold text-foreground mt-4">$18,500</div>
                <p className="text-xs text-muted-foreground mt-1">Fixed fee. One-time. No retainer required.</p>
                <ul className="space-y-2 mt-5 text-sm text-foreground/85 flex-1">
                  {[
                    'Map every leak in CRM, sales follow-up, and lead flow',
                    'Written report with prioritized fixes + ROI',
                    'Source-data appendix — every CSV and query',
                    'CRM-agnostic (CSV export works)',
                  ].map((i) => (
                    <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />{i}</li>
                  ))}
                </ul>
                <Link to="/diagnostic" className="mt-6">
                  <Button className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    See the Diagnostic <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="premium-tile rounded-sm border border-border/60 p-7 flex flex-col">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Step 2 · Diagnostic clients only</div>
                <h2 className="font-forensic text-2xl font-bold text-foreground">Implementation Retainer</h2>
                <div className="font-forensic text-5xl font-bold text-foreground mt-4">$15,000<span className="text-xl text-muted-foreground"> /mo</span></div>
                <p className="text-xs text-muted-foreground mt-1">3-month minimum. Operator-led execution.</p>
                <ul className="space-y-2 mt-5 text-sm text-foreground/85 flex-1">
                  {[
                    'We execute the prioritized fixes ourselves',
                    'CRM build / rebuild + data migration',
                    'Weekly readout, monthly metric re-measurement',
                    'Documented handoff so your team can run it',
                  ].map((i) => (
                    <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />{i}</li>
                  ))}
                </ul>
                <Link to="/implementation" className="mt-6">
                  <Button variant="outline" className="w-full glass-hover border-amber/40 text-amber">
                    Implementation details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-12 text-center premium-tile rounded-sm border border-amber/30 p-6">
              <p className="text-foreground font-semibold">Methodology goes to every prospect before pricing.</p>
              <Link to="/methodology" className="text-amber font-semibold hover:underline">Read it →</Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default ServicesPage;
