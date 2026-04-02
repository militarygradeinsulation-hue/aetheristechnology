import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const ScanPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Free Website Gap Analysis"
        description="Scan your website in under 30 seconds. Our AI identifies SEO issues, weak CTAs, messaging gaps, and missed conversion opportunities — with revenue leak estimates and a strategic roadmap."
        path="/scan"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-20">
          <WebsiteScanner onContactClick={() => setIsContactModalOpen(true)} />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ScanPage;
