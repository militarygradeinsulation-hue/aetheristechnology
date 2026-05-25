import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Server, Copy, Download, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * BriefingsPanel
 * Internal operator documentation. Two long-form briefing docs that explain
 * WHY the main website and the admin→rep backend are laid out the way they are,
 * tied to conversion behavior. Pure presentation — no business logic.
 */

type Section = {
  id: string;
  title: string;
  body: string[]; // paragraphs / bullet lines (lines starting with "- " render as bullets)
};

type Briefing = {
  id: 'site' | 'backend';
  label: string;
  icon: React.ElementType;
  tagline: string;
  sections: Section[];
};

const SITE_BRIEFING: Briefing = {
  id: 'site',
  label: 'Main Website — Aetheris.technology',
  icon: Globe,
  tagline: 'Forensic operator funnel. Every block is built to move a stranger one step closer to booking the $18,500 Diagnostic.',
  sections: [
    {
      id: 'goal',
      title: 'Primary Conversion Goal',
      body: [
        'The site has ONE goal: get a qualified specialty manufacturer ($5M–$25M) to book a 15-minute qualification call for the 21-Day Revenue Diagnostic ($18,500 fixed fee).',
        'Every section either (1) builds trust, (2) reframes their pain in dollars, or (3) hands them a no-friction next step. Anything that does not do one of those three things is pulled.',
      ],
    },
    {
      id: 'home',
      title: '/ (Home) — The Operator Wedge',
      body: [
        'Hero leads with "Your business is leaking. You just can\'t see it from the inside." This is a pattern interrupt — visitors arrive expecting another AI consultant and instead get a forensic accusation. Pattern interrupts measurably lift scroll-depth.',
        '- Operator Identity Bar pinned under nav → credentials-first (20 yrs, Marine Corps, $25M aerospace director, SpaceX accounts). Trust before pitch.',
        '- Three Areas / What You Really Get → reframes "consulting" as "diagnosis + fixes." Removes the #1 objection ("another guru").',
        '- ThePitch / WhatTheHellDoYouSell → blunt, addresses the skepticism out loud. Lowers buyer guard.',
        '- Free /leak-audit CTA above the fold → micro-conversion. A free scan harvests email + qualifies before they ever see a price.',
        '- Hidden: no testimonials carousel, no popups, no 10-industry keyword stack. Forbidden by brand rules because they signal "guru funnel."',
      ],
    },
    {
      id: 'leakaudit',
      title: '/leak-audit — The Free Diagnostic',
      body: [
        'Self-serve scan. Drops a URL in, gets a "leak score" + email-gated report. This is the top of funnel — converts cold traffic into a named lead with a real-business signal (their domain).',
        'Why it works: the prospect SEES their own leak before we pitch anything. By the time sales touches them they\'ve already accepted "we are leaking" — the pricing conversation becomes "how much" not "do we need this."',
        '- Output gates behind email so we capture every scan.',
        '- Auto-feeds drip_prospects + diagnostic_leads tables.',
        '- The $2,500 Forensic Diagnostic is the upsell from this free scan; the $18,500 21-Day is the upsell from THAT.',
      ],
    },
    {
      id: 'methodology',
      title: '/methodology + /credentials — The De-Risking Docs',
      body: [
        'Two PDFs that go to every prospect BEFORE pricing is discussed. They exist to kill the "how do I know this isn\'t snake oil?" objection in writing.',
        '- /methodology: 2-page, how-we-define-a-leak, how-we-baseline, how-we-attribute-recovery. Operator-grade transparency = price-anchor justification.',
        '- /credentials: 1-page bio, military service, certs, business-continuity plan. Sales attaches it to every proposal.',
        'Conversion logic: a $18,500 fixed fee feels expensive in a vacuum. With a written methodology + credentials sheet, it reads as "fair price for a serious operator." Removes haggling.',
      ],
    },
    {
      id: 'services',
      title: '/services + /implementation — Two Offers, On Purpose',
      body: [
        'The public site shows ONLY two offers: 21-Day Diagnostic ($18,500) and Implementation Retainer ($15K/mo, 3-mo min, Diagnostic clients only).',
        'Why only two: decision fatigue kills B2B close rates. A 40-tool catalog reads as "agency." Two offers reads as "operator with a clear engagement path."',
        'Legacy products (14-Day, Fractional CTO, tool packs) still resolve at their URLs so rep-portal links don\'t break — but they are hidden from Navbar / Footer / Home. They resurface publicly only after the 90-day wedge proves out.',
        'No Buy Now button on flagships. Sales-led only. A $18,500 self-checkout would convert worse AND attract lower-fit buyers.',
      ],
    },
    {
      id: 'blog',
      title: '/blog + /resources — SEO + LinkedIn Fuel',
      body: [
        'Content is written in the "forensic operator" voice (see linkedin-playbook memory). Every post has one job: rank for a specialty-manufacturer pain phrase OR be repurposable as a LinkedIn post.',
        '- BlogMidCTA injects a /leak-audit nudge mid-article → captures readers at peak intent.',
        '- RelatedPosts keeps session length up (Google ranking signal).',
        '- ShareButtons + JSON-LD article schema → SERP visibility.',
        'AI Writing Detector (admin tool) is used on every external draft so we never publish slop that tanks our E-E-A-T.',
      ],
    },
    {
      id: 'contact',
      title: '/contact + HubSpot Meeting Embed',
      body: [
        'The contact form posts to contact_submissions AND mirrors to HubSpot. Sales sees the lead in two places — the CRM they live in, and the admin Leads tab.',
        'HubSpot Meetings is embedded directly on /contact so a hot lead can book the qualification call in the same session. Removing the "wait for someone to email me back" gap is the single biggest book-rate lift on the site.',
        'FloatingContact (chat bubble bottom-right) is the omni-page fallback. Constrained by ui-constraints memory: no popups, no exit-intent, no aggressive intercepts.',
      ],
    },
    {
      id: 'seo',
      title: 'SEO + Indianapolis Geo Targeting',
      body: [
        '- Single H1 per page, semantic HTML, alt text everywhere, JSON-LD on blog + services.',
        '- /service-areas + Indianapolis-anchored copy targets "Indianapolis business consultant / CRM audit / revenue leak" local intent.',
        '- robots.txt + sitemap.xml + llms.txt (for AI crawlers) all maintained.',
        '- Custom domains: aetheris.technology (primary), businessforensics.tech (wedge SEO).',
      ],
    },
    {
      id: 'forbidden',
      title: 'What the Site Refuses to Do (and Why)',
      body: [
        '- No testimonial carousels → reads as guru funnel; we earn trust with credentials, not screenshots.',
        '- No social-proof popups ("Bob just bought!") → kills operator credibility.',
        '- No purchase popups, exit-intent modals → friction patterns that punish brand perception more than they lift conversions at this price point.',
        '- No "AI Systems Architect" title, no rainbow AI-guru gradients, no 10-industry keyword stack → all flagged in brand-strategy memory as positioning poison.',
      ],
    },
  ],
};

