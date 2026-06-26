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
import homeHeroBanner from '@/assets/home-hero-banner.jpg.asset.json';

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
                src={homeHeroBanner.url}
                alt="Your business is leaking. You just can't see it from inside the building. Aetheris Business Forensics finds hidden revenue leaks, turns real data into insight, and keeps your business confidential."
                className="w-full h-auto rounded-sm border border-amber/20 shadow-2xl"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </section>

          <section className="px-4 py-10 max-w-4xl mx-auto text-center">
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Most growth-stage businesses are bleeding{" "}
              <span className="text-crimson italic">time</span>,{" "}
              <span className="text-crimson italic">leads</span>, and{" "}
              <span className="text-crimson italic">revenue</span> without knowing where.
            </h2>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              I help established businesses uncover what is actually broken beneath the surface.
              Not just your marketing. Your entire business. I run True Cost Forensics, show you
              exactly what is broken and what it is costing you, then build the systems to fix it.
            </p>
            <p className="mt-4 text-sm text-amber font-case uppercase tracking-widest">
              Marine Corps veteran · MS Marketing, Liberty University, 4.0 GPA · Doctorate in Digital Forensics · Based in Noblesville, Indiana
            </p>
          </section>

          {/* One offer · The Leak Audit */}
          <section id="the-leak-audit" className="px-4 pb-12 scroll-mt-24">
            <div className="max-w-5xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-10 relative overflow-hidden">
              <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-crimson border border-crimson/40 px-2 py-0.5 rounded-sm bg-crimson/5">
                Active case
              </div>
              <div className="font-case text-[10px] md:text-xs uppercase tracking-widest text-amber mb-3">
                One offer · One operator · $2,500 flat
              </div>
              <h2 className="font-forensic text-3xl md:text-5xl font-bold leading-tight mb-4">
                The Leak Audit. <span className="text-crimson italic">That's the whole offer.</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground max-w-3xl mb-6 leading-relaxed">
                No tiers. No upsell ladder. No à la carte tools. One operator-led forensic diagnostic that runs every
                instrument we have against your business, names the leaks, prices the bleed, and hands you a fix plan.
                The $2,500 applies 1:1 toward any engagement that follows.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: FileSearch, label: 'Forensic scan', body: 'Website, sales process, follow-up, brand, and revenue surfaces audited end-to-end.' },
                  { icon: Gauge, label: 'Priced bleed', body: 'Every leak quantified in dollars per year so you know what each one is actually costing.' },
                  { icon: CheckCircle2, label: 'Fix plan', body: 'A prioritized leak ledger you can hand to your team or hand back to us to execute.' },
                ].map((c) => (
                  <div key={c.label} className="rounded-sm border border-border/60 bg-background/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <c.icon className="w-4 h-4 text-amber" />
                      <div className="font-case text-[10px] uppercase tracking-widest text-amber">{c.label}</div>
                    </div>
                    <p className="text-xs text-foreground/85 leading-snug">{c.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/leak-audit">
                  <Button className="bg-amber text-background hover:bg-amber/90 font-semibold w-full sm:w-auto">
                    See the Leak Audit <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('public-leak-scan')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10"
                >
                  <Search className="w-4 h-4" /> Run the free pre-scan first
                </button>
              </div>
            </div>
          </section>

          <PublicLeakScan />

          <section id="book" className="relative px-4 pt-4 pb-16 scroll-mt-24">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">
                Or skip the scan — talk to the operator
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
