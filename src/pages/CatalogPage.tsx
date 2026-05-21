import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { ServicesPricing } from '@/components/ServicesPricing';

const CatalogPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Premium Tech Suite, Tools, Packages & Monthly Plans | Aetheris"
        description="Browse the Aetheris Premium Tech Suite: one-time tools, monthly subscriptions, and mix-and-match bundles. Thumbnails, pricing, and instant checkout."
        path="/catalog"
        keywords="aetheris premium tech suite, business tools pricing, monthly subscription, mix and match, sales tools, CRM tools"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Premium Tech Suite', path: '/catalog' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28">
          <div className="px-4 max-w-3xl mx-auto mb-6">
            <div className="glass rounded-sm border border-amber/40 px-4 py-3 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                Proprietary · Built In-House
              </div>
              <p className="text-sm text-foreground/90 leading-snug">
                All technology in this suite is <span className="text-amber font-semibold">proprietary and personally built in-house</span>. You won't see reskinned tools or fake AI agencies here.
              </p>
            </div>
          </div>
          <div className="px-4 max-w-5xl mx-auto text-center mb-8">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Showcase
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              New Tech Launch <span className="text-amber">Showcase</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto mb-6">
              Every new system our company builds gets displayed here. Live, working, and yours to try.
            </p>
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Premium Tech Suite · One-time + Monthly
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.05]">
              Every tool, every package, every price.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Buy à la carte, subscribe monthly and save 25–40%, or mix and match across categories. No login required.
            </p>
          </div>

          <ServicesPricing />
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CatalogPage;
