import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { SocialContentGenerator } from '@/components/SocialContentGenerator';

const ContentGeneratorPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Forensic Content Pack | Aetheris AI"
        description="Scan your website. Get 7 forensic LinkedIn posts, Case Files, Leak of the Week, Diagnostics, Field Notes, and Contrarian takes. Built on the five-format Business Forensics architecture."
        path="/content-generator"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">Business Forensics</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              Forensic Content <span className="text-gradient-amber">Pack</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Five formats. Each finds a leak, names a leak, or fixes a leak.</p>
          </div>
          <SocialContentGenerator />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ContentGeneratorPage;
