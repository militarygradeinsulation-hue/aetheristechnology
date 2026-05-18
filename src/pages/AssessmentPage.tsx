import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { AIReadinessAssessment } from '@/components/AIReadinessAssessment';
import { combineSchemas, howToSchema, softwareAppSchema } from '@/lib/schemas';

const AssessmentPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const jsonLd = combineSchemas(
    softwareAppSchema(
      'AI Readiness Assessment',
      'Free 2-minute AI maturity assessment scoring your business across automation, CRM, data, and adoption readiness.',
      '/assessment'
    ),
    howToSchema(
      'How to Assess Your Business AI Readiness',
      'Score your AI maturity in under 2 minutes and get a personalized adoption roadmap.',
      [
        { name: 'Open the AI Readiness Assessment', text: 'Visit aetheris.technology/assessment to start the free 5-question diagnostic.', url: 'https://aetheris.technology/assessment' },
        { name: 'Answer 5 questions about your operations', text: 'Tell us about your current automation, CRM use, data hygiene, AI adoption, and team capability.' },
        { name: 'Get your readiness score', text: 'Receive an instant maturity score with a category-by-category breakdown.' },
        { name: 'Receive a roadmap', text: 'See where you are losing efficiency and the highest-ROI AI use cases to pursue first.' },
      ],
      'PT2M'
    )
  );

  const faqs = [
    { question: 'What is an AI maturity assessment?', answer: 'A structured evaluation of how prepared a business is to adopt AI, covering data quality, process maturity, team capability, infrastructure, and governance. Aetheris AI offers a free 2-minute version.' },
    { question: 'How long does the AI Readiness Assessment take?', answer: 'About 2 minutes. You answer 5 quick questions about your operations and receive an instant maturity score with a personalized roadmap.' },
    { question: 'Is the AI Readiness Assessment really free?', answer: 'Yes. The 5-question assessment is 100% free with no login or credit card required. You receive an instant score and a category-by-category breakdown.' },
    { question: 'What does the assessment score me on?', answer: 'Automation maturity, CRM and data infrastructure, AI adoption stage, team capability, and operational efficiency. The score identifies where you are leaking time and money.' },
    { question: 'What happens after I get my score?', answer: 'You see a prioritized list of AI use cases to pursue first. From there, you can book a discovery call or run our deeper 14-Day Operational Diagnostic ($7,500).' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Free AI Readiness Assessment | Aetheris AI"
        description="2-minute AI Maturity Assessment. Score your AI readiness across automation, CRM, and adoption. Instant roadmap."
        path="/assessment"
        keywords="AI readiness assessment, AI maturity assessment, AI maturity audit, AI adoption roadmap, AI strategy consulting, use case prioritization, build vs buy AI, AI ROI analysis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AI Readiness Assessment', path: '/assessment' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                Free, Takes 2 Minutes
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground font-display mb-4">
                How <span className="text-gradient-amber">AI-Ready</span> Is Your Business?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Answer 5 quick questions about your operations and get an instant readiness score 
                with a personalized breakdown of where you're losing efficiency, and money.
              </p>
            </div>

            {/* AEO TL;DR */}
            <div
              className="tldr glass rounded-xl border border-amber/30 p-5 mb-10 max-w-2xl mx-auto"
              data-speakable="true"
            >
              <div className="text-xs font-bold text-amber uppercase tracking-wider mb-2">
                Quick Answer
              </div>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
                The AI Readiness Assessment is a free 2-minute, 5-question diagnostic that scores your
                business on automation, CRM, data, adoption, and team capability, then returns a
                prioritized AI roadmap with the highest-ROI use cases for your operation.
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
