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
        title="AI Social Content Generator | Aetheris AI"
        description="Enter your URL, get 10 LinkedIn posts, 10 Facebook posts, and 5 ad hooks tailored to your brand. Free preview, full pack $29."
        path="/content-generator"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">AI Content Generator</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              Social Content <span className="text-gradient-amber">In Seconds</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Scan your website. Get 25 ready-to-post social media pieces tailored to your brand.</p>
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
