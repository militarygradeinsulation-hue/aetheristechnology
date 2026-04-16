import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';

const FrictionAuditPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead title="Friction Vocabulary Audit | Aetheris AI" description="Find the exact words and phrases on your website that are weakening conversions. Free audit with stronger replacements." path="/friction-audit" />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">Executive Clarity Suite</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">Friction Vocabulary <span className="text-gradient-amber">Audit</span></h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Sometimes the problem isn't your offer. It's the words wrapping around it.</p>
          </div>
          <FrictionVocabularyAudit />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default FrictionAuditPage;
