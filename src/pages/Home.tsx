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
