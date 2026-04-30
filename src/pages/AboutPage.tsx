import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { OperatorBio } from '@/components/OperatorBio';
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
        name: 'Aetheris',
        description: 'Business Forensics Operator. Runs The Leak Audit™ methodology on B2B operations to expose revenue leaks before deploying AI, automation, or CRM.',
        foundingLocation: { '@type': 'Place', name: 'Indianapolis, Indiana' },
      },
    },
    personSchema(
      'Joseph Toney',
      'Business Forensics Operator',
      'Founder of Aetheris. Marine Corps veteran with a psychology background. Runs forensic audits on B2B operations to expose revenue leaks, then rebuilds with AI agents, automation, and CRM.',
      ['https://www.linkedin.com/in/thejosephtoney', 'https://ctoguy.ai']
    )
  );

  const faqs = [
    { question: 'Who is Joseph Toney?', answer: 'Founder of Aetheris and a Business Forensics Operator. Marine Corps veteran with a psychology degree and 20 years building production systems. Runs The Leak Audit™ methodology on B2B operations to find where revenue is bleeding before deploying any AI or automation.' },
    { question: 'What does "Business Forensics Operator" mean?', answer: 'Not a consultant. Not an agency. An operator who autopsies businesses — names every revenue leak, quantifies the dollar bleed, and then rebuilds the systems that hid the leaks in the first place.' },
    { question: 'Where is Aetheris based?', answer: 'Indianapolis, Indiana. Forensic engagements run with US businesses remotely and on-site.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Joseph Toney — Business Forensics Operator | Aetheris"
        description="Marine veteran, psychology background, 20 years building systems. Runs forensic audits on B2B operations to find revenue leaks before deploying AI."
        path="/about"
        keywords="Joseph Toney, business forensics operator, AI consultant Indianapolis, revenue leak audit, B2B operations consultant, fix your business consulting"
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
          <OperatorBio />
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
