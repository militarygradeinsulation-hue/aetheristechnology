import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, X, Database, Globe, MessagesSquare, FileSearch,
  CalendarRange, Mic2, ListChecks, ShieldAlert, Search, ChevronDown,
} from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';

const INCLUDES = [
  '12-month CRM snapshot pulled from HubSpot, Salesforce, or CSV export',
  'Lead-to-contact, deal-stage progression, and touch-frequency analysis',
  'Full Operator Tool Suite (9 live tools) run against your business — see below',
  'Written report (15–30 pages): leak map + prioritized fixes + ROI projections',
  'Source-data appendix — every CSV, query, and tool export used',
  '60-minute readout with you and up to two of your team',
  'Fixed-fee implementation quote if you choose to proceed',
];

interface ToolItem {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  finds: string;
  inputs: string[];
  process: string[];
  deliverables: string[];
  exampleLeak: string;
}

const TOOL_BUNDLE: ToolItem[] = [
  {
    icon: Globe,
    name: 'Website + Digital Footprint Scan',
    finds: 'AI-readiness, SEO/GEO gaps, schema, page-speed leaks visible to buyers.',
    inputs: ['Public domain + up to 25 priority URLs', 'Google Business Profile + LinkedIn company page', 'Top 5 competitor domains for benchmark'],
    process: ['Crawl pages for schema, meta, alt text, Core Web Vitals', 'Score AI-readability (how LLMs parse and quote your site)', 'Compare local/GEO presence vs. competitors'],
    deliverables: ['Page-by-page scorecard with red/amber/green flags', 'Prioritized fix list with effort vs. revenue impact', 'GEO + schema patch recommendations'],
    exampleLeak: '$240K/yr in inbound leads lost because product pages had no schema and were invisible to ChatGPT and Perplexity searches.',
  },
  {
    icon: Database,
    name: 'CRM Hygiene Audit',
    finds: 'Duplicate contacts, stalled deals, broken stage definitions, ghost pipeline.',
    inputs: ['12-month CSV export from HubSpot, Salesforce, or any CRM', 'Pipeline + deal stage definitions', 'Sales rep activity log if available'],
    process: ['De-duplicate contacts and companies', 'Flag deals stalled >30/60/90 days at each stage', 'Audit stage definitions against actual rep behavior'],
    deliverables: ['Cleaned contact + deal database returned to you', 'Stalled-deal report by rep, stage, and dollar value', 'Rewritten stage exit criteria'],
    exampleLeak: '$1.1M in pipeline marked "Proposal Sent" that had no follow-up activity in 60+ days — quietly dying in the CRM.',
  },
  {
    icon: ShieldAlert,
    name: 'Brand Contradiction Finder',
    finds: 'Where your homepage, sales deck, and proposal say three different things.',
    inputs: ['Homepage + about page copy', 'Latest sales deck (PDF or Google Slides)', 'Sample proposal or SOW from last 90 days'],
    process: ['Extract positioning claims, value props, and proof points from each asset', 'Map contradictions in language, pricing posture, and ICP', 'Score buyer-confusion risk on each touchpoint'],
    deliverables: ['Contradiction matrix (asset × claim × conflict)', 'Single-source-of-truth message rewrite', 'Sales-deck red-line for the highest-leverage 3 slides'],
    exampleLeak: 'Homepage said "enterprise-grade." Deck said "made for SMB." Proposal quoted enterprise pricing. Buyers walked.',
  },
  {
    icon: MessagesSquare,
    name: 'Friction Vocabulary Audit',
    finds: 'Words on your site that quietly cost you the deal.',
    inputs: ['Top 10 site pages by traffic', 'Last 20 lost-deal reasons from CRM', 'Last 10 sales call transcripts (optional)'],
    process: ['Flag jargon, hedging language, and fear-words', 'Cross-reference site copy against actual buyer objections', 'Score each page for clarity, specificity, and momentum'],
    deliverables: ['Word-by-word red-line of priority pages', 'Replacement vocabulary tied to buyer language', 'CTA copy rewrites with predicted lift'],
    exampleLeak: 'The word "solutions" appeared 47 times on the homepage. Buyers couldn\'t tell what was actually being sold.',
  },
  {
    icon: FileSearch,
    name: 'Strategic Question Engine',
    finds: 'The 12 questions a CFO will ask that your team can\'t answer yet.',
    inputs: ['Your industry + business model', 'Last 3 board or investor decks', 'Current revenue, COGS, and pipeline snapshot'],
    process: ['Generate the 12 questions a sharp CFO/board member will ask', 'Stress-test your existing answers against operator benchmarks', 'Identify the data you don\'t yet track'],
    deliverables: ['12-question briefing doc with model answers', 'Gap list of metrics you should be tracking but aren\'t', 'KPI dashboard spec for your finance team'],
    exampleLeak: 'CEO couldn\'t answer "what\'s your CAC by channel?" in a board meeting. Lost a $2M follow-on raise.',
  },
  {
    icon: ListChecks,
    name: '20-Question Business Diagnostic',
    finds: 'Operator-graded scorecard across ops, sales, marketing, and revenue.',
    inputs: ['60–90 minutes from the founder/CEO', '15 minutes each from sales lead + ops lead', 'Last 90 days of revenue + pipeline data'],
    process: ['Structured interview across 4 functional pillars', 'Operator scoring against industry benchmarks', 'Triangulation of leadership answers vs. actual data'],
    deliverables: ['Pillar-by-pillar scorecard (0–100 per area)', 'Top 5 leverage points ranked by ROI', 'Quick-win list executable inside 30 days'],
    exampleLeak: 'Marketing scored 82/100 for activity, 19/100 for attribution. They were spending $40K/mo with no idea what worked.',
  },
  {
    icon: Mic2,
    name: 'Sales Script + Follow-Up Generator',
    finds: 'Custom outbound + post-quote sequences mapped to your stalled deals.',
    inputs: ['ICP definition + top 3 buyer personas', 'Top 5 stalled-deal reasons from CRM', 'Existing email + call templates if any'],
    process: ['Pattern-match stalled deals to objection clusters', 'Write outbound + follow-up sequences per persona', 'Build talk-tracks for the 3 most common objections'],
    deliverables: ['7-touch outbound cadence (email + LinkedIn + call)', '5-touch post-quote follow-up sequence', 'Objection-handling cheat sheet for the sales team'],
    exampleLeak: 'Reps stopped following up after touch 2. The data says 80% of closed deals took 5–9 touches. We rebuilt the cadence.',
  },
  {
    icon: CalendarRange,
    name: '90-Day Content Calendar',
    finds: 'Pillar-mapped LinkedIn + email cadence built from leak themes.',
    inputs: ['Findings from the diagnostic (auto-fed)', 'Founder/CEO voice samples (3–5 posts or articles)', 'Top 3 customer-success stories'],
    process: ['Cluster diagnostic findings into 4–6 content pillars', 'Map a 90-day publishing rhythm across LinkedIn + email', 'Draft the first 2 weeks of posts in your voice'],
    deliverables: ['90-day editorial calendar (CSV + Notion)', '14 ready-to-post drafts in founder voice', 'Pillar guide for the in-house writer or agency'],
    exampleLeak: 'Founder posted twice a quarter, randomly. We turned the diagnostic into 90 days of content that pre-sold the next engagement.',
  },
  {
    icon: Search,
    name: 'AI Visibility Scorecard',
    finds: 'How ChatGPT, Perplexity, and Google AI describe you vs. competitors.',
    inputs: ['Company name + 3 product/service names', 'Top 5 competitors', '10 buyer-intent prompts you want to win'],
    process: ['Query ChatGPT, Perplexity, Claude, and Google AI Overviews live', 'Score visibility, accuracy, and sentiment per prompt', 'Identify the source pages each AI is pulling from'],
    deliverables: ['Side-by-side AI visibility report (you vs. competitors)', 'Prompt-by-prompt remediation list', 'GEO content brief for the 5 highest-value prompts'],
    exampleLeak: 'ChatGPT recommended a competitor 9 out of 10 times for their core service category. We knew exactly which 3 pages to fix.',
  },
];

