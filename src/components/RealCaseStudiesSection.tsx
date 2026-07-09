// 50 real, sourced case studies rendered as forensic case files on the
// Case Studies page. Filterable by section, searchable by name/metric.
import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, FileText, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { REAL_CASES, REAL_CASE_CATEGORIES, type RealCase, type RealCaseCategory } from '@/data/realCaseStudies';
import { CASE_DELIVERY } from '@/data/caseDelivery';



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

const CaseCard: React.FC<{ c: RealCase }> = ({ c }) => (
  <div className="forensic-tile rounded-sm border border-amber/25 p-4 flex flex-col h-full hover:border-amber/60 transition-colors group">
    <div className="flex items-center gap-2 mb-2">
      <span className="font-case text-[9px] uppercase tracking-widest text-crimson">
        Case №{String(c.id).padStart(3, '0')}
      </span>
      <span className="font-case text-[9px] uppercase tracking-widest text-amber/70 truncate">
        {c.category}
      </span>
    </div>
    <h3 className="font-forensic text-lg font-bold leading-snug mb-1">{c.title}</h3>
    <div className="text-amber font-case text-xs uppercase tracking-widest mb-3">{c.headline}</div>

    <dl className="space-y-2 text-sm text-foreground/85 mb-3">
      <div>
        <dt className="font-case text-[9px] uppercase tracking-widest text-crimson">Problem</dt>
        <dd>{c.problem}</dd>
      </div>
      <div>
        <dt className="font-case text-[9px] uppercase tracking-widest text-amber">Solution</dt>
        <dd>{c.solution}</dd>
      </div>
      <div>
        <dt className="font-case text-[9px] uppercase tracking-widest text-amber">Outcome</dt>
        <dd>{c.outcome}</dd>
      </div>
    </dl>

    <div className="mt-auto pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-3">
      <div>
        <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-1">Why it mirrors Aetheris</div>
        <div className="italic text-foreground/75">{c.mirrors}</div>
      </div>
      {CASE_DELIVERY[c.id] && (
        <div className="rounded-sm border border-amber/20 bg-amber/5 p-2.5">
          <div className="flex items-center gap-1.5 font-case text-[9px] uppercase tracking-widest text-amber mb-1.5">
            <Wrench className="w-3 h-3" /> How Aetheris delivers this
          </div>
          <div className="text-foreground/85 text-[12px] leading-relaxed mb-1.5">
            {CASE_DELIVERY[c.id].experience}
          </div>
          <div className="flex flex-wrap gap-1">
            {CASE_DELIVERY[c.id].tools.map((t) => (
              <span key={t} className="font-case text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-amber/30 text-amber/90 bg-background/40">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      <a
        href={c.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-case text-[10px] uppercase tracking-widest text-amber hover:text-crimson transition-colors"
      >
        Source: {c.source} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  </div>
);

export const RealCaseStudiesSection: React.FC = () => {
  const [active, setActive] = useState<RealCaseCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

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
        c.category.toLowerCase().includes(q)
      );
    });
  }, [active, query]);

  const visible = expanded ? filtered : filtered.slice(0, 9);

  return (
    <section className="py-16 px-4" id="real-cases">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/30 text-amber text-sm font-case uppercase tracking-widest mb-5">
            <FileText className="w-4 h-4" />
            50 Sourced Case Files
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Every case, verified. Every source, linked.
          </h2>
          <p className="text-foreground/80 max-w-3xl mx-auto text-lg">
            Fifty published case studies — from Salesforce and Shell to mid-market SaaS and family
            manufacturers — that mirror the leak-audit methodology. Real problem. Real fix. Real
            metric. Click the source on any card to read the original.
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

            {filtered.length > 9 && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setExpanded((v) => !v)}
                  className="border-amber/40 text-amber hover:bg-amber/10 font-case uppercase tracking-widest text-xs"
                >
                  {expanded
                    ? `Collapse — showing all ${filtered.length}`
                    : `Open the rest — ${filtered.length - 9} more case files`}
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
