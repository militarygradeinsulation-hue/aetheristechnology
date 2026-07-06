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
import { PackageTiers } from '@/components/PackageTiers';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';


const INCLUDES = [
  
  'Lead-to-contact, deal-stage progression, and touch-frequency analysis',
  'Full Operator Tool Suite (9 live tools) run against your business, see below',
  'Written report (15-30 pages): leak map + prioritized fixes + ROI projections',
  'Source-data appendix, every CSV, query, and tool export used',
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
  standalonePrice: string;
  standaloneDetail: string;
  priceId: string;
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
    standalonePrice: '$149',
    standaloneDetail: 'one-time · digital footprint snapshot',
    priceId: 'digital_snapshot_once',
  },
  {
    icon: Database,
    name: 'CRM Hygiene Audit',
    finds: 'Duplicate contacts, stalled deals, broken stage definitions, ghost pipeline.',
    inputs: ['12-month CSV export from HubSpot, Salesforce, or any CRM', 'Pipeline + deal stage definitions', 'Sales rep activity log if available'],
    process: ['De-duplicate contacts and companies', 'Flag deals stalled >30/60/90 days at each stage', 'Audit stage definitions against actual rep behavior'],
    deliverables: ['Cleaned contact + deal database returned to you', 'Stalled-deal report by rep, stage, and dollar value', 'Rewritten stage exit criteria'],
    exampleLeak: '$1.1M in pipeline marked "Proposal Sent" that had no follow-up activity in 60+ days, quietly dying in the CRM.',
    standalonePrice: '$79',
    standaloneDetail: 'one-time · CRM health check',
    priceId: 'crm_health_check_once',
  },
  {
    icon: ShieldAlert,
    name: 'Brand Contradiction Finder',
    finds: 'Where your homepage, sales deck, and proposal say three different things.',
    inputs: ['Homepage + about page copy', 'Latest sales deck (PDF or Google Slides)', 'Sample proposal or SOW from last 90 days'],
    process: ['Extract positioning claims, value props, and proof points from each asset', 'Map contradictions in language, pricing posture, and ICP', 'Score buyer-confusion risk on each touchpoint'],
    deliverables: ['Contradiction matrix (asset × claim × conflict)', 'Single-source-of-truth message rewrite', 'Sales-deck red-line for the highest-leverage 3 slides'],
    exampleLeak: 'Homepage said "enterprise-grade." Deck said "made for SMB." Proposal quoted enterprise pricing. Buyers walked.',
    standalonePrice: '$119',
    standaloneDetail: 'one-time · contradiction matrix',
    priceId: 'brand_contradiction_finder_once',
  },
  {
    icon: MessagesSquare,
    name: 'Friction Vocabulary Audit',
    finds: 'Words on your site that quietly cost you the deal.',
    inputs: ['Top 10 site pages by traffic', 'Last 20 lost-deal reasons from CRM', 'Last 10 sales call transcripts (optional)'],
    process: ['Flag jargon, hedging language, and fear-words', 'Cross-reference site copy against actual buyer objections', 'Score each page for clarity, specificity, and momentum'],
    deliverables: ['Word-by-word red-line of priority pages', 'Replacement vocabulary tied to buyer language', 'CTA copy rewrites with predicted lift'],
    exampleLeak: 'The word "solutions" appeared 47 times on the homepage. Buyers couldn\'t tell what was actually being sold.',
    standalonePrice: '$79',
    standaloneDetail: 'one-time · vocabulary red-line',
    priceId: 'friction_vocabulary_audit_once',
  },
  {
    icon: FileSearch,
    name: 'Strategic Question Engine',
    finds: 'The 12 questions a CFO will ask that your team can\'t answer yet.',
    inputs: ['Your industry + business model', 'Last 3 board or investor decks', 'Current revenue, COGS, and pipeline snapshot'],
    process: ['Generate the 12 questions a sharp CFO/board member will ask', 'Stress-test your existing answers against operator benchmarks', 'Identify the data you don\'t yet track'],
    deliverables: ['12-question briefing doc with model answers', 'Gap list of metrics you should be tracking but aren\'t', 'KPI dashboard spec for your finance team'],
    exampleLeak: 'CEO couldn\'t answer "what\'s your CAC by channel?" in a board meeting. Lost a $2M follow-on raise.',
    standalonePrice: '$99',
    standaloneDetail: 'one-time · CFO briefing doc',
    priceId: 'strategic_question_engine_once',
  },
  {
    icon: ListChecks,
    name: '20-Question Business Diagnostic',
    finds: 'Operator-graded scorecard across ops, sales, marketing, and revenue.',
    inputs: ['60-90 minutes from the founder/CEO', '15 minutes each from sales lead + ops lead', 'Last 90 days of revenue + pipeline data'],
    process: ['Structured interview across 4 functional pillars', 'Operator scoring against industry benchmarks', 'Triangulation of leadership answers vs. actual data'],
    deliverables: ['Pillar-by-pillar scorecard (0-100 per area)', 'Top 5 leverage points ranked by ROI', 'Quick-win list executable inside 30 days'],
    exampleLeak: 'Marketing scored 82/100 for activity, 19/100 for attribution. They were spending $40K/mo with no idea what worked.',
    standalonePrice: '$349',
    standaloneDetail: 'one-time · operator scorecard',
    priceId: 'scan_strategy_blueprint_once',
  },
  {
    icon: Mic2,
    name: 'Sales Script + Follow-Up Generator',
    finds: 'Custom outbound + post-quote sequences mapped to your stalled deals.',
    inputs: ['ICP definition + top 3 buyer personas', 'Top 5 stalled-deal reasons from CRM', 'Existing email + call templates if any'],
    process: ['Pattern-match stalled deals to objection clusters', 'Write outbound + follow-up sequences per persona', 'Build talk-tracks for the 3 most common objections'],
    deliverables: ['7-touch outbound cadence (email + LinkedIn + call)', '5-touch post-quote follow-up sequence', 'Objection-handling cheat sheet for the sales team'],
    exampleLeak: 'Reps stopped following up after touch 2. The data says 80% of closed deals took 5-9 touches. We rebuilt the cadence.',
    standalonePrice: '$59',
    standaloneDetail: 'one-time · scripts + cadence',
    priceId: 'sales_script_pack_once',
  },
  {
    icon: CalendarRange,
    name: '90-Day Content Calendar',
    finds: 'Pillar-mapped LinkedIn + email cadence built from leak themes.',
    inputs: ['Findings from the diagnostic (auto-fed)', 'Founder/CEO voice samples (3-5 posts or articles)', 'Top 3 customer-success stories'],
    process: ['Cluster diagnostic findings into 4-6 content pillars', 'Map a 90-day publishing rhythm across LinkedIn + email', 'Draft the first 2 weeks of posts in your voice'],
    deliverables: ['90-day editorial calendar (CSV + Notion)', '14 ready-to-post drafts in founder voice', 'Pillar guide for the in-house writer'],
    exampleLeak: 'Founder posted twice a quarter, randomly. We turned the diagnostic into 90 days of content that pre-sold the next engagement.',
    standalonePrice: '$39',
    standaloneDetail: 'one-time · 90-day calendar',
    priceId: 'content_calendar_once',
  },
  {
    icon: Search,
    name: 'AI Visibility Scorecard',
    finds: 'How ChatGPT, Perplexity, and Google AI describe you vs. competitors.',
    inputs: ['Company name + 3 product/service names', 'Top 5 competitors', '10 buyer-intent prompts you want to win'],
    process: ['Query ChatGPT, Perplexity, Claude, and Google AI Overviews live', 'Score visibility, accuracy, and sentiment per prompt', 'Identify the source pages each AI is pulling from'],
    deliverables: ['Side-by-side AI visibility report (you vs. competitors)', 'Prompt-by-prompt remediation list', 'GEO content brief for the 5 highest-value prompts'],
    exampleLeak: 'ChatGPT recommended a competitor 9 out of 10 times for their core service category. We knew exactly which 3 pages to fix.',
    standalonePrice: '$59',
    standaloneDetail: 'one-time · AI visibility report',
    priceId: 'scan_full_report_once',
  },
];