const NOT_INCLUDED = [
  'Brand strategy, product pricing, or shop-floor operations',
  'Percentage-of-savings billing or ongoing retainer requirement',
  'Vendor reseller commissions on tools we recommend',
];

const DiagnosticPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The 21-Day Revenue Diagnostic — $18,500 | Aetheris"
        description="Fixed-fee 21-day diagnostic for specialty manufacturers $5M–$25M. Map where CRM, sales follow-up, and lead flow are losing money."
        path="/diagnostic"
        keywords="revenue diagnostic, manufacturing CRM audit, sales operations diagnostic, fixed fee consulting"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Diagnostic', path: '/diagnostic' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Specialty manufacturers · $5M–$25M
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
                The 21-Day Revenue Diagnostic.
              </h1>
              <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
                We map where your CRM, sales follow-up, and lead flow are losing you money. You get a written report with prioritized fixes, ROI projections, and an implementation roadmap.
              </p>
              <div className="mt-8 max-w-3xl mx-auto">
                <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-amber/20" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1191299864?badge=0&autopause=0&player_id=0&app_id=58479"
                    loading="lazy"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    allowFullScreen
                    title="The 21-Day Revenue Diagnostic"
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>

            <section className="premium-tile rounded-sm border border-crimson/40 p-6 mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-3">
                Why we're not another AI company
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                Every other AI shop sells you tools. We use ours <span className="text-crimson">on you</span>.
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="premium-tile rounded-sm border border-border/60 p-4">
                  <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Them</div>
                  <ul className="space-y-1.5 text-sm text-foreground/65">
                    <li>• Sell you a chatbot, dashboard, or "AI platform" license</li>
                    <li>• Hand you software and walk away</li>
                    <li>• Charge per seat, per token, per month, forever</li>
                    <li>• Pitch "AI transformation" with no operator on the floor</li>
                    <li>• Generic playbooks from a junior consultant + GPT wrapper</li>
                    <li>• You do the work of finding what's broken</li>
                  </ul>
                </div>
                <div className="premium-tile rounded-sm border border-amber/40 p-4">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Aetheris</div>
                  <ul className="space-y-1.5 text-sm text-foreground/90">
                    <li>• A human operator runs 9 forensic tools <strong>against your business</strong></li>
                    <li>• You get a written leak map — not a software login</li>
                    <li>• One fixed fee. $18,500. No retainer to read the report</li>
                    <li>• 20+ years operating real P&Ls before the AI was bolted on</li>
                    <li>• Findings tied to dollars: deal stalls, CRM bleed, lost follow-up</li>
                    <li>• We tell you exactly where the money is leaking and what to fix first</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic mt-4 text-center">
                AI is the microscope. The operator is the one holding it. That's the difference.
              </p>
            </section>

            <div className="premium-tile rounded-sm border border-amber/40 p-8 mb-10 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Fixed fee</div>
              <div className="font-forensic text-6xl md:text-7xl font-bold text-foreground">$18,500</div>
              <p className="text-sm text-muted-foreground mt-2">21 calendar days. No retainer required. No percentage-of-savings.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <a href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    Book a 15-min call <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Link to="/methodology">
                  <Button size="lg" variant="outline" className="glass-hover border-amber/40 text-amber">
                    Read the methodology first
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Methodology document goes to every prospect before pricing.
              </p>
            </div>

            {/* Objection / rebuttal */}
            <section className="premium-tile rounded-sm border border-crimson/50 p-6 md:p-8 mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-3">
                The objection we hear every time
              </div>
              <blockquote className="font-forensic text-3xl md:text-4xl font-bold text-crimson leading-tight mb-2">
                "That's just too expensive!"
              </blockquote>
              <p className="text-sm text-muted-foreground italic mb-6">
                Said by every CFO who hasn't done the math yet. Here's the math.
              </p>

              <h3 className="font-forensic text-xl md:text-2xl font-bold text-foreground mb-4">
                $18,500 buys you what an agency charges $90K–$240K for — and most agencies still won't touch your CRM data.
              </h3>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-amber/30">
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-muted-foreground py-2 pr-3">Line item</th>
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-muted-foreground py-2 px-3">Typical agency / consultancy</th>
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-amber py-2 pl-3">Aetheris Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/85">
                    {[
                      ['CRM audit + cleanup (HubSpot/Salesforce)', '$15,000 – $40,000', 'Included'],
                      ['Sales process + pipeline diagnostic', '$20,000 – $50,000', 'Included'],
                      ['Website + SEO/GEO + AI-visibility audit', '$8,000 – $25,000', 'Included'],
                      ['Brand/messaging contradiction audit', '$10,000 – $20,000', 'Included'],
                      ['Sales script + 7-touch follow-up build', '$6,000 – $15,000', 'Included'],
                      ['90-day content calendar + first 14 drafts', '$8,000 – $20,000', 'Included'],
                      ['Operator-graded scorecard + readout', '$10,000 – $30,000', 'Included'],
                      ['Written report w/ ROI projections + roadmap', '$5,000 – $15,000', 'Included'],
                      ['Source-data appendix (every CSV + query)', 'Rarely offered', 'Included'],
                    ].map(([item, agency, us]) => (
                      <tr key={item} className="border-b border-border/30">
                        <td className="py-2 pr-3">{item}</td>
                        <td className="py-2 px-3 text-muted-foreground">{agency}</td>
                        <td className="py-2 pl-3 text-amber font-semibold">{us}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-amber/50">
                      <td className="py-3 pr-3 font-bold text-foreground">TOTAL</td>
                      <td className="py-3 px-3 font-bold text-muted-foreground">$82,000 – $215,000</td>
                      <td className="py-3 pl-3 font-bold text-amber text-lg">$18,500 flat</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="premium-tile rounded-sm border border-amber/40 p-4">
                  <div className="font-forensic text-3xl font-bold text-amber">21 days</div>
                  <div className="text-xs text-muted-foreground mt-1">Fixed timeline. Agencies average 90–120 days to deliver less.</div>
                </div>
                <div className="premium-tile rounded-sm border border-amber/40 p-4">
                  <div className="font-forensic text-3xl font-bold text-amber">1 operator</div>
                  <div className="text-xs text-muted-foreground mt-1">20+ years running real P&Ls. Not a junior + a GPT wrapper.</div>
                </div>
                <div className="premium-tile rounded-sm border border-amber/40 p-4">
                  <div className="font-forensic text-3xl font-bold text-amber">$0 retainer</div>
                  <div className="text-xs text-muted-foreground mt-1">Read the report. Walk away. Or hire us to fix it. Your call.</div>
                </div>
              </div>

              <div className="premium-tile rounded-sm border border-crimson/40 p-5">
                <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-2">
                  The real math
                </div>
                <p className="text-foreground/90 text-sm md:text-base leading-relaxed">
                  The average $5M–$25M manufacturer we audit is leaking <span className="text-crimson font-bold">$400K–$1.4M/yr</span> through stalled pipeline, broken follow-up, and CRM rot. <span className="text-foreground font-bold">$18,500 to find the leak is roughly 1.3% – 4.6% of what it's costing you to ignore it.</span> One recovered deal usually pays for the engagement 5–20x over.
                </p>
                <p className="text-xs text-muted-foreground italic mt-3">
                  If after the readout you don't see at least 3x the fee in identified, recoverable revenue, we'll tell you ourselves — before you sign anything else.
                </p>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              <section className="premium-tile rounded-sm border border-border/60 p-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">What you get</div>
                <ul className="space-y-2.5">
                  {INCLUDES.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/85">
                      <Check className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="premium-tile rounded-sm border border-border/60 p-6">
                <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-3">What it isn't</div>
                <ul className="space-y-2.5">
                  {NOT_INCLUDED.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/70">
                      <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="premium-tile rounded-sm border border-amber/40 p-6 mb-10">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                  Automatically included · $18,500 package
                </div>
                <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                  No add-on fee · No upsell
                </div>
              </div>
              <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">
                The full Operator Tool Suite ships with every Diagnostic.
              </h2>
              <p className="text-sm text-foreground/75 mb-5">
                When you buy the $18,500 package, your operator automatically runs all nine live diagnostic tools against your business — the same instruments our reps use in the field. Every finding feeds the final leak map. No tier upgrades, no à la carte pricing, no "tool access" SKUs. It's all in.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TOOL_BUNDLE.map((t, idx) => {
                  const Icon = t.icon;
                  const isOpen = openTool === t.name;
                  return (
                    <div
                      key={t.name}
                      className={`premium-tile rounded-md transition-all duration-500 ${
                        isOpen
                          ? 'border-amber/70 md:col-span-2 lg:col-span-3 shadow-[0_24px_70px_-18px_hsl(var(--amber-glow)/0.35)]'
                          : 'border-border/60 hover:border-amber/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenTool(isOpen ? null : t.name)}
                        aria-expanded={isOpen}
                        className="w-full text-left p-4 group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            isOpen
                              ? 'bg-amber/20 ring-1 ring-amber/50 shadow-[0_0_18px_-2px_hsl(var(--amber-glow)/0.55)]'
                              : 'bg-amber/10 group-hover:bg-amber/20'
                          }`}>
                            <Icon className="w-5 h-5 text-amber" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-case text-[9px] uppercase tracking-widest text-amber/80 mb-0.5">
                              Tool {String(idx + 1).padStart(2, '0')} / 09
                            </div>
                            <div className="font-bold text-foreground text-sm leading-tight">{t.name}</div>
                          </div>
                          <div className={`w-7 h-7 rounded-full border border-amber/40 flex items-center justify-center shrink-0 transition-all ${
                            isOpen ? 'bg-amber text-primary-foreground rotate-180' : 'text-amber group-hover:bg-amber/10'
                          }`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-xs text-foreground/70 leading-snug pl-[3.25rem]">
                          <span className="font-case text-[9px] uppercase tracking-widest text-amber">Finds → </span>
                          {t.finds}
                        </p>
                        {!isOpen && (
                          <div className="pl-[3.25rem] mt-2 font-case text-[9px] uppercase tracking-widest text-muted-foreground/70 group-hover:text-amber/80 transition-colors">
                            Click to open the case file →
                          </div>
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-5 pt-0 animate-fade-in">
                          <div className="h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent mb-5" />
                          <div className="grid md:grid-cols-3 gap-3">
                            {[
                              { label: '01 · Inputs we need', items: t.inputs, accent: 'amber' },
                              { label: '02 · How the operator runs it', items: t.process, accent: 'amber' },
                              { label: '03 · What you get back', items: t.deliverables, accent: 'amber' },
                            ].map((col) => (
                              <div key={col.label} className="rounded-md border border-amber/20 bg-background/40 p-4 hover:border-amber/40 transition-colors">
                                <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-2.5 pb-2 border-b border-amber/15">
                                  {col.label}
                                </div>
                                <ul className="space-y-2 text-xs text-foreground/85 leading-relaxed">
                                  {col.items.map((x) => (
                                    <li key={x} className="flex gap-2">
                                      <span className="text-amber/60 shrink-0">▸</span>
                                      <span>{x}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 rounded-md border border-crimson/40 bg-crimson/5 p-4 relative overflow-hidden">
                            <div className="absolute top-2 right-3 font-case text-[8px] uppercase tracking-widest text-crimson/60">
                              Case file · Verified
                            </div>
                            <div className="font-case text-[9px] uppercase tracking-widest text-crimson mb-1.5">
                              Real leak we caught
                            </div>
                            <p className="text-sm text-foreground/90 italic leading-relaxed">"{t.exampleLeak}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground italic mt-4">
                Tool outputs land in the source-data appendix. Your team keeps the raw exports after the engagement.
              </p>
            </section>

            <section className="premium-tile rounded-sm border border-border/60 p-6 mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">CRM-agnostic</div>
              <h2 className="font-forensic text-xl font-bold text-foreground mb-2">Runs on a CSV export.</h2>
              <p className="text-sm text-foreground/80">
                You don't need to be on HubSpot or Salesforce. We work from a CSV export of contacts, deals, and activity. If you want us to run it live in your CRM, that's a paid upsell — not a prerequisite.
              </p>
            </section>

            <section className="premium-tile rounded-sm border border-amber/30 p-6 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">After the diagnostic</div>
              <h2 className="font-forensic text-2xl font-bold text-foreground mb-2">Implementation Retainer — $15K/month.</h2>
              <p className="text-sm text-foreground/80 mb-4">
                3-month minimum. Available only to Diagnostic clients. We execute the prioritized fixes ourselves.
              </p>
              <Link to="/implementation" className="text-amber font-semibold hover:underline">
                See implementation details →
              </Link>
            </section>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default DiagnosticPage;
