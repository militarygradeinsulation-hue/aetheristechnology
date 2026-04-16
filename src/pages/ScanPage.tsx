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
        title="Free Website Gap Analysis | Aetheris AI"
        description="Scan your site in 30 seconds. AI finds SEO issues, weak CTAs, and missed conversions — with revenue leak estimates."
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