const BACKEND_BRIEFING: Briefing = {
  id: 'backend',
  label: 'Backend — Admin Console → Rep / Partner Portal',
  icon: Server,
  tagline: 'A two-tier operator system. The admin builds and audits revenue infrastructure; the portal turns reps into closers without ever touching the admin layer.',
  sections: [
    {
      id: 'philosophy',
      title: 'Architectural Philosophy',
      body: [
        'Two surfaces, one database. Admin = operator god-mode. Rep/Partner Portal = sales-ready, gated, AI-assisted closing surface.',
        'Reps never see admin tooling. Admin never has to manually update a rep. The seam between them is the rep_codes + portal_token system — code-only login, HMAC-signed, no email/password to manage.',
        'Conversion logic: every minute a rep wastes hunting for a script, a price, or a follow-up template is a dollar bleeding out. The portal collapses "what do I send / say / quote next?" into one screen.',
      ],
    },
    {
      id: 'admin-layout',
      title: 'Admin Dashboard — Tab Architecture',
      body: [
        '30+ tabs grouped by job-to-be-done. Each tab is independently toggleable (CustomViewSelector) and re-sizable (TabSizeSlider) so the operator builds their own cockpit.',
        '- Workspace / Team Messages / Notifications → daily comms hub. First tab on purpose: morning-open behavior.',
        '- Leads / CRM / Sales & Customers → pipeline. Mirrors HubSpot so no data lives only in one system.',
        '- Tools (All-In-One, Scanner, Social, Sales, Calendar, Follow-Up, Playbook, AI Detector, Resume Analyzer) → operator weapons. Each output auto-saves to admin_library so nothing gets lost.',
        '- Content Engine / Calendar / Library / SEO/AEO → content production line. Drafts go from idea → AI generation → AI Writing Detector → schedule → publish without leaving the dashboard.',
        '- Catalog & Pricing / Commissions / Forecast → revenue math. Single source of truth for what reps sell and what they earn.',
        '- Forensics / Documents / Image Studio / Video Studio / Creation Studio → deliverable factory. Anything a client pays for gets built here.',
        '- Careers / Hires & Onboarding / Training / New-Rep Onboarding / Interviews / Briefing → people pipeline.',
        '- Company Portal preview → admin can literally see what the rep sees, eliminating "is this live for them?" guesswork.',
      ],
    },
    {
      id: 'admin-tools',
      title: 'Why the Tool Set Is Structured This Way',
      body: [
        'Every admin tool maps to a known revenue-leak in a small consulting firm:',
        '- All-In-One Generator → kills the "where do I start with this prospect" leak. One URL, every asset, library-saved.',
        '- Website Scanner / Brand Contradiction / Friction Vocabulary → diagnose-first methodology — the same logic we sell to clients, applied to their own site before the call.',
        '- AI Writing Detector → protects E-E-A-T. Publishing AI-flagged content tanks rankings and credibility; this catches it before it ships. Now logs every scan to a library with a "for whom" field so we can build a baseline per prospect/employee/contractor.',
        '- Playbook / Sales Script / Follow-Up / Strategic Questions → arm the rep with a deliverable per prospect type.',
        '- Resume Analyzer → forensic hiring. Same operator lens, turned inward.',
        '- Creation / Image / Video Studio → in-house content + visual production. No external designer dependency, no slow turnaround on a hot lead.',
      ],
    },
    {
      id: 'rep-portal',
      title: 'Rep / Partner Portal — Closer\'s Cockpit',
      body: [
        'Code-only login (rep_codes table, 6-digit codes, HMAC token). No password reset hell, no abandoned signup flow. A rep can be live in 30 seconds.',
        'Tabs are sequenced by a rep\'s actual day:',
        '- Clock In (RepClockWidget) → opens the shift; partner sees efficiency $/hr.',
        '- Daily Hustle / Daily Tasks → admin-pushed plan-of-attack. Removes "what should I do today?"',
        '- Leads / Game Plan / Calendar → today\'s closeable pipeline + booked calls.',
        '- Sales Coach (AI) → live objection handling, script generation, commission math. Backed by rep-assistant edge function with the full FLAGSHIP commission stack memorized.',
        '- Detective Mode → research a prospect in one screen.',
        '- Creation Studio / Image Studio → rep self-serves their own collateral, branded.',
        '- Forecast Center / Flagship Commission Panel / Incentive Plan → reps SEE the money. Visible commission math is the single biggest activity lift in a sales org.',
        '- Workspace / Notes / History → individual rep\'s long-term memory; survives logout.',
        '- Training / Bootcamp / Onboarding Library → graded MCQ + AI-graded answers. Reps level up without manager time.',
      ],
    },
    {
      id: 'partner-mode',
      title: 'Partner Mode (Braden) — Same Portal, Wider Lens',
      body: [
        'A partner code unlocks the same UI plus company-wide reads: all reps\' totals, last-30d leads, last-30d contact submissions, HubSpot mirror search.',
        'AI coach swaps to PARTNER_ADDENDUM prompt: same sales coaching + access to read-only tools. Never exposes admin-only data (tuning configs, raw tokens).',
        'Why this works: the partner sees the whole field without ever logging into admin. Trust + visibility without giving away the keys.',
      ],
    },
    {
      id: 'commissions',
      title: 'Commission Engine — Built to Recruit',
      body: [
        'Flagship offers use FIXED-DOLLAR splits, not percentages. Reps can do the math in their head — that\'s the entire point.',
        '- $18K Diagnostic → Company $10K / Rep $5K / Partner $3K.',
        '- $15K Retainer → Company $8K / Rep $4K / Partner $3K EVERY MONTH the client stays.',
        '- Tiered catalog (legacy products) → 50/30/20 → 60/25/15 → 70/20/10 by rep volume.',
        '- Bonus stack: volume (+$1K/$2.5K/$5K at 2/3/5 monthly), retention (+$1K/$2.5K/$5K at 3/6/12-mo extensions), referral ($500 onboard + $7K first-close + $500/sale override 12 mo).',
        'All enforced server-side in payments-webhook → flagshipFixedSplit(). Reps can never be shortchanged or overpaid by accident.',
      ],
    },
    {
      id: 'data-flow',
      title: 'Data Flow — One Brain, Many Faces',
      body: [
        'A single Lovable Cloud (Supabase) project powers everything.',
        '- Public site form / scan / quiz → diagnostic_leads, assessment_leads, contact_submissions, drip_prospects.',
        '- Stripe checkout → sales table → triggers payments-webhook → updates rep_codes totals.',
        '- Admin tools → admin_library (every generated asset, taggable per prospect/employee).',
        '- HubSpot mirror → hubspot_contacts, hubspot_deals, hubspot_companies (5-min sync) → searchable from rep AI coach.',
        '- RLS everywhere. Reps see only their own data via portal-token claims. Admin uses service role through edge functions.',
      ],
    },
    {
      id: 'conversion-design',
      title: 'Why This Is Crafted for High Conversions',
      body: [
        '1. Friction is the enemy of revenue. Code-only rep login, in-tab AI coach, in-tab collateral generation — a rep never leaves the portal to close a deal.',
        '2. Visible money = activity. Forecast Center, Flagship Commission Panel, and Incentive Plan all keep the dollar number in front of the rep every login.',
        '3. Operator credibility = price defense. Methodology PDF, credentials PDF, written reports, fixed fees — every layer reinforces "this is a serious shop, the price is fair."',
        '4. Diagnose-first wedge. Free /leak-audit → $2,500 Forensic → $18,500 Diagnostic → $15K/mo Retainer. Each step costs more and demands more commitment, but each step has already been de-risked by the previous one.',
        '5. Single source of truth. One database, one commission engine, one content library. Nothing falls through the cracks because there are no cracks.',
        '6. AI as force multiplier, never as identity. The product is operator judgment + leak diagnosis. AI runs the heavy work invisibly. The brand stays "forensic operator," not "AI guru."',
      ],
    },
  ],
};

