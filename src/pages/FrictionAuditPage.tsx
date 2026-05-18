import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';
import { combineSchemas, howToSchema, softwareAppSchema } from '@/lib/schemas';
import { useStaffUnlock } from '@/hooks/useStaffUnlock';

const FrictionAuditPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const staffUnlock = useStaffUnlock();

  const jsonLd = combineSchemas(
    softwareAppSchema(
      'Friction Vocabulary Audit',
      'AI-powered tool that identifies the exact words and phrases on your website weakening conversions, with stronger replacements.',
      '/friction-audit'
    ),
    howToSchema(
      'How to Audit Your Website Copy for Conversion Friction',
      'Find the exact words on your site that are killing your conversions and get stronger replacements.',
      [
        { name: 'Enter your website URL or paste copy', text: 'Provide a URL or paste the copy you want audited.' },
        { name: 'Run the AI vocabulary scan', text: 'The audit identifies weak verbs, hedge words, jargon, and friction phrases.' },
        { name: 'Review flagged phrases', text: 'See each weak phrase, why it weakens conversion, and a stronger replacement.' },
        { name: 'Apply or implement', text: 'Update your copy yourself or book a call for a full conversion rewrite.' },
      ],
      'PT3M'
    )
  );

  const faqs = [
    { question: 'What is a friction vocabulary audit?', answer: 'An AI-powered scan that identifies the exact words and phrases on your website that are weakening conversions, like hedge words, weak verbs, and corporate jargon, and replaces them with stronger alternatives.' },
    { question: 'Why does word choice affect conversions?', answer: 'Hedge words ("might", "could", "try"), passive verbs, and jargon create cognitive friction and erode trust. High-converting copy is direct, specific, and benefits-led.' },
    { question: 'Is the friction audit free?', answer: 'Yes. The basic vocabulary audit is free with no login required.' },
    { question: 'What kind of phrases get flagged?', answer: 'Weak verbs (try, attempt, help), hedge words (might, could, possibly), corporate jargon (synergy, leverage), passive constructions, and vague benefits.' },
  ];

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Friction Vocabulary Audit | Aetheris AI"
        description="Find the exact words on your website weakening conversions. Free AI audit with stronger replacements."
        path="/friction-audit"
        keywords="conversion copywriting audit, website copy audit, friction vocabulary, conversion optimization, AI copy audit, B2B copywriting, AI consulting Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Friction Vocabulary Audit', path: '/friction-audit' },
        ]}
        faqs={faqs}
        speakable={['h1', '.tldr', 'h2']}
        jsonLd={jsonLd}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-6">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">Executive Clarity Suite</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">Friction Vocabulary <span className="text-gradient-amber">Audit</span></h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Sometimes the problem isn't your offer. It's the words wrapping around it.</p>
          </div>

          {/* AEO TL;DR */}
          <div
            className="tldr glass rounded-xl border border-amber/30 p-5 mb-8 max-w-2xl mx-auto"
            data-speakable="true"
          >
            <div className="text-xs font-bold text-amber uppercase tracking-wider mb-2">
              Quick Answer
            </div>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
              The Friction Vocabulary Audit is a free AI scan that flags every weak verb, hedge word,
              and jargon phrase on your site, and gives you a stronger, conversion-tested replacement
              for each one.
            </p>
          </div>

          <FrictionVocabularyAudit adminMode={staffUnlock} />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default FrictionAuditPage;
