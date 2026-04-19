import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { CEOProfile } from '@/components/CEOProfile';
import { TechLogos } from '@/components/TechLogos';
import { VerifiableOutcomes } from '@/components/VerifiableOutcomes';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { combineSchemas, personSchema } from '@/lib/schemas';

const AboutPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const jsonLd = combineSchemas(
    {
      '@type': 'AboutPage',
      mainEntity: {
        '@type': 'Organization',
        name: 'Aetheris AI',
        description: 'B2B AI consulting firm operating on a Co-CEO model — embedded in operations to expose revenue leaks and deploy AI automation.',
        foundingLocation: { '@type': 'Place', name: 'Indianapolis, Indiana' },
      },
    },
    personSchema(
      'Aetheris AI Founder',
      'CEO & AI Systems Architect',
      'Founder of Aetheris AI. Embeds as Co-CEO with B2B clients to expose operational revenue leaks and deploy AI agents, LLM workflows, and end-to-end automation.',
      ['https://www.linkedin.com/in/aisystemsarchitect', 'https://ctoguy.ai']
    )
  );

  const faqs = [
    { question: 'Who is Aetheris AI?', answer: 'A B2B AI consulting and technology firm headquartered in Indianapolis, Indiana. Aetheris AI embeds as a Co-CEO with US businesses to expose revenue leaks, rebuild broken systems, and deploy AI automation that delivers measurable ROI.' },
    { question: 'What does "Co-CEO model" mean?', answer: 'Instead of a traditional consulting engagement that hands over a deck, Aetheris AI embeds operationally — sitting next to leadership, owning outcomes, and shipping working AI systems alongside existing teams.' },
    { question: 'Where is Aetheris AI based?', answer: 'Indianapolis, Indiana. We serve clients across the entire United States with remote and on-site engagements.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="About Aetheris AI — Co-CEO for Operations"
        description="B2B AI consulting in Indianapolis. We embed into operations, expose inefficiencies, deploy AI agents and automation. US-wide."
        path="/about"
        keywords="AI consultant Indianapolis, B2B AI consulting, technology consultant, AI strategy consulting, fix your business consulting, digital transformation consultant"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
        faqs={faqs}
        speakable={['h1', 'h2', '.tldr']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <CEOProfile />
          <VerifiableOutcomes />
          <TechLogos />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AboutPage;
