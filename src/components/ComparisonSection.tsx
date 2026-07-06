import React from 'react';
import { Link } from 'react-router-dom';
import { RevealOnScroll } from './RevealOnScroll';

// Category move: stop comparing to vendors. Anchor on the 5 structural moats
// nobody else can replicate. This is not "us vs them" — this is "us vs an
// empty category." Chaos Theory Forensics has one operator. Period.
const MOATS: Array<{ id: string; name: string; one: string; detail: string }> = [
  {
    id: '01',
    name: 'Live DOM Scanner',
    one: 'We see what your customer actually sees.',
    detail:
      'Every other tool reads static crawl data. Ours executes the page — the rendered, JavaScript-loaded, authenticated DOM. The leak that only appears after a form mount, the price the bot never reaches, the broken modal on a real device. That gap cannot be closed with a SaaS subscription.',
  },
  {
    id: '02',
    name: 'Competitor Teardown',
    one: 'Run it on your rival. Watch them bleed.',
    detail:
      'A prospect points the scanner at their competitor and sees the competitor\'s leaks named, quantified, ranked. The demo sells itself in 30 seconds. No deck. No discovery call. No "let me get back to you."',
  },
  {
    id: '03',
    name: 'Revenue Score (0–100)',
    one: 'A public standard only we can issue.',
    detail:
      'Every scan emits a Revenue Score — shareable, embeddable, ranked. Businesses display it. Prospects ask for it. Over time it becomes the number industries cite the way websites cite Lighthouse. We own the standard because we built the only scanner that produces it.',
  },
  {
    id: '04',
    name: 'Industry Leak Report',
    one: 'Aggregate intelligence nobody can buy.',
    detail:
      'Thousands of scans produce a proprietary dataset on where revenue leaks by industry, by size, by stack. Published quarterly. The citation magnet that every consultant, journalist, and operator footnotes — and that nobody else can replicate without our scan volume.',
  },
  {
    id: '05',
    name: 'Leak Register',
    one: 'The living case file that replaces the slide deck.',
    detail:
      'Every found leak is logged, versioned, fix-tracked, recovery-attributed. The deliverable is not a PDF — it is a forensic record that grows over time. Clients stay because the history doesn\'t transfer. The Register is the engagement.',
  },
];

export const ComparisonSection: React.FC = () => {
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="font-case text-[11px] uppercase tracking-[0.34em] text-amber flex items-center gap-3">
            <span className="w-8 h-px bg-amber" />
            Case File 09 <span className="text-muted-foreground tracking-[0.28em]">/ The category nobody else is in</span>
          </div>
          <h2 className="font-forensic font-black text-3xl md:text-5xl leading-[1.04] tracking-tight mt-5 max-w-[24ch] text-foreground">
            We don't compete. <span className="text-amber italic">We invented the category.</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mt-5 max-w-[68ch]">
            Chaos Theory Forensics has one operator. Five structural advantages, none of them positioning — each one a thing nobody else has built and nobody else can ship by next quarter. When a prospect hears it for the first time, the sentence we want is the one we get: <span className="text-foreground italic">"I've never heard of anything like that."</span>
          </p>
        </RevealOnScroll>

        <div className="mt-12 grid gap-4">
          {MOATS.map((m) => (
            <RevealOnScroll key={m.id}>
              <div className="border border-border rounded-lg bg-card/40 px-5 md:px-7 py-5 md:py-6 hover:border-amber/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-baseline md:gap-6">
                  <div className="font-case text-[11px] uppercase tracking-[0.24em] text-amber/90 shrink-0">
                    Moat <span className="font-bold text-amber">{m.id}</span>
                  </div>
                  <div className="flex-1 mt-2 md:mt-0">
                    <div className="font-forensic font-black text-xl md:text-2xl text-foreground leading-tight">
                      {m.name}
                    </div>
                    <div className="font-case text-[12.5px] tracking-[0.04em] uppercase text-amber/90 mt-1">
                      {m.one}
                    </div>
                    <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed mt-3 max-w-[78ch]">
                      {m.detail}
                    </p>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll>
          <div className="mt-10 flex flex-wrap gap-y-4 gap-x-8 items-center justify-between p-5 border border-border rounded-xl bg-background/60">
            <div className="font-case text-[12px] tracking-[0.1em] uppercase text-foreground flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-amber rounded-full ring-4 ring-amber/15" />
              The category has one operator. Talk to him.
            </div>
            <Link to="/catalog" className="font-case text-[12.5px] tracking-[0.14em] uppercase font-bold text-primary-foreground bg-amber hover:bg-amber/90 px-6 py-3.5 rounded-md transition-all hover:-translate-y-0.5 whitespace-nowrap">
              Talk to an operator →
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};

export default ComparisonSection;
