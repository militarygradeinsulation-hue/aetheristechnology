import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { BusinessDiagnostic } from '@/components/BusinessDiagnostic';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { SEOHead } from '@/components/SEOHead';
import { combineSchemas, howToSchema, softwareAppSchema } from '@/lib/schemas';

const DiagnosticQuizPage: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  const jsonLd = combineSchemas(
    softwareAppSchema(
      'Free Business Diagnostic',
      '20-question diagnostic that identifies revenue leaks across marketing, conversion, branding, systems, and growth strategy.',
      '/business-diagnostic'
    ),
    howToSchema(
      'How to Find Hidden Revenue Leaks in Your Business',
      'Run a free 20-question diagnostic to surface where your business is quietly losing money.',
      [
        { name: 'Open the Business Diagnostic', text: 'Go to aetheris.technology/business-diagnostic.' },
        { name: 'Answer 20 quick questions', text: 'Cover marketing, conversion, branding, systems, and growth.' },
        { name: 'Get your category scores', text: 'See exactly which area is bleeding revenue and why.' },
        { name: 'Download your action plan', text: 'Receive a prioritized list of fixes, DIY or book a call to remediate.' },
      ],
      'PT5M'
    )
  );

  const faqs = [
    { question: 'What is the Business Diagnostic?', answer: 'A free 20-question self-assessment that identifies where your business is leaking revenue across marketing, conversion, branding, operational systems, and growth strategy.' },
    { question: 'How long does the diagnostic take?', answer: 'About 5 minutes. You answer 20 quick questions and get instant scoring across five categories with a personalized PDF report.' },
    { question: 'Is the Business Diagnostic free?', answer: 'Yes. The full 20-question diagnostic and PDF report are completely free with no credit card or login required.' },
    { question: 'What does it diagnose?', answer: 'Marketing efficiency, conversion friction, brand clarity, operational systems and automation gaps, and growth strategy maturity.' },
    { question: 'How is this different from the AI Readiness Assessment?', answer: 'The AI Readiness Assessment focuses on AI maturity (5 questions). The Business Diagnostic is broader, 20 questions covering all five revenue-leak categories of your operation.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Free Business Diagnostic | Aetheris AI"
        description="Find revenue leaks fast. 20-question business diagnostic + AI operational efficiency score. Free, instant results."
        path="/business-diagnostic"
        keywords="business diagnostic, operational efficiency AI, reduce operational costs with AI, AI maturity assessment, fix your business, AI consulting Indianapolis, revenue leak diagnostic"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Business Diagnostic', path: '/business-diagnostic' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <Navbar onContactClick={() => setIsContactOpen(true)} />
      <main className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-xl p-6 md:p-10 shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">🔥 Free Business Diagnostic</span>
              <h1 className="text-4xl md:text-5xl font-bold font-display mt-3 text-foreground">
                Where Is Your Business<br />Quietly Losing Money?
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Answer 20 quick questions to uncover hidden revenue leaks in your marketing, conversion, branding, systems, and growth strategy.
              </p>
            </div>

            {/* AEO TL;DR */}
            <div
              className="tldr rounded-xl border border-amber/30 bg-amber/5 p-5 mb-10 max-w-2xl mx-auto"
              data-speakable="true"
            >
              <div className="text-xs font-bold text-amber uppercase tracking-wider mb-2">
                Quick Answer
              </div>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
                The Business Diagnostic is a free 20-question, 5-minute audit that scores your business
                on marketing, conversion, branding, systems, and growth, and returns a category-by-category
                breakdown of where revenue is leaking, with prioritized fixes.
              </p>
            </div>

            <BusinessDiagnostic />
          </div>
        </div>
      </main>

      <div className="relative z-10 pt-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">🔍 Bonus Tool</span>
          <h2 className="text-3xl md:text-4xl font-bold font-display mt-3 text-foreground">
            Want a Deeper Look at Your Website?
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Run a free AI-powered scan to uncover SEO issues, weak CTAs, and missed conversion opportunities, instantly.
          </p>
        </div>
      </div>
      <WebsiteScanner onContactClick={() => setIsContactOpen(true)} hideHeader />
      <Footer />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

export default DiagnosticQuizPage;
