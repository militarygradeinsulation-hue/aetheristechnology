// 50 real, sourced case studies rendered as drifting capsule tiles.
// Click a capsule to open the full case file in a modal.
import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { REAL_CASES, REAL_CASE_CATEGORIES, type RealCase, type RealCaseCategory } from '@/data/realCaseStudies';
import { CASE_DELIVERY } from '@/data/caseDelivery';
import { CASE_CREDITS } from '@/data/caseCredits';
import { portraitForCase } from '@/data/casePortraits';

const CategoryPill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}> = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-sm border font-case text-[10px] uppercase tracking-widest transition-colors whitespace-nowrap ${
      active
        ? 'border-amber bg-amber/15 text-amber'
        : 'border-border text-muted-foreground hover:text-foreground hover:border-amber/40'
    }`}
  >
    {label} <span className="opacity-60">· {count}</span>
  </button>
);

const businessOf = (title: string) => title.split(/\s[—–-]\s/)[0].trim();

const Capsule: React.FC<{ c: RealCase; onClick: () => void }> = ({ c, onClick }) => {
  const credit = CASE_CREDITS[c.id];
  const business = businessOf(c.title);
  const avatar = portraitForCase(c.id);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 items-center gap-3 rounded-full border border-border/70 bg-card/50 backdrop-blur-sm py-2 pl-2 pr-5 transition-colors hover:border-amber/60 hover:bg-card/80"
    >
      {avatar ? (
        <img
          src={avatar}
          alt={`${credit?.name ?? business}, client contact`}
          loading="lazy"
          className="h-10 w-10 rounded-full border border-amber/40 object-cover shrink-0"
        />
      ) : (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber/40 font-case text-[10px] text-amber">
          {String(c.id).padStart(2, '0')}
        </span>
      )}
      <span className="text-left">
        <span className="block text-sm font-semibold leading-tight text-foreground whitespace-nowrap">
          {credit ? credit.name : business}
        </span>
        <span className="block font-case text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          {business}
          {credit ? ` // ${credit.year}` : ''}
        </span>
      </span>
    </button>
  );
};

const MarqueeRow: React.FC<{
  cases: RealCase[];
  reverse?: boolean;
  duration: number;
  onSelect: (c: RealCase) => void;
}> = ({ cases, reverse, duration, onSelect }) => {
  if (cases.length === 0) return null;
  const loop = [...cases, ...cases];
  return (
    <div className="case-marquee-row overflow-hidden">
      <div
        className={`flex w-max gap-3 ${reverse ? 'case-marquee-right' : 'case-marquee-left'}`}
        style={{ ['--case-marquee-duration' as string]: `${duration}s` }}
      >
        {loop.map((c, i) => (
          <Capsule key={`${c.id}-${i}`} c={c} onClick={() => onSelect(c)} />
        ))}
      </div>
    </div>
  );
};

const CaseModal: React.FC<{ c: RealCase; onClose: () => void }> = ({ c, onClose }) => {
  const credit = CASE_CREDITS[c.id];
  const business = businessOf(c.title);
  const avatar = portraitForCase(c.id);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Case ${c.id}: ${business}`}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-amber/30 bg-card p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close case file"
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition-colors hover:text-amber"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-between gap-3 pr-8">
          <span className="font-case text-[9px] uppercase tracking-widest text-muted-foreground">
            Case №{String(c.id).padStart(3, '0')}
          </span>
          <span className="font-case text-[9px] uppercase tracking-widest text-amber/80">{c.category}</span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          {avatar && (
            <img
              src={avatar}
              alt={`${credit?.name ?? business}, client contact`}
              className="h-14 w-14 shrink-0 rounded-full border border-amber/40 object-cover"
            />
          )}
          <div className="min-w-0">
            <h3 className="font-forensic text-xl font-bold leading-tight">{credit ? credit.name : business}</h3>
            <p className="font-forensic text-base font-semibold text-amber leading-snug">{business}</p>
            {credit && (
              <p className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                Worked together // {credit.year}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm text-foreground/85">
          <p>
            <span className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">Result</span>
            <br />
            <span className="font-forensic font-bold text-amber">{c.outcome}</span>
          </p>
          <p><span className="font-semibold text-muted-foreground">Problem:</span> {c.problem}</p>
          <p><span className="font-semibold text-amber">Fix:</span> {c.solution}</p>
          <p className="text-xs italic text-foreground/70">Mirrors Aetheris: {c.mirrors}</p>
          {CASE_DELIVERY[c.id] && (
            <div className="flex flex-wrap gap-1 pt-1">
              {CASE_DELIVERY[c.id].tools.map((t) => (
                <span
                  key={t}
                  className="font-case text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-amber/30 text-amber/90 bg-background/40"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <a
          href={c.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1 font-case text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-amber"
        >
          {c.source} <ExternalLink className="h-3 w-3" />
        </a>
      </motion.div>
    </motion.div>
  );
};



export const RealCaseStudiesSection: React.FC = () => {
  const [active, setActive] = useState<RealCaseCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RealCase | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: REAL_CASES.length };
    REAL_CASE_CATEGORIES.forEach((k) => {
      map[k] = REAL_CASES.filter((c) => c.category === k).length;
    });
    return map;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REAL_CASES.filter((c) => {
      if (active !== 'all' && c.category !== active) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.problem.toLowerCase().includes(q) ||
        c.solution.toLowerCase().includes(q) ||
        c.outcome.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (CASE_CREDITS[c.id]?.name.toLowerCase().includes(q) ?? false) ||
        String(CASE_CREDITS[c.id]?.year ?? '').includes(q)
      );
    });
  }, [active, query]);

  const INITIAL = 6;
  const visible = expanded ? filtered : filtered.slice(0, INITIAL);

  return (
    <section className="py-16 px-4 scroll-mt-24" id="real-case-files">
      <span id="real-cases" className="sr-only" aria-hidden="true" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/30 text-amber text-sm font-case uppercase tracking-widest mb-5">
            <FileText className="w-4 h-4" />
            50 Real Cases
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Real problems. Real fixes. Real numbers.
          </h2>
          <p className="text-foreground/80 max-w-2xl mx-auto text-base md:text-lg">
            Each card: what broke, the result. Tap <span className="text-amber">More detail</span> for the fix, or the source to read the original.
          </p>
        </div>

        <div className="mb-6 max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber/70 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases (e.g. CRM, forecast, warehouse, Walmart)…"
            className="pl-9 h-11 bg-background/60 border-amber/30 focus-visible:ring-amber/50"
            aria-label="Search real case studies"
          />
        </div>

        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          <CategoryPill
            label="All"
            active={active === 'all'}
            onClick={() => setActive('all')}
            count={counts.all}
          />
          {REAL_CASE_CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              label={cat}
              active={active === cat}
              onClick={() => setActive(cat)}
              count={counts[cat] || 0}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="forensic-tile rounded-sm p-10 border border-amber/30 text-center max-w-2xl mx-auto">
            <div className="font-case text-xs uppercase tracking-widest text-amber mb-2">No match</div>
            <p className="text-foreground/80">
              "{query}" isn't in the file cabinet. Try a broader term — or a section pill above.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <CaseCard key={c.id} c={c} />
              ))}
            </div>

            {filtered.length > INITIAL && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setExpanded((v) => !v)}
                  className="border-amber/40 text-amber hover:bg-amber/10 font-case uppercase tracking-widest text-xs"
                >
                  {expanded
                    ? `Show fewer`
                    : `Show all ${filtered.length} cases`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default RealCaseStudiesSection;