const NOT_INCLUDED = [
  'Brand strategy, product pricing, or shop-floor operations',
  'Percentage-of-savings billing or ongoing engagement requirement',
  'Vendor reseller commissions on tools we recommend',
];

const DiagnosticPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [openTool, setOpenTool] = useState<string | null>(null);
  
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The Leak Audit™, $2,500 | Aetheris"
        description="Operator-led Leak Audit for specialty manufacturers $5M-$25M. $2,500 flat. Map where CRM, sales follow-up, and lead flow are losing money."
        path="/diagnostic"
        keywords="leak audit, revenue diagnostic, manufacturing CRM audit, sales operations diagnostic, fixed fee consulting"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Leak Audit', path: '/diagnostic' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-24 pb-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Specialty manufacturers · $5M-$25M
              </div>
              <h1 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.05]">
                <span className="leak-audit-glow text-amber">The Leak Audit™.</span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                We map where your CRM, sales follow-up, and lead flow are losing you money. Written report with prioritized fixes, ROI projections, and an implementation roadmap — $2,500 flat.
              </p>
              <div className="mt-4 max-w-3xl mx-auto">
                <div className="relative w-full rounded-lg overflow-hidden shadow-xl border border-amber/20" style={{ paddingTop: '56.25%' }}>
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

            <section className="forensic-tile rounded-sm border border-crimson/40 p-4 mb-5">
              <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-2">
                Why we're not another AI company
              </div>
              <h2 className="font-forensic text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
                Every other AI shop sells you tools. We use ours <span className="text-crimson">on you</span>.
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="forensic-tile rounded-sm border border-border/60 p-3">
                  <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Them</div>
                  <ul className="space-y-1 text-xs text-foreground/65">
                    <li>• Sell a chatbot, dashboard, or "AI platform" license</li>
                    <li>• Hand you software and walk away</li>
                    <li>• Charge per seat, per token, per month, forever</li>
                    <li>• Pitch "AI transformation" with no operator on the floor</li>
                    <li>• Generic playbooks from a junior + GPT wrapper</li>
                    <li>• You do the work of finding what's broken</li>
                  </ul>
                </div>
                <div className="forensic-tile rounded-sm border border-amber/40 p-3">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Aetheris</div>
                  <ul className="space-y-1 text-xs text-foreground/90">
                    <li>• A human operator runs 9 forensic tools <strong>against your business</strong></li>
                    <li>• You get a written leak map, not a software login</li>
                    <li>• One fixed fee. $2,500. Nothing else owed to read the report</li>
                    <li>• 20+ years operating real P&Ls before the AI was bolted on</li>
                    <li>• Findings tied to dollars: deal stalls, CRM bleed, lost follow-up</li>
                    <li>• We tell you exactly where the money is leaking and what to fix first</li>
                  </ul>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic mt-2 text-center">
                AI is the microscope. The operator holds it. That's the difference.
              </p>
            </section>

            <div className="forensic-tile rounded-sm border border-amber/40 p-5 mb-5 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Fixed fee</div>
              <div className="font-forensic text-5xl md:text-6xl font-bold text-foreground">$2,500</div>
              <p className="text-xs text-muted-foreground mt-1.5">Operator-led. Nothing ongoing. No percentage-of-savings. Applied toward any engagement.</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-3">
                <a href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst" target="_blank" rel="noopener noreferrer">
                  <Button size="default" className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                    Book a 15-min call <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
                <Link to="/methodology">
                  <Button size="default" variant="outline" className="glass-hover border-amber/40 text-amber">
                    Read the methodology first
                  </Button>
                </Link>
              </div>
            </div>

            {/* Objection / rebuttal */}
            <section className="forensic-tile rounded-sm border border-crimson/50 p-4 md:p-5 mb-5">
              <div className="font-case text-[10px] uppercase tracking-widest text-crimson mb-2">
                The objection we hear every time
              </div>
              <blockquote className="font-forensic text-2xl md:text-3xl font-bold text-crimson leading-tight mb-1">
                "That's just too expensive!"
              </blockquote>
              <p className="text-xs text-muted-foreground italic mb-4">
                Said by every CFO who hasn't done the math. Here's the math.
              </p>

              <h3 className="font-forensic text-base md:text-lg font-bold text-foreground mb-3">
                $2,500 buys what the alternative shelf charges $90K-$240K for — and most still won't touch your CRM data.
              </h3>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-amber/30">
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-muted-foreground py-1.5 pr-2">Line item</th>
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-muted-foreground py-1.5 px-2">Alternative</th>
                      <th className="text-left font-case text-[10px] uppercase tracking-widest text-amber py-1.5 pl-2">Aetheris</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground/85">
                    {[
                      ['CRM audit + cleanup (HubSpot/Salesforce)', '$15K - $40K', 'Included'],
                      ['Sales process + pipeline diagnostic', '$20K - $50K', 'Included'],
                      ['Website + SEO/GEO + AI-visibility audit', '$8K - $25K', 'Included'],
                      ['Brand/messaging contradiction audit', '$10K - $20K', 'Included'],
                      ['Sales script + 7-touch follow-up build', '$6K - $15K', 'Included'],
                      ['90-day content calendar + first 14 drafts', '$8K - $20K', 'Included'],
                      ['Operator-graded scorecard + readout', '$10K - $30K', 'Included'],
                      ['Written report w/ ROI + roadmap', '$5K - $15K', 'Included'],
                      ['Source-data appendix (CSVs + queries)', 'Rare', 'Included'],
                    ].map(([item, alt, us]) => (
                      <tr key={item} className="border-b border-border/30">
                        <td className="py-1.5 pr-2">{item}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{alt}</td>
                        <td className="py-1.5 pl-2 text-amber font-semibold">{us}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-amber/50">
                      <td className="py-2 pr-2 font-bold text-foreground">TOTAL</td>
                      <td className="py-2 px-2 font-bold text-muted-foreground">$82K - $215K</td>
                      <td className="py-2 pl-2 font-bold text-amber">$2,500 flat</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="forensic-tile rounded-sm border border-amber/40 p-2.5 text-center">
                  <div className="font-forensic text-base sm:text-lg font-bold text-amber leading-tight">Fast</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">vs. 90-120 days</div>
                </div>
                <div className="forensic-tile rounded-sm border border-amber/40 p-2.5 text-center">
                  <div className="font-forensic text-base sm:text-lg font-bold text-amber leading-tight">1 operator</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">20+ yrs · not a GPT wrapper</div>
                </div>
                <div className="forensic-tile rounded-sm border border-amber/40 p-2.5 text-center">
                  <div className="font-forensic text-base sm:text-lg font-bold text-amber leading-tight">$0 ongoing</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Read, walk, or open a case</div>
                </div>
              </div>

              <div className="forensic-tile rounded-sm border border-crimson/40 p-3">
                <p className="text-foreground/90 text-xs md:text-sm leading-relaxed">
                  Average $5M-$25M manufacturer leaks <span className="text-crimson font-bold">$400K-$1.4M/yr</span> through stalled pipeline, broken follow-up, and CRM rot. <span className="text-foreground font-bold">$2,500 to find it is a rounding error.</span> One recovered deal usually pays 100x.
                </p>
              </div>
            </section>

            <div className="grid md:grid-cols-2 gap-3 mb-5">
              <section className="forensic-tile rounded-sm border border-border/60 p-4">
                <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">What you get</div>
                <ul className="space-y-1.5">
                  {INCLUDES.map((i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/85">
                      <Check className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="forensic-tile rounded-sm border border-border/60 p-4">
                <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-2">What it isn't</div>
                <ul className="space-y-1.5">
                  {NOT_INCLUDED.map((i) => (
                    <li key={i} className="flex gap-2 text-xs text-foreground/85">
                      <X className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>


            <section className="forensic-tile rounded-sm border border-border/60 p-4 mb-6">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">CRM-agnostic</div>
              <h2 className="font-forensic text-lg font-bold text-foreground mb-1">Runs on a CSV export.</h2>
              <p className="text-xs text-foreground/80">
                No HubSpot or Salesforce required. We work from a CSV export of contacts, deals, and activity. Running it live in your CRM is a paid upsell, not a prerequisite.
              </p>
            </section>


          </div>

          <PackageTiers onRequest={() => setContactOpen(true)} />
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default DiagnosticPage;
