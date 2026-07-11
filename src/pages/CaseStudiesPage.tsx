import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { SampleCaseFiles } from '@/components/SampleCaseFiles';
import { RealCaseStudiesSection } from '@/components/RealCaseStudiesSection';
import { combineSchemas, serviceSchema, faqSchema } from '@/lib/schemas';

const CaseStudiesPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const faqs = [
    {
      question: 'Are the sample case files real companies?',
      answer: 'The preliminary dossiers are fictional specimens built from recurring leakage patterns we see across similar revenue classes and industries. The 50 sourced case files link to real published studies.',
    },
    {
      question: 'What does the Leak Audit deliver per case study?',
      answer: 'Same deliverable shape across industries: leak map, dollar-quantified leaks, prioritized fixes, ROI projections, and a sealed report. The leak patterns differ by industry, that is what these case studies document.',
    },
    {
      question: 'How much is the Leak Audit?',
      answer: '$2,500 flat fee, operator-led. Applied 1:1 toward any engagement that follows.',
    },
    {
      question: 'How fast do you find the first leak?',
      answer: 'Free self-scan at /leak-audit runs in minutes. Operator-led Leak Audit surfaces first leaks inside Week 1.',
    },
  ];

  const jsonLd = combineSchemas(
    serviceSchema(
      'Case Studies',
      'Forensic Diagnostic case studies across 20+ industries and 50 real, sourced case files. See sample preliminary dossiers and verified published studies with dollar-quantified outcomes.',
      { serviceType: 'Revenue Operations Diagnostic', areaServed: 'United States' }
    ),
    faqSchema(faqs)
  );

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Case Studies | Aetheris"
        description="Forensic Diagnostic case studies and 50 verified, sourced case files. Sample preliminary dossiers plus real problem/fix/outcome studies from Salesforce, Shell, and mid-market operators."
        path="/case-studies"
        keywords="revenue leak audit case studies, 50 sourced case files, manufacturing diagnostic, construction bid leak, logistics quote response, healthcare intake leak, legal intake, SaaS churn audit"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Case Studies', path: '/case-studies' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-10 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-crimson text-sm font-case uppercase tracking-widest mb-6">
              Real cases. Real leaks. Real money recovered.
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Case Studies
            </h1>
            <p className="text-lg md:text-xl text-foreground/85 max-w-3xl mx-auto mb-4">
              Sample preliminary dossiers and 50 sourced, verified case files. Every study mirrors the leak-audit methodology: name the leak, trace the cause, quantify the damage, and recover the money.
            </p>
            <p className="text-base md:text-lg text-amber max-w-3xl mx-auto mb-8 font-case uppercase tracking-widest">
              One offer closes every leak on this page: <span className="text-foreground font-bold">The Leak Audit — $2,500 flat.</span>
            </p>
          </div>
        </section>

        <section id="sample-case-files" className="scroll-mt-24">
          <SampleCaseFiles />
        </section>

        <RealCaseStudiesSection />

        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto text-center forensic-tile rounded-sm p-10 border border-amber/30">
            <div className="font-case text-xs uppercase tracking-widest text-amber mb-3">
              Not seeing your situation?
            </div>
            <h2 className="font-forensic text-3xl md:text-4xl font-bold mb-4">
              The methodology travels.
            </h2>
            <p className="text-foreground/85 text-lg mb-8">
              If revenue moves through systems and people, there are leaks. $2,500 flat. Applied 1:1 toward engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center justify-center px-6 py-3 rounded-sm bg-amber text-background font-case uppercase tracking-widest text-xs hover:bg-amber/90 transition-colors"
              >
                Book a scoping call
              </button>
              <a
                href="/leak-audit"
                className="inline-flex items-center justify-center px-6 py-3 rounded-sm border border-amber/40 text-amber font-case uppercase tracking-widest text-xs hover:bg-amber/10 transition-colors"
              >
                Run the free self-scan
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default CaseStudiesPage;
