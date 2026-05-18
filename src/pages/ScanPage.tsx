import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { useStaffUnlock } from '@/hooks/useStaffUnlock';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { combineSchemas, howToSchema, softwareAppSchema } from '@/lib/schemas';

const ScanPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const staffUnlock = useStaffUnlock();

  const jsonLd = combineSchemas(
    softwareAppSchema(
      'AI Website Gap Analysis',
      'Free 30-second AI-powered website scan that identifies SEO issues, weak CTAs, and missed conversion opportunities with revenue leak estimates.',
      '/scan'
    ),
    howToSchema(
      'How to Run a Free AI Website Audit',
      'Get an AI-powered scan of your site in 30 seconds, SEO, conversion, and digital transformation gaps.',
      [
        { name: 'Enter your website URL', text: 'Paste any public URL into the scanner.' },
        { name: 'Run the AI scan', text: 'Our scanner analyzes your site for SEO, CTAs, conversion friction, and AI/automation gaps.' },
        { name: 'Review your gap report', text: 'Get a prioritized list of issues weakening your conversions and a revenue leak estimate.' },
        { name: 'Fix or book a call', text: 'Apply the fixes yourself or book a discovery call with Aetheris AI to remediate at scale.' },
      ],
      'PT30S'
    )
  );

  const faqs = [
    { question: 'How does the AI website scanner work?', answer: 'Paste any public URL and our scanner uses AI to analyze SEO signals, CTA strength, conversion friction, technical performance, and missing AI/automation opportunities, in about 30 seconds.' },
    { question: 'Is the website scan free?', answer: 'Yes. The basic AI gap analysis is 100% free with no login. Deeper paid tiers are available if you want a full revenue-leak audit and remediation plan.' },
    { question: 'What does the scan check for?', answer: 'SEO meta tags and structure, weak or missing CTAs, conversion friction, page speed, mobile readiness, content gaps, and missing automation opportunities.' },
    { question: 'How accurate is the AI scan?', answer: 'The scan is a directional audit using public-facing signals. For an exhaustive review, our 14-Day Operational Diagnostic includes hands-on analysis of your full funnel.' },
    { question: 'Can I get a PDF report?', answer: 'Yes, paid tiers include a downloadable PDF report with prioritized fixes and revenue leak estimates.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Free AI Website Gap Analysis | Aetheris AI"
        description="AI website analysis in 30 seconds. SEO, weak CTAs, missed conversions, with digital transformation audit + revenue leak estimates."
        path="/scan"
        keywords="AI website analysis, digital transformation audit, website SEO scan, conversion optimization audit, AI consulting Indianapolis, revenue leak analysis, performance optimization"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Website Gap Analysis', path: '/scan' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-20">
          <WebsiteScanner onContactClick={() => setIsContactModalOpen(true)} staffUnlock={staffUnlock} />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ScanPage;
