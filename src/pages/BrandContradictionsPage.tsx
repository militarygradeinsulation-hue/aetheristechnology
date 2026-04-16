import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { BrandContradictionFinder } from '@/components/BrandContradictionFinder';

const BrandContradictionsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead title="Brand Contradiction Finder | Aetheris AI" description="Buyers feel contradiction before they can explain it. Find where trust in your brand is quietly weakening — free preview." path="/brand-contradictions" />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">Executive Clarity Suite</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">Brand Contradiction <span className="text-gradient-amber">Finder</span></h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Your buyers can feel contradiction before they can explain it. This tool shows you where trust is being weakened in silence.</p>
          </div>
          <BrandContradictionFinder />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default BrandContradictionsPage;
