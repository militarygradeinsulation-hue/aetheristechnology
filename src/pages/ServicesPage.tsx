import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Services } from '@/components/Services';
import { ServicesPricing } from '@/components/ServicesPricing';
import { ServiceCapabilities } from '@/components/ServiceCapabilities';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { combineSchemas, serviceSchema } from '@/lib/schemas';

const ServicesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const jsonLd = combineSchemas(
    serviceSchema(
      'AI Strategy Consulting',
      'AI strategy, digital transformation, AI maturity assessment, build vs. buy analysis, and AI ROI analysis for US businesses.',
      { serviceType: 'AI Strategy Consulting', areaServed: 'United States' }
    ),
    serviceSchema(
      '14-Day Operational Systems Diagnostic',
      'Comprehensive 14-day operational breakdown identifying workflow inefficiencies, disconnected systems, and automation opportunities.',
      { price: '7500', serviceType: 'Operational Diagnostic', areaServed: 'United States' }
    ),
    serviceSchema(
      'AI Agents & Workflow Automation',
      'Deploy AI agents and workflow automation to reduce operational costs, eliminate manual work, and scale capacity without headcount.',
      { serviceType: 'AI Automation', areaServed: 'United States' }
    ),
    serviceSchema(
      'Custom AI Implementation',
      'End-to-end design and build of generative AI, LLM, and machine learning systems integrated into your operations.',
      { price: '25000', serviceType: 'AI Implementation', areaServed: 'United States' }
    )
  );

  const faqs = [
    { question: 'What does the Forensic Diagnostic cost?', answer: 'The Forensic Diagnostic is $2,500 flat — 14 days inside your operation with operator-led investigation. It produces a sealed case file naming and quantifying every revenue leak. The full $2,500 is applied toward a Co-CEO engagement if you proceed.' },
    { question: 'What is The Leak Audit™?', answer: 'A 7-step forensic methodology Aetheris runs on every business: Intake → Reconnaissance → Trace → Identify → Quantify → Prescribe → Seal. The free self-scan version lives at /leak-audit. The operator-led version is the Forensic Diagnostic.' },
    { question: 'Do you serve businesses outside Indianapolis?', answer: 'Yes. Aetheris is headquartered in Indianapolis and runs forensic engagements with US businesses remotely and on-site.' },
    { question: 'Why pay for a diagnosis instead of just hiring an agency?', answer: 'Because most "AI consultants" sell you the prescription before they\'ve done the autopsy. Paying $2,500 for the diagnosis filters tire-kickers, forces honest scope, and means the AI/automation/CRM work that follows is solving the actual leak — not the symptom.' },
    { question: 'What gets fixed after the diagnostic?', answer: 'Whatever the leak demanded: AI agents for inbound triage and follow-up, workflow automation for stalled handoffs, CRM rebuilds for visibility, or human process redesign. The diagnostic dictates the prescription — not a pre-packaged service menu.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Forensic Diagnostic & Engagements | Aetheris"
        description="The Forensic Diagnostic is $2,500 — 14 days inside your business naming every revenue leak. Then we rebuild with AI, automation, and CRM. Indianapolis."
        path="/services"
        keywords="forensic diagnostic, business autopsy, revenue leak audit, AI consulting Indianapolis, operational diagnostic, fractional CTO, AI agents, workflow automation, CRM implementation, business forensics operator"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Services & Pricing', path: '/services' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <ServicesPricing />
          <ServiceCapabilities />
          <Services />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ServicesPage;
