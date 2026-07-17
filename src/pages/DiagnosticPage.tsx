import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X, Calendar } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { PackageTiers } from '@/components/PackageTiers';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';

const INCLUDES = [
  'Lead-to-contact, deal-stage progression, and touch-frequency analysis',
  'Full Operator Tool Suite (9 live instruments) run against your business',
  'Written report (15-30 pages): leak map + prioritized fixes + ROI projections',
  'Source-data appendix — every CSV, query, and tool export used',
  '60-minute readout with you and up to two of your team',
  'Fixed-fee implementation quote if you choose to proceed',
];

const NOT_INCLUDED = [
  'Brand strategy, product pricing, or shop-floor operations',
  'Percentage-of-savings billing or ongoing engagement requirement',
  'Vendor reseller commissions on tools we recommend',
];

const COST_ROWS: [string, string, string][] = [
  ['CRM audit + cleanup (HubSpot/Salesforce)', '$15K - $40K', 'Included'],
  ['Sales process + pipeline diagnostic', '$20K - $50K', 'Included'],
  ['Website + SEO/GEO + AI-visibility audit', '$8K - $25K', 'Included'],
  ['Brand/messaging contradiction audit', '$10K - $20K', 'Included'],
  ['Sales script + 7-touch follow-up build', '$6K - $15K', 'Included'],
  ['90-day content calendar + first 14 drafts', '$8K - $20K', 'Included'],
  ['Operator-graded scorecard + readout', '$10K - $30K', 'Included'],
  ['Written report w/ ROI + roadmap', '$5K - $15K', 'Included'],
  ['Source-data appendix (CSVs + queries)', 'Rare', 'Included'],
];

const DiagnosticPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      <SEOHead
        title="The Leak Audit™ — fixed-fee 21-Day Revenue Diagnostic | Aetheris"
        description="Operator-led Leak Audit for specialty manufacturers $5M-$25M. fixed-fee. Map where CRM, sales follow-up, and lead flow are losing money."
        path="/diagnostic"
        keywords="leak audit, revenue diagnostic, manufacturing CRM audit, sales operations diagnostic, fixed fee consulting"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Leak Audit', path: '/diagnostic' }]}
      />
      <Background />

      {/* subtle ambient wash — matches home */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />

        <main className="px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            {/* HERO — matches home Chaos Theory Forensics rhythm */}
            <section className="text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-amber/50" />
                <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">
                  Case File · Specialty Manufacturers · $5M–$25M
                </span>
                <span className="h-px w-8 bg-amber/50" />
              </div>
              <h1 className="font-forensic text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
                The <span className="text-amber italic">Leak Audit</span>™.<br />
                Find the <span className="text-crimson italic">bleed</span>. Price the fix.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
                We map where your CRM, sales follow-up, and lead flow are losing money. Written report with prioritized fixes, ROI projections, and an implementation roadmap.
              </p>
              <p className="mt-3 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
                fixed-fee · One operator · Nothing ongoing
              </p>

              {/* video */}
              <div className="mt-6 max-w-3xl mx-auto">
                <div className="shimmer-gold-border rounded-sm">
                  <div className="relative w-full rounded-sm overflow-hidden" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src="https://player.vimeo.com/video/1191299864?badge=0&autopause=0&player_id=0&app_id=58479"
                      loading="lazy"
                      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                      allowFullScreen
                      title="The Leak Audit"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* THE PRICE — Filter-style crimson tile */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '120ms', animationFillMode: 'both' }}
            >
              <div className="relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-6 sm:p-8 shadow-[0_20px_60px_-30px_hsl(var(--crimson,0_60%_45%)/0.6)] text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">Fixed fee · Applied toward any engagement</div>
                <div className="font-forensic text-6xl md:text-7xl font-bold text-foreground leading-none">
                  fixed-fee
                </div>
                <p className="mt-3 text-sm sm:text-base text-foreground/80 max-w-xl mx-auto">
                  Operator-led. No percentage-of-savings. No retainer. If the number sounds "expensive," the leak is bigger than you think — and you aren't our client.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
                  <a href="/book" target="_blank" rel="noopener noreferrer">
                    <Button size="default" className="h-11 px-6 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book a 15-min call
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <Link to="/methodology">
                    <Button size="default" variant="outline" className="h-11 px-6 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider">
                      Read the methodology first
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
            {/* ENGAGEMENT LADDER — three tiers with per-price explainers */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '140ms', animationFillMode: 'both' }}
              aria-label="Aetheris engagement ladder"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="h-px w-8 bg-amber/50" />
                <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber/90">Engagement Ladder · USD Flat · Why each price</span>
                <span className="h-px w-8 bg-amber/50" />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {[
                  {
                    tier: '01',
                    name: 'Leak Audit',
                    price: 'fixed-fee',
                    sub: 'Named leaks + dollar exposure',
                    note: 'Fastest way in.',
                    why: 'Why fixed-fee',
                    whyBody:
                      'One operator, 8–12 focused hours across your CRM export, site, funnels, and follow-up. You get a written leak map with dollar figures — enough to prove the bleed is real without committing to a full engagement. Priced as a rounding error against a leak that typically costs 10–40× the fee every year unfixed.',
                    scope: ['8–12 operator hours', '5–10 named leaks, $-tagged', 'Written report + 30-min readout', '100% credited to Tier 02 or 03'],
                  },
                  {
                    tier: '02',
                    name: '21-Day Revenue Diagnostic',
                    price: 'fixed-fee',
                    sub: 'Full forensic dig',
                    note: 'Credited 1:1 to Active Case.',
                    featured: true,
                    why: 'Why fixed-fee',
                    whyBody:
                      'Three weeks of operator time running all 9 forensic instruments against live data — CRM, pipeline, site, brand, follow-up, content, AI-readiness. Replaces $82K–$215K worth of separate audits. Every dollar credits 1:1 toward the Active Case, so it costs nothing if you continue.',
                    scope: ['21 days · 1 operator', 'All 9 instruments run live', '15–30 page report + roadmap', 'Fully credited to Tier 03'],
                    toolsLabel: 'Tools & access you keep',
                    tools: [
                      'Website Leak Scanner — unlimited re-runs',
                      'CRM Bleed Analyzer (HubSpot / Pipedrive / Sheets export)',
                      'Pipeline Stall Autopsy dashboard',
                      'Follow-Up Gap Timeline (per-lead SLA breach map)',
                      'Brand & Positioning Audit report',
                      'AI-Readiness Scorecard + remediation checklist',
                      'Content & SEO Decay tracker (Semrush-powered)',
                      'Competitor Delta Report (top 3 tracked)',
                      '90-day Rep Portal seats (up to 3 users)',
                      'Forensic Playbook Library (SOPs, scripts, email frames)',
                      'Priority Slack channel with the operator for 21 days',
                      'Recorded weekly readouts + editable Notion workspace',
                    ],
                  },
                  {
                    tier: '03',
                    name: 'Active Case',
                    price: '$15,000/mo',
                    sub: 'Operator-led implementation',
                    note: '3-month minimum · Diagnostic clients.',
                    why: 'Why $15,000/mo',
                    whyBody:
                      'Operator-led removal of the leaks named in the Diagnostic — not a retainer, not seat-based software, not activity theatre. Fee is a fraction of a mid-level ops hire ($180K+ fully-loaded) and typically pays for itself in month one from a single recovered deal or plugged CRM bleed.',
                    scope: ['~40 hrs/mo senior operator', '3-month minimum, no auto-renew', 'Weekly readout + fix log', 'Ends when the leak ends'],
                    toolsLabel: 'What you get every month',
                    tools: [
                      'Everything in the Diagnostic — kept live & re-run monthly',
                      'Dedicated senior operator (~40 hrs/mo hands-on)',
                      'CRM rebuild & pipeline hygiene execution (not just advice)',
                      'Follow-up sequences written, installed, and monitored',
                      'AI agents deployed into your stack (intake, triage, follow-up)',
                      'Sales enablement: scripts, objection frames, call reviews',
                      'Weekly leak-closure report with $ recovered / $ still bleeding',
                      'Unlimited Rep Portal seats + monthly team training module',
                      'Smart Subscription: monthly AI-personalized playbook drop',
                      'Direct Slack + 24h response SLA with the operator',
                      'Quarterly Business Forensics review with owner + partner',
                      'Cancel any month after the 3-month floor — no auto-renew',
                    ],
                  },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className={`relative rounded-sm border p-5 flex flex-col ${
                      t.featured
                        ? 'border-amber/70 bg-amber/[0.06] shadow-[0_0_30px_-15px_hsl(var(--amber)/0.6)]'
                        : 'border-amber/25 bg-card/60'
                    }`}
                  >
                    {t.featured && (
                      <span className="absolute -top-2 right-3 font-mono text-[9px] uppercase tracking-[0.28em] bg-amber text-background px-1.5 py-0.5 rounded-sm">
                        Most named
                      </span>
                    )}
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">Tier {t.tier}</div>
                    <div className="mt-1 font-forensic text-lg font-bold leading-tight">{t.name}</div>
                    <div className="mt-1 font-forensic text-3xl font-bold text-amber leading-none">{t.price}</div>
                    <div className="mt-2 text-xs text-foreground/80">{t.sub}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-foreground/60">{t.note}</div>

                    <div className="mt-4 pt-4 border-t border-amber/15">
                      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber mb-1.5">{t.why}</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{t.whyBody}</p>
                    </div>

                    <ul className="mt-3 space-y-1 text-[11px] text-foreground/75">
                      {t.scope.map((s) => (
                        <li key={s} className="flex gap-1.5">
                          <Check className="w-3 h-3 text-amber shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>

                    {'tools' in t && Array.isArray((t as any).tools) && (
                      <div className="mt-4 pt-3 border-t border-amber/15">
                        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber mb-2">
                          {(t as any).toolsLabel ?? 'Included tools & access'}
                        </div>
                        <ul className="space-y-1 text-[11px] text-foreground/80 leading-snug">
                          {((t as any).tools as string[]).map((item) => (
                            <li key={item} className="flex gap-1.5">
                              <span className="text-amber/80 font-mono text-[10px] mt-0.5">▸</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-4 text-center text-[11px] text-foreground/60 italic">
                If we can't name a leak worth more than our fee, you pay nothing. Written guarantee.
              </p>
            </section>

            {/* THEM vs AETHERIS */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '160ms', animationFillMode: 'both' }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2 text-center">
                Why we're not another AI company
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold leading-tight text-center mb-5">
                Every other AI shop sells you tools.<br />We use ours <span className="text-crimson italic">on you</span>.
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-sm border border-crimson/40 bg-card/60 backdrop-blur-sm p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-3">Them</div>
                  <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed">
                    <li>— Sell a chatbot, dashboard, or "AI platform" license</li>
                    <li>— Hand you software and walk away</li>
                    <li>— Charge per seat, per token, per month, forever</li>
                    <li>— Pitch "AI transformation" with no operator on the floor</li>
                    <li>— Generic playbooks from a junior + GPT wrapper</li>
                    <li>— You do the work of finding what's broken</li>
                  </ul>
                </div>
                <div className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">Aetheris</div>
                  <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
                    <li>— A human operator runs 9 forensic instruments <strong className="text-amber">against your business</strong></li>
                    <li>— You get a written leak map, not a software login</li>
                    <li>— One fixed fee. fixed-fee. Nothing else owed to read the report</li>
                    <li>— 20+ years operating real P&Ls before the AI was bolted on</li>
                    <li>— Findings tied to dollars: deal stalls, CRM bleed, lost follow-up</li>
                    <li>— We tell you exactly where the money is leaking and what to fix first</li>
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground/60 italic text-center">
                AI is the microscope. The operator holds it. That's the difference.
              </p>
            </section>

            {/* THE OBJECTION + MATH TABLE */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '200ms', animationFillMode: 'both' }}
            >
              <div className="relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-5 sm:p-6 shadow-[0_20px_60px_-30px_hsl(var(--crimson,0_60%_45%)/0.6)]">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">The objection we hear every time</div>
                <blockquote className="font-forensic text-2xl md:text-3xl font-bold text-crimson leading-tight">
                  "That's just too expensive."
                </blockquote>
                <p className="mt-1 text-xs text-foreground/60 italic">Said by every CFO who hasn't done the math. Here's the math.</p>

                <h3 className="font-forensic text-lg md:text-xl font-bold text-foreground mt-5 mb-4 leading-snug">
                  fixed-fee buys what the alternative shelf charges <span className="text-crimson">$82K–$215K</span> for — and most still won't touch your CRM data.
                </h3>

                <div className="overflow-x-auto rounded-sm border border-amber/20 bg-background/40">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-amber/30 bg-background/40">
                        <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-2 pl-3 pr-2">Line item</th>
                        <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground py-2 px-2">Alternative</th>
                        <th className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-amber py-2 px-2">Aetheris</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground/85">
                      {COST_ROWS.map(([item, alt, us]) => (
                        <tr key={item} className="border-b border-border/30">
                          <td className="py-2 pl-3 pr-2">{item}</td>
                          <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{alt}</td>
                          <td className="py-2 px-2 text-amber font-semibold whitespace-nowrap">{us}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-amber/50 bg-amber/[0.03]">
                        <td className="py-2.5 pl-3 pr-2 font-bold text-foreground">TOTAL</td>
                        <td className="py-2.5 px-2 font-bold text-muted-foreground whitespace-nowrap">$82K – $215K</td>
                        <td className="py-2.5 px-2 font-bold text-amber whitespace-nowrap">fixed-fee</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    ['Fast', 'vs. 90-120 days'],
                    ['1 operator', '20+ yrs · not a GPT wrapper'],
                    ['$0 ongoing', 'Read, walk, or open a case'],
                  ].map(([h, s]) => (
                    <div key={h} className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-3 text-center">
                      <div className="font-forensic text-base sm:text-lg font-bold text-amber leading-tight">{h}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s}</div>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-sm text-foreground/85 leading-relaxed text-center">
                  Average $5M–$25M manufacturer leaks <span className="text-crimson font-bold">$400K–$1.4M/yr</span> through stalled pipeline, broken follow-up, and CRM rot.{' '}
                  <span className="text-amber font-semibold">fixed-fee to find it is a rounding error.</span> One recovered deal usually pays 100×.
                </p>
              </div>
            </section>

            {/* WHAT YOU GET / WHAT IT ISN'T — mirror home's two-column */}
            <section
              className="mt-8 grid md:grid-cols-2 gap-4 animate-fade-in"
              style={{ animationDelay: '240ms', animationFillMode: 'both' }}
            >
              <div className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">What you get</div>
                <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                  {INCLUDES.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-sm border border-crimson/40 bg-card/60 backdrop-blur-sm p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-3">What it isn't</div>
                <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                  {NOT_INCLUDED.map((i) => (
                    <li key={i} className="flex gap-2">
                      <X className="w-4 h-4 text-crimson shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* CRM-agnostic — thin factual tile like home footer sections */}
            <section
              className="mt-8 animate-fade-in"
              style={{ animationDelay: '260ms', animationFillMode: 'both' }}
            >
              <div className="rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">CRM-agnostic</div>
                <h2 className="font-forensic text-lg md:text-xl font-bold leading-tight">Runs on a CSV export.</h2>
                <p className="mt-2 text-sm text-foreground/75 leading-relaxed">
                  No HubSpot or Salesforce required. We work from a CSV export of contacts, deals, and activity. Running it live in your CRM is a paid upsell, not a prerequisite.
                </p>
              </div>
            </section>

            {/* CLOSING CTA — echoes home rhythm */}
            <section
              className="mt-10 text-center animate-fade-in"
              style={{ animationDelay: '300ms', animationFillMode: 'both' }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-8 bg-amber/50" />
                <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Open a case</span>
                <span className="h-px w-8 bg-amber/50" />
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.05] tracking-tight">
                Real findings. <span className="text-amber italic">No sugar.</span>
              </h2>
              <p className="mt-3 text-sm text-foreground/70 max-w-xl mx-auto">
                Fifteen minutes on the phone. We tell you whether a Leak Audit is even the right instrument for your business. If it isn't, we say so.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/book" target="_blank" rel="noopener noreferrer">
                  <Button size="default" className="h-11 px-6 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider">
                    <Calendar className="w-4 h-4 mr-2" />
                    Request an Investigation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Link to="/business-diagnostic">
                  <Button size="default" variant="outline" className="h-11 px-6 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider">
                    Free 60-sec pre-scan
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          <div className="mt-12">
            <PackageTiers onRequest={() => setContactOpen(true)} />
          </div>
        </main>

        <Footer />
      </div>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default DiagnosticPage;
