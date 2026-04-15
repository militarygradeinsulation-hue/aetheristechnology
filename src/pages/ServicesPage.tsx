import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Services } from '@/components/Services';
import { ServicesPricing } from '@/components/ServicesPricing';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const ServicesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Business Consulting & AI Automation Services"
        description="AI business consulting Indianapolis — from $50 visual renders to $25K+ custom AI implementations. Operational diagnostics, CRM restructuring, sales automation, and digital oversight for US businesses."
        path="/services"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "serviceType": "Business Consulting & AI Automation",
          "provider": { "@type": "Organization", "name": "Aetheris AI", "url": "https://aetheris.technology" },
          "areaServed": { "@type": "Country", "name": "United States" },
          "description": "Full-spectrum business consulting services including operational diagnostics, CRM development, AI automation strategy, and ongoing digital oversight."
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24"><Services /></div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ServicesPage;
