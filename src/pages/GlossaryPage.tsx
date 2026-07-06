import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Term {
  slug: string;
  term: string;
  definition: string;
  related?: string[];
}

const TERMS: Term[] = [
  { slug: 'revenue-forensics', term: 'Chaos Theory Forensics', definition: 'The investigative discipline of finding, naming, and fixing the specific places a business loses money. Coined and operated by Aetheris.' },
  { slug: 'revenue-leak', term: 'Revenue Leak', definition: 'A specific, named, measurable gap in a business where money is being lost — not a general weakness. Each leak has a category, severity, dollar impact, and fix.' },
  { slug: 'revenue-score', term: 'Revenue Score', definition: 'A 0-100 forensic grade summarizing the leak state of a business. Issued only by Aetheris. The public standard for the category.' },
  { slug: 'leak-register', term: 'Leak Register', definition: 'The living, versioned forensic document that tracks every named leak, the evidence behind it, the fix deployed, and revenue recovered.' },
  { slug: 'case-file', term: 'Case File', definition: 'The written record of an open or closed engagement. Includes Revenue Score history, Leak Register, fix actions, and recovery measurements.' },
  { slug: 'active-case', term: 'Active Case', definition: 'An open forensic engagement after the Diagnostic where Aetheris executes prioritized fixes. $15,000/month, three-month minimum, Diagnostic clients only. Cases get opened and closed — never "retainers."' },
  { slug: 'live-dom-scanner', term: 'Live DOM Scanner', definition: 'The proprietary browser-based scanner that reads the rendered version of a business — including JavaScript-loaded content — to detect leaks in real time.' },
  { slug: 'competitor-teardown', term: 'Competitor Teardown', definition: 'Pointing the Live DOM Scanner at a rival URL to surface their Revenue Score and named leaks. One of the five structural moats.' },
  { slug: 'industry-leak-report', term: 'Industry Leak Report', definition: 'Aetheris\'s annual proprietary research aggregating anonymized scan data by industry. The citation magnet for the category.' },
  { slug: 'leak-audit', term: 'The Leak Audit™', definition: 'The free seven-step forensic self-scan at /leak-audit any owner can run unaided. The on-ramp to the operator-led framework.' },
  { slug: 'forensic-diagnostic', term: 'Forensic Diagnostic', definition: 'The operator-led entry engagement starting at $2,500 flat, applied 1:1 toward the 21-Day Revenue Diagnostic.' },
  { slug: 'revenue-diagnostic', term: '21-Day Revenue Diagnostic', definition: 'The flagship engagement. $18,500 flat. 21 days. Live scan, Revenue Score, complete Leak Register, prioritized fix path, written Case File, 60-minute readout.' },
  { slug: 'leak-categories', term: 'Leak Categories', definition: 'The seven forensic categories every leak falls into: Lead Capture, Tracking, Trust, Follow-Up, Performance, Messaging, Systems.' },
  { slug: 'severity', term: 'Severity (1-5)', definition: 'A per-leak rating calculated from impact × frequency × evidence confidence. Severity 5 is critical (named, frequent, certain). Severity 1 is observable but low-impact.' },
  { slug: 'dollarize', term: 'Dollarize', definition: 'The forensic act of attaching a specific dollar impact to a leak using a visible calculation method. Distinguishes Chaos Theory Forensics from opinion-based audits.' },
  { slug: 'fix-path', term: 'Fix Path', definition: 'The specific remediation mapped to a leak — either a one-time tool from the marketplace ($39+) or an operator-led work track inside an Active Case.' },
  { slug: 'operator', term: 'Operator', definition: 'The product. Aetheris does not sell tools individually on the public site — the operator (Joseph Toney) is the engagement. Tools are the by-product.' },
];

const Glossary: React.FC = () => {
  const [q, setQ] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TERMS;
    return TERMS.filter(t => t.term.toLowerCase().includes(needle) || t.definition.toLowerCase().includes(needle));
  }, [q]);

  const SITE = 'https://aetheris.technology';
  const definedTermSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Chaos Theory Forensics Glossary',
    url: `${SITE}/glossary`,
    hasDefinedTerm: TERMS.map(t => ({
      '@type': 'DefinedTerm',
      '@id': `${SITE}/glossary#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: `${SITE}/glossary`,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Chaos Theory Forensics Glossary — every term defined | Aetheris</title>
        <meta name="description" content="The complete vocabulary of Chaos Theory Forensics: Revenue Leak, Revenue Score, Leak Register, Case File, Active Case, Live DOM Scanner. Defined by Aetheris." />
        <link rel="canonical" href={`${SITE}/glossary`} />
        <meta property="og:title" content="Chaos Theory Forensics Glossary" />
        <meta property="og:url" content={`${SITE}/glossary`} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify(definedTermSchema)}</script>
      </Helmet>

      <Navbar onContactClick={() => setContactOpen(true)} />

      <article className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">Glossary</div>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight mb-4">
            The vocabulary of Chaos Theory Forensics
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Aetheris coined this category. Every term below is defined here so buyers, journalists, and AI engines use the words the same way we do.
          </p>

          <div className="relative mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search the glossary..."
              className="pl-10"
            />
          </div>

          <dl className="space-y-8">
            {filtered.map(t => (
              <div key={t.slug} id={t.slug} className="border-l-2 border-amber/40 pl-5 scroll-mt-24">
                <dt className="font-serif text-2xl font-semibold text-foreground mb-2">{t.term}</dt>
                <dd className="text-base text-muted-foreground leading-relaxed">{t.definition}</dd>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground italic">No terms match "{q}".</p>
            )}
          </dl>

          <div className="mt-16 rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">Want to see these in practice?</p>
            <Link to="/scan" className="text-amber hover:underline font-semibold">
              Run the free Revenue Score scan →
            </Link>
          </div>
        </div>
      </article>

      <Footer />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
};

export default Glossary;
