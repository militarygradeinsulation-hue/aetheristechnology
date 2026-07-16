import React from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  heading?: string;
  eyebrow?: string;
  faqs: FaqItem[];
  pageUrl?: string;
}

/**
 * Visible buyer-intent accordion FAQ paired with FAQPage JSON-LD.
 * Optimized for AI engine extraction + Google rich results.
 */
export const BuyerIntentFaq: React.FC<Props> = ({
  heading = 'Buyer Questions, Answered',
  eyebrow = 'FAQ',
  faqs,
  pageUrl,
}) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(pageUrl ? { mainEntityOfPage: pageUrl } : {}),
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <section className="px-4 py-16 border-t border-amber/20">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            {eyebrow}
          </div>
          <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
            {heading}
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="glass rounded-md border border-border/60 px-4 data-[state=open]:border-amber/50"
            >
              <AccordionTrigger className="text-left font-forensic text-base md:text-lg text-foreground hover:no-underline">
                {f.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/85 leading-relaxed" data-speakable="true">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default BuyerIntentFaq;
