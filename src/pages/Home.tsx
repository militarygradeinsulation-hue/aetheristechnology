import React, { useEffect, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { PublicLeakScan } from '@/components/PublicLeakScan';
import landingInfographicAsset from '@/assets/landing-infographic.png.asset.json';

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
        title="Find Where Your Leads Went | Aetheris"
        description="One scan. Find where your leads leaked out — and exactly how to get them back."
        path="/home"
        keywords="lead leak scan, revenue recovery, business forensics, Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        speakable={['h1']}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <main>
          <section className="px-4 pt-28 md:pt-36 pb-6">
            <h1 className="sr-only">
              One button finds where your leads are leaking and instantly begins getting them back.
            </h1>
            <div className="max-w-6xl mx-auto">
              <img
                src={landingInfographicAsset.url}
                alt="Aetheris Business Forensics: One button finds where your leads are leaking and begins getting them back. 4-step process: press, find leaks, recover leads, see the return."
                className="w-full h-auto rounded-sm border border-amber/20 shadow-2xl"
                loading="eager"
                fetchPriority="high"
              />
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
