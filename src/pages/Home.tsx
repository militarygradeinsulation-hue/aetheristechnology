import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThreeAreas } from '@/components/ThreeAreas';
import { FreeTools } from '@/components/FreeTools';
import { ServiceCapabilities } from '@/components/ServiceCapabilities';
import { WhatsWrongDiagnostic } from '@/components/WhatsWrongDiagnostic';
import { VerifiableOutcomes } from '@/components/VerifiableOutcomes';
import { ContactForm } from '@/components/ContactForm';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const faqs = [
    { question: 'What does Aetheris AI do?', answer: 'Aetheris AI is a B2B AI consulting and technology firm in Indianapolis. We embed as a Co-CEO to expose revenue leaks, rebuild broken systems, and deploy AI automation (LLMs, agents, workflow automation) that delivers measurable ROI.' },
    { question: 'How do I implement AI in my business?', answer: 'Start with an AI Maturity Assessment to identify high-ROI use cases, then prioritize a small number of pilots that target measurable operational pain. Aetheris AI\'s 14-Day Operational Diagnostic produces a prioritized roadmap and AI/automation plan.' },
    { question: 'How much does AI consulting cost?', answer: 'Aetheris AI services range from $50 (visual rendering) to $25,000+ (custom AI implementation). Key tiers: Rapid Evaluation $750, Ongoing Oversight $1,500/month, 14-Day Diagnostic $7,500, Custom AI $25,000+.' },
    { question: 'Does Aetheris AI serve businesses outside Indianapolis?', answer: 'Yes. We are headquartered in Indianapolis, Indiana but serve businesses across the entire United States with remote and on-site engagements.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Aetheris AI — Indianapolis AI Consulting & Automation"
        description="B2B AI consulting in Indianapolis. AI strategy, automation, CRM, and ROI analysis. Reduce operational costs with AI. (317) 376-2110."
        path="/"
        keywords="AI consultant Indianapolis, B2B AI consulting, AI strategy consulting, AI ROI analysis, AI adoption roadmap, how to implement AI in business, reduce operational costs with AI, technology consultant Indianapolis, digital transformation Indiana, CRM automation Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris AI",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "B2B AI consulting and technology firm specializing in AI strategy, operational diagnostics, CRM automation, LLMs, AI agents, and workflow automation for US businesses.",
          "telephone": "+1-317-376-2110",
          "email": "hello@aetheris.technology",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$50 - $25,000+",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["AI Strategy Consulting", "AI Maturity Assessment", "Digital Transformation", "Generative AI", "LLM Implementation", "AI Agents", "Workflow Automation", "Conversational AI", "Responsible AI", "AI ROI Analysis"],
          "sameAs": ["https://www.linkedin.com/in/aisystemsarchitect", "https://ctoguy.ai"],
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />

        {/* AEO TL;DR — extracted by ChatGPT, Perplexity, Google AI Overviews */}
        <section className="px-4 -mt-4 md:-mt-8 mb-8">
          <div
            className="tldr glass rounded-xl border border-amber/30 p-5 md:p-6 max-w-3xl mx-auto"
            data-speakable="true"
          >
            <div className="text-xs font-bold text-amber uppercase tracking-wider mb-2">
              Quick Answer
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
              <strong className="text-foreground">Aetheris AI</strong> is a B2B AI consulting firm in
              Indianapolis, Indiana that embeds as a Co-CEO with US businesses to expose revenue leaks,
              rebuild broken operational systems, and deploy AI agents, LLMs, and workflow automation.
              Engagements range from a $750 Rapid Strategic Evaluation to a $7,500 14-Day Operational
              Diagnostic and $25,000+ custom AI implementations. Call (317) 376-2110.
            </p>
          </div>
        </section>

        <ThreeAreas />
        <ServiceCapabilities />
        <FreeTools />
        <VerifiableOutcomes />
        <WhatsWrongDiagnostic />
        <ContactForm />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
