import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { StrategicQuestionEngine } from '@/components/StrategicQuestionEngine';

const StrategicQuestionsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead title="Strategic Question Engine — Expose Business Blind Spots" description="Stop guessing. Get a custom question map that exposes blind spots across leadership, sales, marketing, operations, and growth. Free preview included." path="/strategic-questions" />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">Executive Clarity Suite</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">Strategic Question <span className="text-gradient-amber">Engine</span></h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">The quality of your business is directly tied to the quality of the questions being asked inside it.</p>
          </div>
          <StrategicQuestionEngine />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default StrategicQuestionsPage;
