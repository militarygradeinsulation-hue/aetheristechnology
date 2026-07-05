import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileSearch, Gauge, Search } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { PublicLeakScan } from '@/components/PublicLeakScan';
import { Button } from '@/components/ui/button';
import signatureCard from '@/assets/joseph-toney-signature-card.jpg.asset.json';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const existing = document.querySelector('script[src*="MeetingsEmbedCode.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Business Forensics Operator | Aetheris"
        description="Most growth-stage businesses are bleeding time, leads, and revenue without knowing where. I help established businesses uncover what is actually broken beneath the surface and build the systems to fix it."
        path="/home"
        keywords="business forensics, revenue leak audit, True Cost Forensics, Indianapolis, operator"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        speakable={['h1']}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <main>
          <section className="px-4 pt-28 md:pt-36 pb-6">
            <h1 className="sr-only">
              Most growth-stage businesses are bleeding time, leads, and revenue without knowing where.
              Aetheris Business Forensics finds the leak, quantifies the cost, and builds the systems to fix it.
            </h1>
            <div className="max-w-6xl mx-auto">
              <img
                src={signatureCard.url}
                alt="Joseph Toney — AI Architect, IBM AI Certified, Aetheris Technology"
                className="w-full h-auto rounded-sm border border-amber/20 shadow-2xl"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </section>

          <section className="px-4 py-8 max-w-3xl mx-auto text-center">
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
              We find where your business is{" "}
              <span className="text-crimson italic">leaking money</span>.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Then we close it. $2,500 flat.
            </p>
          </section>

          {/* One offer · The Leak Audit */}
          <section id="the-leak-audit" className="px-4 pb-10 scroll-mt-24">
            <div className="max-w-4xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-crimson border border-crimson/40 px-2 py-0.5 rounded-sm bg-crimson/5">
                Active case
              </div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                The offer
              </div>
              <h2 className="font-forensic text-3xl md:text-4xl font-bold leading-tight mb-6">
                The Leak Audit — $2,500 flat.
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: FileSearch, label: 'Scan', body: 'Website, sales, follow-up, ops — audited end-to-end.' },
                  { icon: Gauge, label: 'Price', body: 'Every leak quantified in dollars per year.' },
                  { icon: CheckCircle2, label: 'Fix', body: 'Prioritized ledger. Fee credits toward the build.' },
                ].map((c) => (
                  <div key={c.label} className="rounded-sm border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <c.icon className="w-4 h-4 text-amber" />
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber">{c.label}</div>
                    </div>
                    <p className="text-xs text-foreground/85 leading-snug">{c.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/leak-audit" className="w-full sm:w-auto">
                  <Button className="bg-amber text-background hover:bg-amber/90 font-semibold w-full">
                    Start the Leak Audit <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('public-leak-scan')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10"
                >
                  <Search className="w-4 h-4" /> Free 60-second pre-scan
                </button>
              </div>
            </div>
          </section>

          <PublicLeakScan />

          <section id="book" className="relative px-4 pt-4 pb-16 scroll-mt-24">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">
                Or talk to the operator
              </p>
              <button
                onClick={() => {
                  const el = document.getElementById('booking-embed');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-muted-foreground hover:text-amber underline underline-offset-4"
              >
                Book a 30-minute call →
              </button>
              <div id="booking-embed" className="forensic-tile rounded-sm border border-amber/30 p-2 md:p-4 mt-6">
                <div
                  className="meetings-iframe-container"
                  data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
                />
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
