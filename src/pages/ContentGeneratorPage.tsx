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
        title="LinkedIn Growth Content Pack | Aetheris AI"
        description="Scan your website. Get 13 strategic LinkedIn posts using Brandjacking, Newsjacking, Namejacking, and Hot Takes — built on the four-pillar growth framework."
        path="/content-generator"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">LinkedIn Growth Framework</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              Growth Content <span className="text-gradient-amber">In Seconds</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Scan your website. Get 13 strategic posts using Brandjacking, Newsjacking, Namejacking &amp; Hot Takes.</p>
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
