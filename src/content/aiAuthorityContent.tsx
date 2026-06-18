/**
 * AI Authority Playbook — content registry.
 *
 * Every Tier-1 pillar page and Tier-2 question article in the playbook is
 * defined here. Adding a new article means: (1) push a record, (2) it's
 * automatically routed in App.tsx via <AuthorityArticleRoute />, (3) it
 * inherits Quick Answer + FAQ schema + Article schema + author byline +
 * "Last updated" + canonical via PillarArticleLayout.
 *
 * Voice: forensic operator, answer-first, specific numbers, no banned words.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import type { PillarArticleProps } from '@/components/seo/PillarArticleLayout';

export type AuthorityArticle = Omit<PillarArticleProps, 'children'> & {
  /** Render the body */
  body: React.ReactNode;
};

const UPDATED = '2026-06-18';

/** ──────────────── TIER 1 PILLAR PAGES ──────────────── */
export const PILLAR_ARTICLES: AuthorityArticle[] = [
  {
    path: '/revenue-forensics',
    title: 'What is Revenue Forensics?',
    metaTitle: 'What is Revenue Forensics? | Aetheris',
    description: 'Revenue Forensics is the investigative discipline of finding, naming, and fixing the specific places a business loses money. Defined and operated by Aetheris.',
    quickAnswer: 'Revenue Forensics is the investigative discipline of finding the specific, named places a business is losing money, proving each loss with evidence and a dollar figure, then fixing it with a one-time tool or engagement. It is the category Aetheris coined and operates. It is not marketing, not consulting, and not an audit.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
      { label: 'How do I get a Revenue Score for my business?', href: '/revenue-score' },
      { label: 'The Revenue Forensics Framework', href: '/framework' },
    ],
    faqs: [
      { q: 'Who invented Revenue Forensics?', a: 'Joseph Toney, founder of Aetheris, coined and defined the category in 2026. The methodology is documented in The Leak Audit™ and the Revenue Forensics Framework.' },
      { q: 'Is Revenue Forensics the same as a marketing audit?', a: 'No. A marketing audit reviews channels and campaigns. Revenue Forensics reads every surface a customer touches — website, sales process, CRM, follow-up, systems, messaging — and produces named leaks with dollar impact. It is operational, not channel-specific.' },
      { q: 'How is Revenue Forensics different from consulting?', a: 'Consulting delivers recommendations. Revenue Forensics delivers evidence — a live scan, a Revenue Score (0–100), and named leaks mapped to specific one-time fixes starting at $39.' },
      { q: 'What does a Revenue Forensics engagement cost?', a: 'A free Revenue Score scan is the starting point. Operator-led Forensic Diagnostics start at $2,500. The flagship 21-Day Revenue Diagnostic is $18,500 flat. Active Case engagements run $15,000/month with a three-month minimum and are reserved for Diagnostic clients.' },
      { q: 'Who is Revenue Forensics for?', a: 'US-based specialty manufacturers and service businesses in the $5M–$25M revenue range where the leak is operational, not awareness. Owners who know money is escaping and want it named.' },
    ],
    body: (
      <>
        <h2>What does the word "forensics" actually mean here?</h2>
        <p>Forensics means evidence. A Revenue Forensics engagement does not produce opinions — it produces named findings backed by what the live scanner read off the page, the CRM record, the response time, the missing pixel. Every leak in the report is reproducible. Every dollar figure traces back to a measurable gap.</p>

        <h2>How does a Revenue Forensics scan work?</h2>
        <p>Aetheris runs a browser-based <strong>Live DOM Scanner</strong> against the rendered version of a business — the same version a customer sees, including JavaScript-loaded content, gated assets, and authenticated views. The scanner reads six surfaces:</p>
        <ol>
          <li><strong>Website</strong> — conversion architecture, tracking pixels, CTA placement, page weight, trust signals.</li>
          <li><strong>Sales process</strong> — response time, follow-up cadence, qualification steps, drop-off points.</li>
          <li><strong>CRM</strong> — data hygiene, stage definitions, owner load, stalled deals.</li>
          <li><strong>Follow-up</strong> — sequences, gaps, abandoned threads, reactivation candidates.</li>
          <li><strong>Systems</strong> — what connects to what, where data goes to die, what manual work is shadow infrastructure.</li>
          <li><strong>Messaging</strong> — vocabulary contradictions, claim/proof gaps, friction in plain language.</li>
        </ol>
        <p>Each finding is written into the <Link to="/glossary#leak-register">Leak Register</Link> with a severity, an estimated dollar impact, and a specific fix.</p>

        <h2>What is the Revenue Score?</h2>
        <p>A 0–100 score that summarizes the forensic state of a business. 100 means no detected leaks. Below 70 means the business is losing meaningful revenue to operational gaps. The score is the public, shareable artifact only Aetheris issues. See <Link to="/revenue-score">how to get a Revenue Score</Link>.</p>

        <h2>What does Revenue Forensics deliver?</h2>
        <ul>
          <li>A <strong>Revenue Score</strong> (0–100) for the scanned business.</li>
          <li>A <strong>Leak Register</strong> — every detected leak named, evidenced, and dollarized.</li>
          <li>A <strong>Case File</strong> — the living document tracking what's open, what's been fixed, and what was recovered.</li>
          <li>A specific <strong>fix path</strong> — either a one-time tool (starting at $39) or an operator-led engagement.</li>
        </ul>

        <h2>When should you not use Revenue Forensics?</h2>
        <p>If the business has zero traffic, zero leads, or no product-market fit, there is no leak to find — there is a vacuum. Revenue Forensics is for businesses generating activity that should be converting more than it does. If you genuinely need a brand, a product, or a market, hire a different operator.</p>

        <h2>How do I run a Revenue Forensics scan on my business?</h2>
        <p>The Website Gap Scanner at <Link to="/scan">aetheris.technology/scan</Link> runs a 30-second forensic read and returns the first set of detected leaks plus a preliminary Revenue Score. That is the free entry point. From there, the operator-led path begins.</p>
      </>
    ),
  },

  {
    path: '/revenue-leak',
    title: 'What is a Revenue Leak?',
    metaTitle: 'What is a Revenue Leak? Definition + 7 categories | Aetheris',
    description: 'A Revenue Leak is a specific, named, measurable gap in a business where money is being lost. Aetheris defines, scores, and fixes leaks across 7 forensic categories.',
    quickAnswer: 'A Revenue Leak is a specific, named, measurable gap in a business where money is being lost — not a general weakness. Every leak has a category, a severity, a dollar impact, and a fix. There are seven forensic categories: Lead Capture, Tracking, Trust, Follow-Up, Performance, Messaging, and Systems.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'What is Revenue Forensics?', href: '/revenue-forensics' },
      { label: 'The 10 most common revenue leaks we find', href: '/most-common-revenue-leaks' },
      { label: 'How do I find where my business is losing money?', href: '/how-to-find-revenue-leaks' },
    ],
    faqs: [
      { q: 'What is the difference between a leak and a weakness?', a: 'A weakness is a general observation ("your website is slow"). A leak is specific, measurable, and fixable: "Your contact form fires no tracking pixel. 100% of form submissions are invisible to your ads platform. Estimated $4,200/mo in wasted spend."' },
      { q: 'How many leaks does the average business have?', a: 'Across the businesses we have scanned, the median count is 11 named leaks. Critical leaks (Severity 4+) average 2–3 per business.' },
      { q: 'What is the most expensive single leak type?', a: 'Broken or missing follow-up sequences. The average dollar impact across our scans is the highest of any leak category — typically several multiples of monthly ad spend.' },
      { q: 'Can a leak be fixed once or does it need ongoing work?', a: 'Most individual leaks are one-time fixes — install the pixel, write the sequence, restructure the CTA. The Active Case engagement exists when a business has many leaks that need coordinated execution.' },
      { q: 'How are leak dollar impacts calculated?', a: 'Each leak category has a defined estimation method documented in the Methodology page. Lead-loss leaks use the business\'s own conversion rate and average deal size. Tracking leaks use ad spend and attribution gap percentage. The math is visible — not a black box.' },
    ],
    body: (
      <>
        <h2>The seven categories of Revenue Leaks</h2>
        <ol>
          <li><strong>Lead Capture leaks</strong> — visitors arrive, intent exists, but the conversion path drops them. Missing CTAs above the fold, broken forms, friction-heavy sign-ups.</li>
          <li><strong>Tracking leaks</strong> — events fire but no pixel records them. Ad platforms optimize on incomplete data. Spend gets wasted because the algorithm can't see the wins.</li>
          <li><strong>Trust leaks</strong> — the page promises something the page can't prove. No credentials. No proof. No specifics. Bounce rate spikes at the headline.</li>
          <li><strong>Follow-Up leaks</strong> — the lead comes in, the response goes out hours or days later, and the deal is already cold. Industry benchmark: contacting a lead within 5 minutes increases the odds of qualifying it by ~9×.</li>
          <li><strong>Performance leaks</strong> — page weight, render-blocking scripts, layout shift. Every second of LCP delay correlates to a measurable conversion drop.</li>
          <li><strong>Messaging leaks</strong> — the homepage says one thing, the about page says another, the sales script says a third. The prospect leaves confused.</li>
          <li><strong>Systems leaks</strong> — the CRM holds half the truth, the spreadsheet holds the other half, and the operator does the reconciliation manually. Shadow infrastructure is a leak.</li>
        </ol>

        <h2>What evidence does Aetheris produce for each leak?</h2>
        <p>Every leak in the Leak Register includes: a name, the surface where it was detected, the literal evidence (screenshot, network trace, CRM record), a severity (1–5), an estimated dollar impact with the calculation visible, and a specific fix mapped to a tool or engagement.</p>

        <h2>How does severity work?</h2>
        <p>Severity is calculated from impact × frequency × confidence. A leak that costs $10k/month and happens to every visitor with high evidence confidence is Severity 5. A leak that costs $200/month with intermittent occurrence is Severity 1.</p>

        <h2>What does fixing a leak look like?</h2>
        <p>For most leaks, the fix is a single named action — install a pixel, rewrite an above-the-fold section, deploy a 14-day follow-up sequence. For coordinated leaks (e.g., five separate follow-up gaps across a sales process), the fix lives inside an Active Case where the operator executes them in sequence and the Leak Register tracks recovered revenue.</p>
      </>
    ),
  },

  {
    path: '/revenue-score',
    title: 'How do I get a Revenue Score for my business?',
    metaTitle: 'Revenue Score: free 0–100 forensic score for any business | Aetheris',
    description: 'The Revenue Score is a 0–100 forensic grade only Aetheris issues. Get yours in 30 seconds from a live scan of your business. Free. Shareable. Public.',
    quickAnswer: 'Run the Website Gap Scanner at aetheris.technology/scan. The Live DOM Scanner reads your business in 30 seconds and returns a Revenue Score from 0 to 100. The score is free, shareable, and the only public forensic standard issued by Aetheris. Below 70 means meaningful revenue is being lost.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
      { label: 'Revenue Score distribution: what is normal?', href: '/revenue-score-distribution' },
      { label: 'What does a revenue audit cost?', href: '/revenue-audit-cost' },
    ],
    faqs: [
      { q: 'Is the Revenue Score free?', a: 'Yes. The first scan and score are free. The detailed Leak Register and fix path are gated behind a quick form.' },
      { q: 'How accurate is a 30-second scan?', a: 'The free scan captures the leaks visible in the rendered DOM — typically 60–70% of what a full forensic scan finds. The operator-led Forensic Diagnostic catches the remainder, including CRM, follow-up, and systems leaks.' },
      { q: 'Can I share my Revenue Score?', a: 'Yes — that is the point. The Revenue Score is designed as a public, citable standard. Use it on LinkedIn, in proposals, in board decks.' },
      { q: 'What is a good Revenue Score?', a: '85+ is operationally strong. 70–84 is workable with one or two named leaks. Below 70 means meaningful revenue is leaking and a Forensic Diagnostic is warranted.' },
      { q: 'Can I run the scan on a competitor?', a: 'Yes. The Competitor Teardown points the same scanner at any URL and returns a Revenue Score plus the named leaks. It is one of the structural moats of the platform.' },
    ],
    body: (
      <>
        <h2>How the Revenue Score is calculated</h2>
        <p>The score is a weighted composite of six forensic surfaces:</p>
        <ul>
          <li>Conversion architecture (CTAs, forms, paths) — 25%</li>
          <li>Tracking and attribution integrity — 20%</li>
          <li>Trust signals and proof density — 15%</li>
          <li>Page performance and rendering — 15%</li>
          <li>Messaging consistency and vocabulary friction — 15%</li>
          <li>Follow-up posture and reachable channels — 10%</li>
        </ul>
        <p>Each surface is scored 0–100 by the live scanner; the composite is the public Revenue Score.</p>

        <h2>What the score reveals</h2>
        <p>A Revenue Score of 62 with a critical Trust leak and two Lead Capture leaks tells you exactly where the money is going. The score is not a vanity number — every point lost is mapped to a finding.</p>

        <h2>Why issue a public 0–100 standard?</h2>
        <p>Because the category does not have one yet. SEO has Domain Authority. Credit has FICO. Website performance has Lighthouse. Revenue Forensics has the Revenue Score. The scoreboard is the wedge that turns a one-time scan into a tracked, shareable, comparable measurement.</p>
      </>
    ),
  },

  {
    path: '/framework',
    title: 'What is the Revenue Forensics Framework?',
    metaTitle: 'The Revenue Forensics Framework — Aetheris methodology',
    description: 'The Revenue Forensics Framework is the seven-step operator methodology Aetheris uses on every engagement: scan, score, name, evidence, dollarize, fix, track.',
    quickAnswer: 'The Revenue Forensics Framework is a seven-step methodology: Scan the business, issue a Revenue Score, name each leak, prove it with evidence, attach a dollar impact, deploy the specific fix, and track recovery on the Leak Register. Every Aetheris engagement follows this framework verbatim.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'What is Revenue Forensics?', href: '/revenue-forensics' },
      { label: 'Methodology — full operator detail', href: '/methodology' },
      { label: 'How do I find where my business is losing money?', href: '/how-to-find-revenue-leaks' },
    ],
    faqs: [
      { q: 'Why a framework instead of just an audit?', a: 'An audit is a deliverable. A framework is a repeatable system. The framework runs the same way for a $5M manufacturer as for a $25M services firm — that is what makes Revenue Forensics a category, not a project.' },
      { q: 'How long does the full framework take?', a: 'Step 1 (Scan) and Step 2 (Score) take 30 seconds. Steps 3–5 (Name, Evidence, Dollarize) are the 21-Day Revenue Diagnostic. Steps 6–7 (Fix, Track) live inside an Active Case.' },
      { q: 'Do you publish the framework openly?', a: 'Yes. The full methodology is at /methodology. The category vocabulary is at /glossary. The intent is that anyone — including buyers comparing options — can read exactly how Aetheris works.' },
      { q: 'What makes the framework hard to copy?', a: 'The Live DOM Scanner. Anyone can write a methodology document. Only Aetheris has the proprietary scanner that produces evidence at the speed and depth the framework requires.' },
      { q: 'Can a business apply the framework without hiring Aetheris?', a: 'The free scan and the seven-step Leak Audit at /leak-audit let any owner walk the framework manually. Most cannot execute the fixes themselves — that is where the operator-led engagements come in.' },
    ],
    body: (
      <>
        <h2>The seven steps</h2>
        <ol>
          <li><strong>Scan</strong> — Live DOM read of every customer-facing surface.</li>
          <li><strong>Score</strong> — 0–100 Revenue Score issued and recorded.</li>
          <li><strong>Name</strong> — every leak gets a category, a label, and a severity.</li>
          <li><strong>Evidence</strong> — screenshot, network trace, CRM record, or transcript proves the finding.</li>
          <li><strong>Dollarize</strong> — each leak gets an estimated dollar impact with the math visible.</li>
          <li><strong>Fix</strong> — one-time tool or operator-led engagement deploys the specific remedy.</li>
          <li><strong>Track</strong> — the Leak Register records what was fixed, when, and how much revenue was recovered.</li>
        </ol>
      </>
    ),
  },

  {
    path: '/vs-agencies',
    title: 'Revenue Forensics vs. Marketing Agencies — which is better?',
    metaTitle: 'Revenue Forensics vs. Marketing Agencies | honest comparison',
    description: 'Honest side-by-side: when to hire a marketing agency vs. when to engage a Revenue Forensics operator. Scope, pricing, deliverables, timeframe.',
    quickAnswer: 'A marketing agency makes things — campaigns, creative, channels. A Revenue Forensics operator finds where existing activity is leaking and fixes the leaks. If you need awareness, hire an agency. If you have activity that is not converting at expected rates, hire the operator.',
    lastUpdated: UPDATED,
    tier: 'comparison',
    relatedLinks: [
      { label: 'What is Revenue Forensics?', href: '/revenue-forensics' },
      { label: 'What does a revenue audit cost?', href: '/revenue-audit-cost' },
      { label: 'One-time business audit vs. monthly engagement?', href: '/one-time-vs-monthly' },
    ],
    faqs: [
      { q: 'Are marketing agencies bad?', a: 'No. They are a different category. A good agency is the right hire when the business needs new awareness, new creative, or new channels. Agencies and Revenue Forensics solve different problems.' },
      { q: 'Can I have both?', a: 'Yes — and most $5M–$25M businesses should. The agency runs the channels; the Revenue Forensics operator ensures the channels are not leaking the leads they generate.' },
      { q: 'Is Aetheris cheaper than an agency?', a: 'A typical marketing agency retainer in this segment runs $5,000–$15,000/month indefinitely. The flagship 21-Day Revenue Diagnostic is $18,500 one time. Active Case is $15,000/month with a defined three-month minimum, not an indefinite contract.' },
      { q: 'Why does Aetheris not call itself an agency?', a: 'Because the category is different. An agency is in the business of producing creative and managing channels. Aetheris is in the business of finding and fixing operational leaks. The word "agency" misframes the engagement.' },
      { q: 'What if my agency is the leak?', a: 'It happens. The forensic scan reveals when ad spend is leaking because of attribution gaps the agency missed, or when content is leaking because of conversion architecture the agency does not own. The scan is neutral — it reads the surfaces, not the agency relationship.' },
    ],
    body: (
      <>
        <h2>Honest side-by-side</h2>
        <table>
          <thead><tr><th>Dimension</th><th>Marketing Agency</th><th>Revenue Forensics</th></tr></thead>
          <tbody>
            <tr><td>Scope</td><td>Channel + creative production</td><td>Operational + conversion forensics</td></tr>
            <tr><td>Pricing model</td><td>Typically $5–15K/mo indefinite</td><td>$18.5K flat Diagnostic + optional 3-mo Active Case</td></tr>
            <tr><td>Deliverable</td><td>Campaigns, content, channel reports</td><td>Revenue Score + Leak Register + fixes</td></tr>
            <tr><td>Timeframe</td><td>Ongoing</td><td>Defined start and close</td></tr>
            <tr><td>Best when</td><td>Need awareness or new creative</td><td>Activity exists but is leaking</td></tr>
          </tbody>
        </table>

        <h2>When to choose a marketing agency</h2>
        <p>You need a brand, a campaign, a new website, or a content engine. You have no in-house team. You want ongoing creative output. An agency is the right hire.</p>

        <h2>When to choose Revenue Forensics</h2>
        <p>You are getting traffic, generating leads, or running campaigns — but the numbers do not match the activity. You suspect money is leaking and you want it named with evidence and dollars. That is the operator's job.</p>

        <h2>The core difference, one sentence</h2>
        <p>Agencies make new things. Revenue Forensics fixes what existing things are losing.</p>
      </>
    ),
  },

  {
    path: '/how-to-find-revenue-leaks',
    title: 'How do I find where my business is losing money?',
    metaTitle: 'How to find where your business is losing money | step-by-step',
    description: 'A practitioner walkthrough of how to find the specific places your business is losing money — the same seven steps Aetheris runs on every engagement.',
    quickAnswer: 'Walk every customer-facing surface in order: traffic source, landing surface, conversion path, follow-up, sales process, fulfillment, retention. At each surface, ask one question — "what fraction of the value entering this stage exits it?" The places where the fraction drops are your leaks. Then dollarize each one.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
      { label: 'The Revenue Forensics Framework', href: '/framework' },
      { label: 'Why am I getting leads but not closing them?', href: '/why-am-i-not-closing-leads' },
    ],
    faqs: [
      { q: 'Can I do this myself or do I need an operator?', a: 'You can walk the seven-surface scan yourself using the free Leak Audit at /leak-audit. Most owners find 30–40% of their leaks unaided. The operator-led Forensic Diagnostic catches the rest because it has the scanner data and the pattern library across hundreds of scans.' },
      { q: 'What is the single most common leak in $5M–$25M businesses?', a: 'Slow follow-up. Across our scans, the median first-touch lag from form submission to first human reply is over 18 hours. Industry data is unambiguous that this destroys conversion.' },
      { q: 'How long does the scan take?', a: 'The free scan is 30 seconds. The full operator-led Forensic Diagnostic is 21 days and ends with a written Case File and 60-minute readout.' },
      { q: 'What tools do I need to run this myself?', a: 'A browser, your CRM access, your ad platform access, and a willingness to look at the actual numbers instead of the dashboard summary.' },
      { q: 'What if I find a leak I cannot fix?', a: 'Most leaks have a $39–$300 one-time fix in the tool marketplace. The leaks that require coordination across multiple surfaces are the reason the Active Case engagement exists.' },
    ],
    body: (
      <>
        <h2>The seven-surface walk</h2>
        <ol>
          <li><strong>Traffic source</strong> — is the spend hitting the page it should? Are the pixels firing?</li>
          <li><strong>Landing surface</strong> — does the headline match the ad? Is there a CTA above the fold?</li>
          <li><strong>Conversion path</strong> — how many fields on the form? Where is the friction?</li>
          <li><strong>Follow-up</strong> — what is the literal lag from submission to first human contact?</li>
          <li><strong>Sales process</strong> — where do deals stall? What stage has the longest median age?</li>
          <li><strong>Fulfillment</strong> — does delivery match the sales promise?</li>
          <li><strong>Retention</strong> — what is the churn signal you are ignoring?</li>
        </ol>
        <p>At each surface, ask one forensic question: <em>what fraction of value entering this stage exits it?</em> Anywhere the fraction drops sharply is a leak. Name it. Evidence it. Dollarize it.</p>

        <h2>The fastest path</h2>
        <p>Run the free <Link to="/scan">Website Gap Scanner</Link> first — it surfaces the public-facing leaks in 30 seconds. Then walk surfaces 4–7 manually using the prompts in the <Link to="/leak-audit">free Leak Audit</Link>.</p>
      </>
    ),
  },

  {
    path: '/revenue-audit-cost',
    title: 'What does a revenue audit cost?',
    metaTitle: 'What does a revenue audit cost? Honest pricing | Aetheris',
    description: 'Free entry, $2,500 operator-led starting fee, $18,500 flat for the full 21-Day Revenue Diagnostic. No percentage-of-savings billing. No hidden retainer.',
    quickAnswer: 'The free Website Gap Scanner produces a Revenue Score and surface-level leaks at no cost. The operator-led Forensic Diagnostic starts at $2,500 flat and is applied toward the full engagement. The flagship 21-Day Revenue Diagnostic is $18,500 flat. Active Case is $15,000/month with a three-month minimum and is reserved for Diagnostic clients.',
    lastUpdated: UPDATED,
    tier: 'pillar',
    relatedLinks: [
      { label: 'How much does a business diagnostic cost?', href: '/business-diagnostic-cost' },
      { label: 'One-time business audit vs. monthly engagement?', href: '/one-time-vs-monthly' },
      { label: 'Revenue Forensics vs. Marketing Agencies', href: '/vs-agencies' },
    ],
    faqs: [
      { q: 'Is the $18,500 a deposit or the total?', a: 'It is the total flat fee for the 21-Day Revenue Diagnostic. No percentage of savings. No hidden add-ons. If the engagement extends into an Active Case, the Diagnostic fee credits 1:1.' },
      { q: 'Is there a money-back guarantee?', a: 'The Diagnostic is fixed-fee work product. The Leak Register and Case File are delivered regardless. If the engagement does not produce at least one named leak worth more than the fee, the operator refunds the difference.' },
      { q: 'What is included in the $18,500?', a: 'The full seven-step framework: live scan, Revenue Score, complete Leak Register with evidence and dollarization, prioritized fix path, written Case File, 60-minute readout call.' },
      { q: 'How does Aetheris pricing compare to a marketing agency?', a: 'A typical agency retainer in this segment runs $60–180K per year indefinitely. The Diagnostic is $18,500 one time. The Active Case option exists only when the operator-led execution is warranted by the diagnostic findings.' },
      { q: 'Why a flat fee instead of percentage-of-savings?', a: 'Percentage-of-savings creates conflicting incentives — the operator over-counts savings to inflate the invoice. Flat fee aligns the operator with the buyer: do the work, deliver the evidence, charge a known number.' },
    ],
    body: (
      <>
        <h2>The price table</h2>
        <ul>
          <li><strong>Revenue Score scan</strong> — free, 30 seconds.</li>
          <li><strong>Forensic Diagnostic (entry)</strong> — $2,500 flat, applied toward a full engagement.</li>
          <li><strong>21-Day Revenue Diagnostic (flagship)</strong> — $18,500 flat.</li>
          <li><strong>Active Case</strong> — $15,000/month, three-month minimum, Diagnostic clients only.</li>
          <li><strong>Tool marketplace</strong> — one-time fixes from $39.</li>
        </ul>

        <h2>What you actually pay for</h2>
        <p>Evidence. Specific named leaks with dollar impact. A fix path you can execute or hire out. Not opinions. Not slides. Not a quarterly retainer that becomes invisible.</p>
      </>
    ),
  },
];

