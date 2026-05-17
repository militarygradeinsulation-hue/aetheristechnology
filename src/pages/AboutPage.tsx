import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { OperatorBio } from '@/components/OperatorBio';
import { TechLogos } from '@/components/TechLogos';
import { VerifiableOutcomes } from '@/components/VerifiableOutcomes';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { combineSchemas, personSchema } from '@/lib/schemas';
import { generateCredentialsPdf } from '@/lib/generateCredentialsPdf';

const CRED_BLOCKS: { label: string; body: string }[] = [
  { label: 'Background', body: '20 years building revenue systems for manufacturers. Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm with SpaceX accounts.' },
  { label: 'Prior operator roles', body: 'Director of Strategy, $25M aerospace contract manufacturer. Revenue operations, CRM implementation, and sales-process rebuild for specialty manufacturing across construction, aerospace, and equipment categories.' },
  { label: 'Education', body: 'B.A. in Psychology and Communication. M.S. in Business Marketing. Foundation in human behavior, persuasion, and the marketing systems that move B2B revenue.' },
  { label: 'Certifications', body: 'Vibe Coding — Semrush (L5: Diamond, sourced from Lovable). Gemini 3 (AI Synthesis) — Google. AI for Business — Harvard edX AI for Business Systems. AI Engineer — IBM AI Engineering. HubSpot Certification — HubSpot. Biomedical & Health Science Researchers — CITI Program (Credential ID 76234047). Google Analytics Individual Qualification — Google Operations Center. Marketing & Analytics — Google Digital Academy (Skillshop).' },
  { label: 'Company', body: 'Aetheris. Headquartered in Indianapolis, Indiana. US-wide engagements remote and on-site. Intellectual property held by CTOguy.ai.' },
  { label: 'Business continuity', body: 'Sales calls run by Joseph Toney. Active engagements delivered jointly with operating partner. Client files, contracts, and credentials live in a documented, partner-accessible system. Continuity contact and escalation path provided to every retained client.' },
];

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

          <section className="px-4 py-16">
            <div className="max-w-3xl mx-auto">
              <div className="mb-8">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                  Credentials · Aetheris
                </div>
                <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground leading-tight">
                  Joseph Toney — Architect.
                </h2>
                <p className="text-lg text-muted-foreground mt-4">
                  Background, certifications, prior operator roles, and the business-continuity plan procurement teams ask for.
                </p>
                <div className="mt-5">
                  <Button onClick={() => generateCredentialsPdf()} className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    <Download className="w-4 h-4 mr-2" />
                    Download as PDF
                  </Button>
                </div>
              </div>
              <div className="space-y-5">
                {CRED_BLOCKS.map((b) => (
                  <section key={b.label} className="forensic-tile rounded-sm border border-border/60 p-6">
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">{b.label}</div>
                    <p className="text-foreground/85 leading-relaxed">{b.body}</p>
                  </section>
                ))}
              </div>
            </div>
          </section>

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
