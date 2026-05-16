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
        title="Catalog & Pricing — Tools, Packages & Monthly Plans | Aetheris"
        description="Browse every Aetheris package: one-time tools, monthly subscriptions, and mix-and-match bundles. Thumbnails, pricing, and instant checkout."
        path="/catalog"
        keywords="aetheris catalog, business tools pricing, monthly subscription, mix and match, sales tools, CRM tools"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Catalog', path: '/catalog' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28">
          <div className="px-4 max-w-7xl mx-auto text-center mb-8">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Full Catalog · One-time + Monthly
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              Every tool, every package, every price.
            </h1>
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