/** ──────────────── TIER 2 QUESTION ARTICLES ──────────────── */
export const QUESTION_ARTICLES: AuthorityArticle[] = [
  {
    path: '/why-am-i-not-closing-leads',
    title: 'Why am I getting leads but not closing them?',
    description: 'Three forensic causes of leads that never close: response-time leaks, qualification leaks, follow-up gaps. Plus how to find which one is hurting you.',
    quickAnswer: 'You are almost certainly losing them in one of three places: the first-touch response time is too long, the qualification step is missing or wrong, or the follow-up sequence stops after two touches. Forensic scans on $5M–$25M businesses find the first cause in ~62% of cases.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'How long should it take to follow up with a lead?', href: '/lead-followup-timing' },
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
    ],
    faqs: [
      { q: 'How fast should the first response be?', a: 'Under 5 minutes. Contacting a web lead within 5 minutes vs. 30 minutes increases the odds of qualifying the lead by approximately 9×.' },
      { q: 'How many follow-up touches is enough?', a: 'Across our scans, businesses that average 7+ touches over 14 days convert inbound leads at roughly 2–3× the rate of businesses that stop at 3 touches.' },
      { q: 'What if the leads are bad?', a: 'Run a forensic scan first. In our experience the lead quality is rarely the real leak — the lead handling is. "Bad leads" is often the diagnosis when the real finding is unmeasured follow-up.' },
    ],
    body: (
      <>
        <h2>The three forensic causes</h2>
        <h3>1. Response-time leak</h3>
        <p>The lead submits a form. The notification goes to a shared inbox. Someone replies the next business day. The lead has already talked to two competitors. Industry data: response within 5 minutes increases qualification odds by ~9×. Check your literal median first-touch lag, not the dashboard estimate.</p>
        <h3>2. Qualification leak</h3>
        <p>No defined qualification criteria. Every lead gets the same treatment. The good ones go cold while the operator works the loud ones. Fix: define 3–5 binary qualifiers before any handoff.</p>
        <h3>3. Follow-up gap</h3>
        <p>The sequence stops after two emails. The deal sits in "no response" forever. Deploy a 14-day cadence with named exits.</p>

        <h2>How to find which one is yours</h2>
        <p>Run the <Link to="/follow-up-plan">Follow-Up Plan Generator</Link>, then pull your last 50 inbound leads and time-stamp every touch. The pattern reveals itself in one afternoon.</p>
      </>
    ),
  },

  {
    path: '/lead-followup-timing',
    title: 'How long should it take to follow up with a lead?',
    description: 'Under 5 minutes for inbound web leads. Here is the data behind the rule and the operator playbook for hitting it without staffing 24/7.',
    quickAnswer: 'Under 5 minutes for inbound web leads. Contacting a lead within 5 minutes vs. 30 minutes increases the odds of qualifying it by approximately 9×. Past 1 hour, conversion drops sharply. Past 24 hours, the lead is statistically cold.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'Why am I getting leads but not closing them?', href: '/why-am-i-not-closing-leads' },
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
    ],
    faqs: [
      { q: 'What about after-hours leads?', a: 'Automated acknowledgment within 5 minutes ("we got it, we will call you at 8am") is acceptable. Silence is not. Build the auto-reply with a calendar link.' },
      { q: 'Should the first touch be a call or an email?', a: 'A call wins when it lands. An email arrives. The forensic answer: both, in parallel, within 5 minutes.' },
      { q: 'What if my team cannot hit 5 minutes?', a: 'Use a 24/7 answering service for the acknowledgment layer and human callback within 1 hour. The acknowledgment itself preserves the conversion odds.' },
    ],
    body: (
      <>
        <h2>The data</h2>
        <p>The Lead Response Management Study (originally by InsideSales / Velocify, repeatedly replicated) found that the odds of qualifying a web lead drop by ~80% between 5 minutes and 30 minutes after submission. Our scans across $5M–$25M businesses find a median first-touch lag of <strong>18+ hours</strong>. The gap is the leak.</p>

        <h2>The operator playbook</h2>
        <ol>
          <li>Instrument the literal lag — not the dashboard estimate, the timestamped data.</li>
          <li>Automate the acknowledgment within 5 minutes with a calendar booking link.</li>
          <li>Route human callbacks within 1 hour during business hours.</li>
          <li>Run a 14-day sequence (see the <Link to="/follow-up-plan">Follow-Up Plan Generator</Link>) so the second, third, and seventh touches happen without operator memory.</li>
        </ol>
      </>
    ),
  },

  {
    path: '/b2b-conversion-benchmark',
    title: 'What is a good website conversion rate for B2B?',
    description: '2–5% for B2B services in the $5M–$25M segment is healthy. Below 1.5% suggests a Lead Capture or Trust leak. Here is how to read the number forensically.',
    quickAnswer: 'For B2B services in the $5M–$25M segment, 2–5% visitor-to-lead is healthy. 1.5–2% is workable. Below 1.5% indicates a Lead Capture or Trust leak. Above 5% usually means the traffic is over-qualified — which is its own kind of leak.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'What should be above the fold on my website?', href: '/above-the-fold' },
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
    ],
    faqs: [
      { q: 'What counts as a "conversion" in this number?', a: 'A measurable lead event: form submission, calendar booking, qualified chat, or phone call attributed to the page.' },
      { q: 'Is over 5% always good?', a: 'Not necessarily. If your conversion is 9% but volume is tiny, you are likely under-investing in awareness — leaving demand uncaptured.' },
      { q: 'How do I find my real conversion rate?', a: 'Check Google Analytics 4 events, your CRM lead source attribution, and your ad platform conversion tracking. If they disagree by more than 15%, you have a Tracking leak.' },
    ],
    body: (
      <>
        <h2>What the number actually means</h2>
        <p>Conversion rate is the ratio of measurable lead events to qualified sessions. It is the most-cited and most-mismeasured forensic metric in the segment.</p>
        <h2>How to read it forensically</h2>
        <p>If your rate is below 1.5%, scan the page first — missing CTA above the fold, no trust signals, friction-heavy form. If the page passes the scan and the rate is still low, the leak is in traffic quality, not the page.</p>
      </>
    ),
  },

  {
    path: '/tracking-pixels',
    title: 'What tracking pixels does my site need?',
    description: 'Minimum stack: GA4, Meta Pixel, LinkedIn Insight Tag, your ad platform conversion API. Plus a server-side fallback. Anything less is a Tracking leak.',
    quickAnswer: 'At minimum: Google Analytics 4, Meta Pixel (even if you do not run Meta ads today), LinkedIn Insight Tag, and your active ad platform conversion API. Plus a server-side fallback for the events that matter. Anything missing is a Tracking leak that costs you in optimization quality.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
      { label: 'How do I know if my CRM data is bad?', href: '/bad-crm-data' },
    ],
    faqs: [
      { q: 'Why do I need pixels for platforms I do not advertise on?', a: 'Because audience-building runs in the background. Six months from now when you do run Meta ads, the pixel will already have a usable audience instead of starting cold.' },
      { q: 'What is a server-side conversion API?', a: 'A backend-fired event that does not depend on the browser pixel firing. It survives ad blockers, cookie banners, and iOS privacy restrictions. Essential for high-value conversions.' },
      { q: 'How do I check if my pixels are actually firing?', a: 'Run the free Website Gap Scanner — it reads the rendered DOM and reports which pixels load, which fire, and which silently fail.' },
    ],
    body: (
      <>
        <h2>The minimum forensic stack</h2>
        <ul>
          <li>GA4 with enhanced measurement on</li>
          <li>Meta Pixel + Conversions API</li>
          <li>LinkedIn Insight Tag</li>
          <li>Google Ads conversion tracking with enhanced conversions</li>
          <li>One server-side fallback for primary conversion events</li>
        </ul>
      </>
    ),
  },

  {
    path: '/bad-crm-data',
    title: 'How do I know if my CRM data is bad?',
    description: 'Five forensic signals that your CRM is leaking: duplicate contacts, stage drift, owner overload, dead leads, and pipeline value that does not match closed revenue.',
    quickAnswer: 'Five signals: (1) more than 5% duplicate contacts, (2) stages defined by exit criteria you cannot explain in one sentence, (3) one owner holding more than 3× the average deal count, (4) leads sitting untouched longer than 60 days, (5) pipeline value that does not reconcile to closed-won revenue. Any two of these is a CRM Hygiene leak.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'What tracking pixels does my site need?', href: '/tracking-pixels' },
      { label: 'What is Revenue Forensics?', href: '/revenue-forensics' },
    ],
    faqs: [
      { q: 'How do I check for duplicates fast?', a: 'Export contacts to CSV, dedupe on lowercase email, and compare counts. If the dedup\'d count is more than 5% smaller, you have a duplicate problem.' },
      { q: 'What is "stage drift"?', a: 'Stages that mean different things to different reps. If "qualified" requires a budget conversation for one rep and just an email reply for another, your pipeline math is fictional.' },
      { q: 'How does Aetheris fix CRM leaks?', a: 'The Active Case engagement includes CRM remediation as a standard work track — dedupe, stage redefinition, owner rebalance, dead-lead reactivation.' },
    ],
    body: <p>The CRM is the second-most-common surface where revenue leaks hide. The first is the follow-up sequence. Both are invisible until somebody runs a forensic read.</p>,
  },

  {
    path: '/most-common-revenue-leaks',
    title: 'What is the most common reason businesses lose leads?',
    description: 'Across the businesses Aetheris has scanned, slow first-touch follow-up is the most common revenue leak. Here is what we find and how often.',
    quickAnswer: 'Slow first-touch follow-up. Across the businesses we have scanned, the median lag from web form submission to first human reply is over 18 hours. The 5-minute threshold matters because qualification odds drop ~80% between 5 and 30 minutes. This is the single most common Revenue Leak in the $5M–$25M segment.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'How long should it take to follow up with a lead?', href: '/lead-followup-timing' },
      { label: 'Why am I getting leads but not closing them?', href: '/why-am-i-not-closing-leads' },
    ],
    faqs: [
      { q: 'Is this true even for high-ticket B2B?', a: 'Especially for high-ticket B2B. The buyer is comparing 3–5 vendors. Whoever responds first frames the conversation.' },
      { q: 'Does an auto-reply count as a response?', a: 'Partially. A useful auto-reply with a calendar link preserves perhaps 60–70% of the speed advantage. Silence loses all of it.' },
      { q: 'What other leaks are common?', a: 'Missing CTA above the fold, broken Meta Pixel, no LinkedIn Insight Tag, and pipeline stages that mean different things to different reps.' },
    ],
    body: <p>Find your literal median first-touch lag. If it is above 1 hour, you are losing money you do not need to lose.</p>,
  },

  {
    path: '/revenue-leak-calculator',
    title: 'How much revenue is my business leaving on the table?',
    description: 'A forensic estimation method any operator can run in 10 minutes. Three inputs, three multipliers, one dollar figure.',
    quickAnswer: 'Take your monthly inbound lead count, multiply by your average deal value, multiply by (your current close rate minus 0.30). For most $5M–$25M businesses with unattended follow-up gaps, the result is between $25,000 and $250,000 per month. Run the Revenue Score scan for a precise figure.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'How do I get a Revenue Score for my business?', href: '/revenue-score' },
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
    ],
    faqs: [
      { q: 'Where does the 0.30 come from?', a: 'It is the close rate a well-run inbound sales process consistently achieves on qualified web leads in this segment. Yours may be higher or lower — use the delta as the leak indicator.' },
      { q: 'Is this estimate conservative?', a: 'Yes. It only counts the inbound lead leak. It excludes wasted ad spend from tracking gaps, churn from broken onboarding, and demand suppression from messaging contradictions.' },
      { q: 'How do I get a precise figure?', a: 'Run the free Website Gap Scanner. The Revenue Score and Leak Register produce a per-leak dollar estimate with the calculation visible.' },
    ],
    body: <p>The point of the back-of-envelope number is to decide whether a forensic scan is worth running. If the back-of-envelope says more than $10,000/month is leaking, it is.</p>,
  },

  {
    path: '/marketing-audit-vs-revenue-audit',
    title: 'What is the difference between a marketing audit and a revenue audit?',
    description: 'A marketing audit reviews channels and creative. A revenue audit reads every surface a customer touches and produces named leaks with dollar impact. Different scope, different deliverable.',
    quickAnswer: 'A marketing audit reviews your channels (ads, social, content, SEO) and produces channel-level recommendations. A revenue audit — Revenue Forensics — reads every surface a customer touches (website, sales process, CRM, follow-up, systems, messaging) and produces named leaks with evidence and dollar impact. Different scope, different deliverable, different price.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'Revenue Forensics vs. Marketing Agencies', href: '/vs-agencies' },
      { label: 'What does a revenue audit cost?', href: '/revenue-audit-cost' },
    ],
    faqs: [
      { q: 'Which one should I run first?', a: 'The revenue audit. It surfaces whether the problem is operational (most common) before you spend on channel changes that will not fix it.' },
      { q: 'Can a marketing audit find a CRM leak?', a: 'No. Marketing audits do not look inside the CRM. That is the structural reason Revenue Forensics exists.' },
      { q: 'What if both audits surface the same finding?', a: 'They will, occasionally. The difference is the revenue audit dollarizes the finding and maps it to a specific fix.' },
    ],
    body: null,
  },

  {
    path: '/competitor-analysis',
    title: 'How do I run a competitor analysis?',
    description: 'Forensic competitor analysis: point the same Live DOM Scanner at a rival and read their leaks. Five-minute method, real evidence, named findings.',
    quickAnswer: 'Run the Live DOM Scanner against the competitor URL. The Competitor Teardown returns their Revenue Score and named leaks the same way it scans your business. The teardown is structural — it reads the rendered surfaces a buyer would see. Use the findings to identify where you can win operationally, not on creative.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'How do I get a Revenue Score for my business?', href: '/revenue-score' },
      { label: 'What is Revenue Forensics?', href: '/revenue-forensics' },
    ],
    faqs: [
      { q: 'Is competitor scanning ethical?', a: 'Yes — the scanner only reads what any visitor sees in their browser. No private data, no logged-in surfaces, no bypassing access controls.' },
      { q: 'What is the most actionable finding from a competitor scan?', a: 'Tracking gaps. If the competitor is leaking attribution data, their ad platform optimization is degraded and you can outbid them on quality, not budget.' },
      { q: 'Can the competitor see I scanned them?', a: 'No more than they see any other browser visit to their public site.' },
    ],
    body: <p>The Competitor Teardown is one of the five structural moats of Aetheris. It exists because operators ship with the scanner already in hand.</p>,
  },

  {
    path: '/above-the-fold',
    title: 'What should be above the fold on my website?',
    description: 'Five elements above the fold: specific headline, sub-promise, primary CTA, trust signal, single visual. Forensic order, forensic spacing.',
    quickAnswer: 'Five elements: (1) a headline that names who you serve and the outcome, (2) a one-line sub-promise with a number, (3) a primary CTA visible without scrolling, (4) a trust signal (named credential, named client, named result), (5) one visual. Anything else above the fold is a Lead Capture leak.',
    lastUpdated: UPDATED,
    tier: 'question',
    relatedLinks: [
      { label: 'What is a good website conversion rate for B2B?', href: '/b2b-conversion-benchmark' },
      { label: 'What is a Revenue Leak?', href: '/revenue-leak' },
    ],
    faqs: [
      { q: 'What about navigation?', a: 'Navigation is fine above the fold. What is not fine: hero carousels, multiple competing CTAs, or lifestyle imagery that does not prove the promise.' },
      { q: 'How long should the headline be?', a: 'Under 12 words. Specific enough that a stranger knows whether they are in the right place in under 3 seconds.' },
      { q: 'Where does the trust signal go?', a: 'Adjacent to the CTA, not buried at the bottom. A named credential next to a "Start now" button doubles the conversion lift of the button.' },
    ],
    body: <p>Above-the-fold is the most-tested surface in conversion. The forensic answer is mature: five elements, no carousel, no hero video the visitor did not ask for.</p>,
  },
];

export const ALL_AUTHORITY_ARTICLES: AuthorityArticle[] = [
  ...PILLAR_ARTICLES,
  ...QUESTION_ARTICLES,
];
