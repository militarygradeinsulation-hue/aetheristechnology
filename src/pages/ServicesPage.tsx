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
    { question: 'How much does Aetheris AI consulting cost?', answer: 'Services range from $50 (visual rendering) to $25,000+ (custom AI implementation). Key tiers: Visual Rendering $50–$400, Rapid Digital Evaluation $750, Ongoing Digital Oversight $1,500/month, 14-Day Diagnostic $7,500, Custom AI Implementation $25,000+.' },
    { question: 'What is the 14-Day Operational Diagnostic?', answer: 'A comprehensive 14-day operational breakdown identifying workflow inefficiencies, disconnected systems, and automation opportunities. Investment: $7,500 flat ($535/day). If meaningful operational gaps are not identified, the engagement continues at no extra cost.' },
    { question: 'Do you serve businesses outside Indianapolis?', answer: 'Yes. Aetheris AI is headquartered in Indianapolis but serves businesses across the entire United States with remote and on-site engagements.' },
    { question: 'Build vs. buy AI — which should I choose?', answer: 'Buy commodity AI (chatbots, transcription, generic copilots). Build when AI is core to competitive advantage, requires proprietary data, or must integrate deeply with bespoke workflows. We provide build vs. buy analysis as part of strategy consulting.' },
    { question: 'How do I reduce operational costs with AI?', answer: 'Fastest gains: automate repetitive workflows (CRM, lead routing, reporting), deploy AI agents for inbound triage and follow-up, use LLMs to compress knowledge work, and replace manual reporting with real-time dashboards.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI Consulting Services & Pricing | Aetheris AI"
        description="AI strategy, governance, automation, and ML/LLM implementation. From $50 visual renders to $25K+ custom AI builds. Indianapolis."
        path="/services"
        keywords="AI consulting services, AI strategy consulting, AI maturity assessment, build vs buy AI, AI ROI analysis, responsible AI, AI ethics, GDPR AI compliance, generative AI consulting, LLM implementation, AI agents, workflow automation, conversational AI, digital transformation consultant, technology consultant Indianapolis"
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
