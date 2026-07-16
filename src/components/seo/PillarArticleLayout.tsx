import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import AuthorByline from './AuthorByline';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export interface FaqItem { q: string; a: string }
export interface PillarArticleProps {
  /** URL path, e.g. "/revenue-forensics" */
  path: string;
  /** H1 — must mirror the buyer's query */
  title: string;
  /** <title> meta */
  metaTitle?: string;
  /** Meta description (≤160 chars) */
  description: string;
  /** 2-3 sentence direct answer — extracted by AI engines */
  quickAnswer: string;
  /** ISO date last updated */
  lastUpdated: string;
  /** "pillar" | "question" | "data" | "comparison" */
  tier?: 'pillar' | 'question' | 'data' | 'comparison';
  /** Pre-rendered body content */
  children: React.ReactNode;
  /** FAQ pairs — rendered visually + as FAQPage JSON-LD */
  faqs: FaqItem[];
  /** Two related internal links (rule 8: cross-link intentionally) */
  relatedLinks?: { label: string; href: string }[];
  /** Optional override for final CTA */
  ctaLabel?: string;
  ctaHref?: string;
}

/**
 * Shared layout for every Tier-1 pillar and Tier-2 question article in the
 * AI Authority Playbook.
 *
 * Implements universal rules:
 *  1. Answer first  → Quick Answer box on top
 *  2. Question H1   → caller passes question-format title
 *  3. Author byline → Joseph Toney + credential
 *  6. Freshness     → Last updated date
 *  8. Cross-link    → relatedLinks slot
 *  9. One topic     → one URL one page
 * 11. Schema        → FAQPage + Article + BreadcrumbList JSON-LD
 */
const SITE = 'https://aetheris.technology';

const PillarArticleLayout: React.FC<PillarArticleProps> = ({
  path, title, metaTitle, description, quickAnswer, lastUpdated,
  tier = 'pillar', children, faqs, relatedLinks = [], ctaLabel, ctaHref,
}) => {
  const url = `${SITE}${path}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: lastUpdated,
    dateModified: lastUpdated,
    mainEntityOfPage: url,
    author: {
      '@type': 'Person',
      name: 'Joseph Toney',
      jobTitle: 'Founder, Aetheris · Chaos Theory Forensics Operator',
      alumniOf: 'Liberty University',
      url: `${SITE}/`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Aetheris',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/aetheris-logo.png` },
    },
  };
  const faqSchema = faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Aetheris', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Chaos Theory Forensics', item: `${SITE}/revenue-forensics` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  const finalCtaHref = ctaHref ?? '/scan';
  const finalCtaLabel = ctaLabel ?? 'Run the free Revenue Autopsy scan';

  return (
    <article className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{metaTitle || `${title} | Aetheris`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={metaTitle || title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="article:published_time" content={lastUpdated} />
        <meta name="article:modified_time" content={lastUpdated} />
        <meta name="author" content="Joseph Toney" />
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        {/* Breadcrumb (visual) */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs font-case uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-amber">Aetheris</Link>
          <span className="mx-2">/</span>
          <Link to="/revenue-forensics" className="hover:text-amber">Chaos Theory Forensics</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{tier === 'question' ? 'Question' : 'Pillar'}</span>
        </nav>

        {/* H1 — question-format */}
        <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-6">
          {title}
        </h1>

        {/* Byline + last updated */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <AuthorByline date={undefined} />
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs font-case uppercase tracking-widest text-muted-foreground">
            Last updated <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          </span>
        </div>

        {/* QUICK ANSWER BOX — what AI engines extract */}
        <aside
          className="mb-12 rounded-lg border-2 border-amber/40 bg-amber/5 p-6"
          aria-label="Quick answer"
        >
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Quick Answer
          </div>
          <p className="text-lg leading-relaxed text-foreground">{quickAnswer}</p>
        </aside>

        {/* Body */}
        <div className="prose prose-invert prose-amber max-w-none prose-headings:font-serif prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-base prose-p:leading-relaxed prose-li:text-base prose-strong:text-amber prose-a:text-amber hover:prose-a:underline">
          {children}
        </div>

        {/* FAQ block — visible + schema */}
        {faqs.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <h2 className="font-serif text-2xl font-semibold mb-6">Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map((f, i) => (
                <div key={i}>
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related (rule 8 — internal links) */}
        {relatedLinks.length > 0 && (
          <section className="mt-16 border-t border-border pt-10">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">Continue reading</div>
            <ul className="space-y-2">
              {relatedLinks.map(l => (
                <li key={l.href}>
                  <Link to={l.href} className="text-foreground hover:text-amber underline-offset-4 hover:underline">
                    {l.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Single CTA */}
        <div className="mt-16 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm font-case uppercase tracking-widest text-muted-foreground mb-3">Next step</p>
          <Button asChild size="lg" className="bg-amber text-background hover:bg-amber/90">
            <Link to={finalCtaHref}>{finalCtaLabel} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        {/* Citation block (rule 10) */}
        {tier === 'data' && (
          <p className="mt-8 text-xs text-muted-foreground italic">
            To cite this report: Toney, J. ({new Date(lastUpdated).getFullYear()}). {title}. Aetheris. {url}
          </p>
        )}
      </div>
    </article>
  );
};

export default PillarArticleLayout;
