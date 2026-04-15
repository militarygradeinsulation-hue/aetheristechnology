import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { SalesScriptGenerator } from '@/components/SalesScriptGenerator';

const SalesScriptsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI Sales Script Generator — Call Scripts, Objection Handlers & Follow-Ups"
        description="Generate tailored call scripts, objection handling guides, and follow-up templates for your industry. Free preview, full pack for $49."
        path="/sales-scripts"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">AI Sales Scripts</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              Close More Deals <span className="text-gradient-amber">With Better Scripts</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">AI-generated call scripts, objection handlers, and follow-up templates for your business.</p>
          </div>
          <SalesScriptGenerator />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default SalesScriptsPage;
