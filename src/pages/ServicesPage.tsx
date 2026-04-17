import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Services } from '@/components/Services';
import { ServicesPricing } from '@/components/ServicesPricing';
import { ServiceCapabilities } from '@/components/ServiceCapabilities';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const ServicesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI Consulting Services & Pricing | Aetheris AI"
        description="AI strategy, governance, automation, and ML/LLM implementation. From $50 visual renders to $25K+ custom AI builds. Indianapolis."
        path="/services"
        keywords="AI consulting services, AI strategy consulting, AI maturity assessment, build vs buy AI, AI ROI analysis, responsible AI, AI ethics, GDPR AI compliance, generative AI consulting, LLM implementation, AI agents, workflow automation, conversational AI, digital transformation consultant, technology consultant Indianapolis"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "serviceType": "AI Consulting & Automation",
          "provider": { "@type": "Organization", "name": "Aetheris AI", "url": "https://aetheris.technology" },
          "areaServed": { "@type": "Country", "name": "United States" },
          "description": "Full-spectrum AI consulting: strategy, governance, generative AI, LLMs, AI agents, workflow automation, and ROI analysis."
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <ServicesPricing />
          <ServiceCapabilities />
          <Services />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ServicesPage;
