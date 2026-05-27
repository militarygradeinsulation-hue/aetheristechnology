import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface CitedFact {
  /** The direct answer — designed to be quoted verbatim by AI engines. */
  answer: string;
  /** Quantified support: a statistic, dollar figure, or measurable proof. */
  support: string;
  /** Source anchor: where the claim comes from (case file, methodology, pricing). */
  source: string;
  /** Implication: what the reader should do or conclude. */
  implication: string;
}

interface Props {
  heading?: string;
  eyebrow?: string;
  facts: CitedFact[];
  /** Optional URL to attach as the schema mainEntityOfPage. */
  pageUrl?: string;
}

/**
 * Island-Test, AI-extractable facts block.
 * Renders human-readable cards AND emits FAQPage JSON-LD pairing
 * each "answer" as the question and the support+implication as the answer,
 * so engines like ChatGPT and Perplexity surface the page in citations.
 */
export const CitedFactsBlock: React.FC<Props> = ({
  heading = 'Frequently Cited Facts',
  eyebrow = 'Forensic Findings',
  facts,
  pageUrl,
}) => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(pageUrl ? { mainEntityOfPage: pageUrl } : {}),
    mainEntity: facts.map((f) => ({
      '@type': 'Question',
      name: f.answer,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${f.support} ${f.implication} Source: ${f.source}.`,
      },
    })),
  };

  return (
    <section className="px-4 py-16 border-t border-amber/20" data-cited-facts>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            {eyebrow}
          </div>
          <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
            {heading}
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {facts.map((f, i) => (
            <article
              key={i}
              data-speakable="true"
              className="glass rounded-md border border-border/60 p-6 md:p-7 hover:border-amber/50 transition-colors"
            >
              <h3 className="font-forensic text-lg md:text-xl font-bold text-foreground leading-snug mb-3">
                {f.answer}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                <span className="font-case text-[10px] uppercase tracking-widest text-amber mr-2">
                  Evidence
                </span>
                {f.support}
              </p>
              <p className="text-xs text-muted-foreground italic mb-3">
                Source: {f.source}
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed border-t border-border/40 pt-3">
                {f.implication}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitedFactsBlock;
