import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { AIReadinessAssessment } from '@/components/AIReadinessAssessment';

const AssessmentPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Free AI Readiness Assessment | Aetheris AI"
        description="2-minute AI Readiness Assessment. See where your business stands on automation, CRM, and AI adoption. Instant score + recommendations."
        path="/assessment"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                Free — Takes 2 Minutes
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground font-display mb-4">
                How <span className="text-gradient-amber">AI-Ready</span> Is Your Business?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Answer 5 quick questions about your operations and get an instant readiness score 
                with a personalized breakdown of where you're losing efficiency — and money.
              </p>
            </div>
            <AIReadinessAssessment />
          </div>
        </section>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AssessmentPage;
