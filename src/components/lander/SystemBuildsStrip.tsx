import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GOLDEN_REPORT_STRIP } from '@/lib/goldenReportStrip';
import { formatMoney } from '@/lib/crm';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JOSEPH_BUILDS } from '@/lib/josephBuilds';
import './SystemBuildsStrip.css';

export function SystemBuildsStrip() {
  const [paused, setPaused] = useState(false);
  return (
    <section id="system-builds" className="border-t border-border/60 py-14 sm:py-20" aria-label="Systems built by Joseph Toney">
      <div className="mx-auto mb-8 flex max-w-6xl items-start justify-between gap-4 px-6">
        <div className="max-w-4xl">
          <p className="mb-3 font-case text-xs uppercase text-amber">Built by Joseph Toney · {JOSEPH_BUILDS.length} systems</p>
          <h2 className="font-forensic text-3xl font-bold leading-tight sm:text-4xl">We KNOW systems because we build them. We KNOW business because we looked inside thousands of them.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">So believe us when we say we can find why yours have financial leaks.</p>
        </div>
        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setPaused(v => !v)}
          aria-label={paused ? 'Resume scrolling builds' : 'Pause scrolling builds'} title={paused ? 'Resume scrolling builds' : 'Pause scrolling builds'}>
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>
      <div className="systems-builds-viewport overflow-hidden" data-paused={paused}>
        <div className="systems-builds-track flex w-max">
          {[0, 1].map(copy => <div key={copy} className="flex shrink-0 gap-5 pr-5" aria-hidden={copy === 1 ? true : undefined}>
            {JOSEPH_BUILDS.map(build => (
              <a key={build.url} href={build.url} target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : 0}
                className="group block w-72 shrink-0 overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-amber/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={build.image} alt={`${build.name} screenshot`} loading="lazy" className="aspect-[8/5] w-full object-cover object-top" />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-h-12 font-display text-base font-semibold leading-snug">{build.name}</h3>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-amber" />
                  </div>
                  <p className="break-all font-case text-[10px] text-muted-foreground">{build.url.replace(/^https:\/\//, '').replace(/\/$/, '')}</p>
                </div>
              </a>
            ))}
          </div>)}
        </div>
      </div>
      <div className="mx-auto mb-4 mt-12 max-w-6xl px-6">
        <p className="font-case text-xs uppercase text-amber">{GOLDEN_REPORT_STRIP.length} Golden Reports · inside real businesses</p>
      </div>
      <div className="systems-builds-viewport overflow-hidden" data-paused={paused}>
        <div className="systems-builds-track systems-builds-track--reverse flex w-max">
          {[0, 1].map(copy => <div key={copy} className="flex shrink-0 gap-4 pr-4" aria-hidden={copy === 1 ? true : undefined}>
            {GOLDEN_REPORT_STRIP.map(r => (
              <Link key={`${copy}-${r.scanId}`} to={`/golden-report/run?scan=${r.scanId}`} tabIndex={copy === 1 ? -1 : undefined}
                className="block w-60 shrink-0 rounded-md border border-amber/30 bg-card p-4 transition-colors hover:border-amber/70">
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Golden Report</p>
                <h3 className="mt-2 truncate font-display text-base font-semibold">{r.domain}</h3>
                <p className="mt-2 font-case text-[10px] uppercase text-muted-foreground">Annual leakage found</p>
                <p className="font-forensic text-lg font-bold text-destructive">{formatMoney(r.annualLow * 100)} – {formatMoney(r.annualHigh * 100)}</p>
              </Link>
            ))}
          </div>)}
        </div>
      </div>
    </section>
  );
}