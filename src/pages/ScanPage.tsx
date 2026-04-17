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
        title="Free AI Website Gap Analysis | Aetheris AI"
        description="AI website analysis in 30 seconds. SEO, weak CTAs, missed conversions — with digital transformation audit + revenue leak estimates."
        path="/scan"
        keywords="AI website analysis, digital transformation audit, website SEO scan, conversion optimization audit, AI consulting Indianapolis, revenue leak analysis, performance optimization"
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
