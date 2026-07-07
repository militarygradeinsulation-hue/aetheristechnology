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
      <main className="relative z-10 pt-32 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Case-file header — forensic, matches home aesthetic */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">
                Case Intake · Free Self-Scan
              </span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-[1.05] tracking-tight">
              The <span className="text-amber italic">Leak Audit</span> — self-scan.
            </h1>
            <p className="mt-3 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
              20 questions · 5 minutes · directional findings
            </p>
          </div>

          <div className="forensic-tile rounded-sm border border-amber/30 bg-background/70 backdrop-blur-xl p-5 md:p-8 relative">
            <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-crimson border border-crimson/40 px-2 py-0.5 rounded-sm bg-crimson/5">
              Active case
            </div>
            <BusinessDiagnostic />
          </div>

          {/* Optional deeper scan — no pitch, just the instrument */}
          <div className="mt-10">
            <div className="text-center mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">
                Companion instrument
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold leading-tight">
                Website Chaos Scan
              </h2>
            </div>
          </div>
        </div>
      </main>
      <WebsiteScanner onContactClick={() => setIsContactOpen(true)} hideHeader />
      <Footer />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

export default DiagnosticQuizPage;