const BRIEFINGS: Briefing[] = [SITE_BRIEFING, BACKEND_BRIEFING];

function briefingToText(b: Briefing): string {
  const lines: string[] = [];
  lines.push('AETHERIS TECHNOLOGY — INTERNAL OPERATOR BRIEFING');
  lines.push('================================================');
  lines.push('');
  lines.push(b.label.toUpperCase());
  lines.push(b.tagline);
  lines.push('');
  for (const s of b.sections) {
    lines.push(`## ${s.title}`);
    lines.push('');
    for (const p of s.body) {
      lines.push(p);
      lines.push('');
    }
  }
  lines.push('— Aetheris Technology · Business Forensics Division · Indianapolis');
  return lines.join('\n');
}

function downloadText(filename: string, text: string) {
  const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SectionBlock: React.FC<{ section: Section }> = ({ section }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border/40 rounded-lg overflow-hidden bg-card/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-card/60 transition-colors"
      >
        <span className="font-bold text-foreground text-sm md:text-base">{section.title}</span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/30">
          {section.body.map((line, i) => {
            if (line.startsWith('- ')) {
              return (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-amber font-bold mt-0.5">›</span>
                  <span>{line.slice(2)}</span>
                </div>
              );
            }
            // numbered "1. ..." style → render with bold number
            const numMatch = line.match(/^(\d+\.)\s+(.*)$/);
            if (numMatch) {
              return (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-amber font-bold">{numMatch[1]}</span>
                  <span>{numMatch[2]}</span>
                </div>
              );
            }
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BriefingCard: React.FC<{ briefing: Briefing }> = ({ briefing }) => {
  const Icon = briefing.icon;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefingToText(briefing));
      toast({ title: 'Briefing copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };
  const handleDownload = () => {
    const safe = briefing.id === 'site' ? 'Aetheris_Website_Briefing' : 'Aetheris_Backend_Briefing';
    downloadText(`${safe}_${new Date().toISOString().slice(0,10)}.txt`, briefingToText(briefing));
    toast({ title: 'Briefing downloaded' });
  };
  return (
    <div className="glass rounded-xl border border-amber/30 overflow-hidden">
      <div className="p-5 border-b border-border/40 bg-card/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-amber" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-black text-foreground">{briefing.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{briefing.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button size="sm" onClick={handleDownload} className="bg-amber hover:bg-amber/90 text-background font-bold">
              <Download className="w-4 h-4 mr-1" /> .txt
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 md:p-5 space-y-3">
        {briefing.sections.map(s => <SectionBlock key={s.id} section={s} />)}
      </div>
    </div>
  );
};

export const BriefingsPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground">Operator Briefings</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Internal documentation. Why the public site and the admin → rep backend are built the way they are,
          mapped to the conversion behavior each block is engineered to produce. Use these as onboarding for new reps,
          briefing material for partners, or a reference when iterating on either surface.
        </p>
      </div>
      {BRIEFINGS.map(b => <BriefingCard key={b.id} briefing={b} />)}
    </div>
  );
};

export default BriefingsPanel;
