// try-tool-sandbox — Public runner for the Chaos Ecosystem tools.
// Runs a real, full-depth pass of any catalog tool using ONLY the caller's
// input. No database reads/writes. No client data, no rep codes, no portal
// state, no secrets echoed back. Output is comprehensive — same engine we
// use internally, just without the persistent memory + client context.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Per-IP rate limit — 20 real runs / hour. Prevents pure-abuse loops but
// lets a serious prospect exercise the whole ecosystem in one sitting.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 20;
const rateHits: Map<string, number[]> = new Map();
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rateHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) { rateHits.set(ip, arr); return true; }
  arr.push(now); rateHits.set(ip, arr);
  return false;
}

// Shared voice — every tool answers like an Aetheris operator: blunt,
// forensic, dollar-quantified, non-corporate. FULL POWER — the sandbox
// runs the same engine our paid operators run. Nothing is throttled.
const VOICE = `
You are an Aetheris Business Forensics Operator producing a client-grade deliverable.
Voice: blunt, forensic, non-corporate, dollar-quantified. Never "as an AI". Never hedge.

OUTPUT DISCIPLINE — this is full-power operator output:
- NO artificial word limit. Produce the comprehensive, deep, operator-grade report a paying client would receive. Aim for 1,500–3,500 words when the subject supports it.
- Follow the EXACT H2 section structure the user template specifies. You may add depth WITHIN each section (sub-bullets, tables, callouts) but do not add or rename top-level H2s.
- Under each H2, use rich content: dense bullets, markdown tables (5–10 rows where useful), short evidence paragraphs (3–5 lines), numbered playbooks. Mix formats — never just one wall of bullets.
- Every claim quantifies where plausible: dollars ($), percentages (%), hours, days, conversion deltas. Use "~" for estimates. Show your math when a number would otherwise feel arbitrary ("~$14k/mo = 40 leads × 8% × $4,400 ACV").
- Tables must have real, differentiated content per row — no filler rows, no repeated verbs.
- Give concrete, named tactics: exact copy rewrites, exact subject lines, exact URLs to check, exact tool names, exact scripts. No abstractions.
- Cite the company context you were given directly ("Their homepage headline reads 'X' — that's the leak because…").
- End with a **Do This Monday Morning** numbered action list (5–8 items) — the sharpest, most specific moves ranked by expected dollar impact. This is REQUIRED on every report.
- NEVER invent client names, rep codes, or internal Aetheris system details. Work only from user input + scraped context.
- NEVER include a "Conclusion", "Summary", "Disclaimer", or "About" section unless the template asks.
`.trim();

// Every prompt is engineered to output a PDF-style report: tight sections,
// bullets/tables, under ~400 words. No walls of prose.
const PROMPTS: Record<string, { system: string; userWrap: (input: string) => string; title: string; inputLabel: string; inputHint: string; }> = {
  "website-scanner": {
    title: "Website Leak Scanner",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nYou are a forensic web auditor. Output like a one-page PDF audit.`,
    userWrap: (i) => `Target: ${i}\n\nOutput EXACTLY these sections\n\n## Snapshot\n(3 bullets, max 12 words each — diagnosis, biggest risk, biggest opportunity)\n\n## Top 5 Revenue Leaks\nMarkdown table: # · Leak · Est. $ Impact · One-line Fix\n\n## Positioning & Offer\n(4 bullets)\n\n## Funnel & Trust\n(4 bullets)\n\n## 30-Day Fix Priority\n(numbered list, 5 items — action + expected lift)`,
  },
  "brand-contradictions": {
    title: "Brand Contradictions",
    inputLabel: "Brand or URL", inputHint: "brand.com or a tagline",
    system: `${VOICE}\n\nYou surface the gap between what a brand claims and what it does.`,
    userWrap: (i) => `Subject: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Diagnosis\n(3 bullets)\n\n## 5 Contradictions\nTable: # · Claim · Likely Reality · Buyer Signal · Cost Band\n\n## Fix First\n(1 bullet: the exact copy/asset change, and why)`,
  },
  "friction-audit": {
    title: "Friction Audit",
    inputLabel: "Funnel or URL", inputHint: "Describe the buyer path or drop a URL",
    system: `${VOICE}\n\nYou map friction and quantify the leak.`,
    userWrap: (i) => `Funnel: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Buyer Path\n(4-5 bullets — one per stage)\n\n## Friction Log\nTable: Stage · Friction · Est. Drop-off % · Fix\n\n## Compound Leak\n(1 bullet — cumulative % of ready-to-buy traffic lost)\n\n## 7-Day Repair\n(numbered, 5 moves — action + metric that proves it worked)`,
  },
  "strategic-questions": {
    title: "Strategic Questions",
    inputLabel: "Company / role", inputHint: "e.g. 'Series A SaaS CEO'",
    system: `${VOICE}\n\nYou generate hard boardroom questions leadership is avoiding.`,
    userWrap: (i) => `Subject: ${i}\n\nOutput EXACTLY 15 questions, 3 per section:\n\n## Revenue Truth\n## Customer Truth\n## Team Truth\n## Product Truth\n## Founder Truth\n\nEach question: one sentence, blunt, unanswerable with a slide.\n\n## Open the Next Meeting With\n(the 3 sharpest of the 15, listed again, no explanation)`,
  },
  "detective-mode": {
    title: "Detective Mode",
    inputLabel: "Business + URL", inputHint: "e.g. 'Acme Co · acme.com'",
    system: `${VOICE}\n\nCase-file detective. Evidence, motive, next moves. Never cute.`,
    userWrap: (i) => `Case subject: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Case Opener\n(3 bullets, noir, forensic — 12 words each)\n\n## Suspected Leaks\nTable: # · Suspect · Evidence · Motive · Cost Band\n(5 rows)\n\n## Chain of Evidence\n(3 bullets — how the leaks feed each other)\n\n## First 72 Hours\n(numbered, 5 moves)`,
  },
  "forensic-scan-all": {
    title: "Forensic Scan (All Layers)",
    inputLabel: "Website URL", inputHint: "https://example.com",
    system: `${VOICE}\n\nAll-layer forensic scan across positioning, offer, proof, funnel, SEO, ops.`,
    userWrap: (i) => `Target: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Executive Diagnosis\n(3 bullets)\n\n## Layer Reads\nTable: Layer · Grade (A-F) · Biggest Leak · Fix\nRows: Positioning, Offer, Proof, Funnel, SEO, Ops\n\n## Biggest Single Unlock\n(1 bullet — exact first move)\n\n## 30-Day Repair\n(4 bullets — one per week)`,
  },
  "all-in-one": {
    title: "All-In-One Content",
    inputLabel: "Topic", inputHint: "e.g. 'AI-powered onboarding'",
    system: `${VOICE}\n\nOne topic → a compact publishable content set. Under 450 words TOTAL.`,
    userWrap: (i) => `Topic: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Angle\n(1 sentence — the contrarian take)\n\n## LinkedIn Post\n(~90 words, operator voice)\n\n## Email\n(~90 words, forwardable, subject line on first line)\n\n## X Thread\n(5 posts, each ≤ 240 chars)\n\n## 3 Hook Variants\n(bullets)`,
  },
  "content-calendar": {
    title: "Content Calendar Builder",
    inputLabel: "Niche", inputHint: "e.g. 'B2B fintech'",
    system: `${VOICE}\n\n14-day content calendar. Compact, table-driven.`,
    userWrap: (i) => `Niche: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## 14-Day Calendar\nTable: Day · Format · Angle · Hook · CTA\n(14 rows, hooks ≤ 10 words)\n\n## Weekly Themes\n(2 bullets — Wk1, Wk2)\n\n## 2 Flagship Pieces\n(2 bullets — what and why)`,
  },
  "playbook-generator": {
    title: "Playbook Generator",
    inputLabel: "Function or goal", inputHint: "e.g. 'Outbound SDR playbook'",
    system: `${VOICE}\n\nOperator playbook a new hire can run day one.`,
    userWrap: (i) => `Playbook subject: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Purpose & Trigger\n(2 bullets)\n\n## Steps\nTable: # · Action · Owner · Time-box · Output\n(7 rows)\n\n## KPIs\nTable: KPI · Target · Kill-Switch\n(4 rows)\n\n## Top Failure Modes\n(3 bullets)`,
  },
  "social-content": {
    title: "Social Content Studio",
    inputLabel: "Topic", inputHint: "e.g. 'why 90% of audits are theater'",
    system: `${VOICE}\n\nPunchy operator-voice social. No fluff.`,
    userWrap: (i) => `Topic: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## 3 LinkedIn Posts\n(each ~80 words — distinct angles: contrarian, case-file, framework. Hook line on its own line, then body, then CTA line.)\n\n## 1 X Thread\n(5 posts, ≤ 240 chars each)\n\n## 5 Hooks\n(bullets, ≤ 12 words)`,
  },
  "content-engine": {
    title: "Content Engine",
    inputLabel: "Core idea", inputHint: "The one insight to expand",
    system: `${VOICE}\n\nOne insight → a compact content week.`,
    userWrap: (i) => `Core idea: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Article Outline\n(6 H3-style bullets — each ≤ 12 words)\n\n## Lead Section\n(~120 words — the opening the article commits to)\n\n## Spinoffs\nTable: Channel · Format · Hook\n(4 rows — LinkedIn, X, email, DM)\n\n## Repurposing Map\n(3 bullets — how 1 idea → 8 assets in 14 days)`,
  },
  "image-studio": {
    title: "Image Studio Brief",
    inputLabel: "Scene", inputHint: "e.g. 'operator at forensic desk'",
    system: `${VOICE}\n\nProduction-grade brief. Tight, unambiguous.`,
    userWrap: (i) => `Scene: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Concept\n(1 bullet)\n\n## Spec\nTable: Field · Direction\nRows: Subject, Composition, Palette (hex), Lighting, Lens, Wardrobe, Environment, Negative Prompt\n\n## Ready Prompt\n(one paragraph, no line breaks, generator-ready)`,
  },
  "creation-studio": {
    title: "Creation Studio",
    inputLabel: "Asset request", inputHint: "e.g. 'launch kit for Q4'",
    system: `${VOICE}\n\nMixed-media launch kit plan.`,
    userWrap: (i) => `Request: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Objective\n(1 bullet — success metric attached)\n\n## Asset Inventory\nTable: Asset · Format · Channel · Purpose · Priority\n(8 rows)\n\n## 4-Week Sequence\n(4 bullets — one per week)\n\n## Must-Ships\n(3 bullets — assets that ship even if everything slips)`,
  },
  "easy-mode": {
    title: "Easy Mode",
    inputLabel: "One-line goal", inputHint: "e.g. 'get 10 booked calls this month'",
    system: `${VOICE}\n\nShortest actionable path for a solo operator. No jargon.`,
    userWrap: (i) => `Goal: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Strategy in One Sentence\n(1 bullet)\n\n## 7-Day Plan\nTable: Day · Move · Time Needed · Proof it Worked\n(7 rows)\n\n## Daily Scorecard\n(3 bullets — the only 3 numbers that matter)\n\n## Refuse This Week\n(3 bullets)\n\n## Kill-Switch\n(1 bullet — the metric that means pivot)`,
  },
  "tool-generator": {
    title: "Tool Generator",
    inputLabel: "Tool brief", inputHint: "e.g. 'calculator for pipeline leak $'",
    system: `${VOICE}\n\nMicro-tool product spec.`,
    userWrap: (i) => `Brief: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Concept\n(2 bullets — what + who + when-used)\n\n## Spec\nTable: Field · Detail\nRows: Inputs, Core Formula, Output, Empty State, Result State\n\n## UI Copy\n(4 bullets — headline, sub, button, post-run CTA)\n\n## Growth Loops\n(3 bullets)`,
  },
  "golden-report": {
    title: "Golden Report",
    inputLabel: "Business + URL", inputHint: "e.g. 'Acme Co · acme.com'",
    system: `${VOICE}\n\nFlagship forensic case-file report — retainer-grade deliverable. This is the deliverable clients pay $2,500+ for. Full depth, full evidence, full dollar math.`,
    userWrap: (i) => `Subject: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Case Opener\n(3 noir bullets — diagnosis, biggest bleed in dollars, largest single opportunity)\n\n## Executive Bleed Estimate\n(1 short paragraph + a callout showing total ~$/month leaking with math: units × rate × conversion)\n\n## Evidence Log\nTable: # · Leak · Where Observed (URL/page/element) · Evidence Quote · Est. $/mo · Fix Tier (F1 quick / F2 medium / F3 rebuild)\n(8 rows minimum, ranked by dollar impact)\n\n## Chain Reaction\n(4 bullets — how leaks compound; each shows Leak A → symptom B → dollar leak C)\n\n## Positioning Autopsy\n(3–5 bullets on the current positioning, what buyer it filters out, what buyer it under-serves. Quote actual copy from the site.)\n\n## Offer & Pricing Read\n(3–5 bullets on the offer stack, price anchoring, guarantee, and what a competitor could exploit)\n\n## Funnel Forensics\nTable: Stage · What Should Happen · What Actually Happens · Est. Drop-off %\n(5 rows: Attract, Capture, Nurture, Convert, Retain)\n\n## Retainer Play\n(5 bullets — what a 90-day engagement seals in months 1 / 2 / 3, and expected recovered $/mo)\n\n## First 72 Hours\n(numbered, 6 moves — each with owner, time-box, and the metric that proves it worked)`,
  },
  "head-to-head": {
    title: "Head-to-Head Report",
    inputLabel: "You vs. Competitor", inputHint: "e.g. 'acme.com vs. competitor.com'",
    system: `${VOICE}\n\nSide-by-side competitor teardown with evidence — the deliverable a sales team uses to reposition in 30 days.`,
    userWrap: (i) => `Matchup: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Verdict\n(2 bullets — who wins today, by how much (%), and the 1 dimension that decides it)\n\n## Buyer Scorecard\nTable: Category · You · Them · Edge · Evidence\nRows: Positioning, Offer Clarity, Proof/Trust, Funnel Speed, Pricing Anchor, Content Volume, Content Depth, SEO Footprint, Social Signal, Support Signal\n\n## Message Teardown\n(3–5 bullets — quote their homepage headline vs. yours; explain which buyer each filters in/out)\n\n## Where You Win\n(4 bullets — with concrete proof from the sites)\n\n## Where You Lose\n(4 bullets — with concrete proof from the sites)\n\n## Pricing & Offer Comparison\nTable: Element · You · Them · Move\n(6 rows: entry price, top price, guarantee, bundle, trial, upsell)\n\n## Pull-Ahead Playbook\n(numbered, 6 items — action + expected shift + time-to-effect)\n\n## Long Game (90-day)\n(3 bullets — the positioning bet that changes the category, not just the page)`,
  },
  "resume-forensics": {
    title: "Resume Forensics",
    inputLabel: "Role + resume summary", inputHint: "Handled below by upload — this text is for the fallback prompt",
    system: `${VOICE}\n\nATS-proof resume rewrite AND company-fit analysis. Interview-triggering, quantified, brutal where it needs to be.`,
    userWrap: (i) => `Candidate + target: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Fit Verdict\n(2 bullets — strong/moderate/weak fit, with the single strongest reason and single biggest risk)\n\n## Company Read\n(3–5 bullets on what the company actually values based on their site — mission, tone, hiring signals, stack, stage)\n\n## Fit Scorecard\nTable: Dimension · Company Need · Candidate Evidence · Score /10\nRows: Domain, Skills, Stage-Fit, Culture, Impact-Track-Record, Communication\n\n## ATS Diagnosis\n(4 bullets — keyword gaps vs. this company's likely ATS filters, format risks, tone mismatches, length issues)\n\n## Rewritten Summary\n(~80 words, first-person, quantified, targeted at THIS company)\n\n## Bullet Rewrites (8 rows)\nTable: Section · Original (weak) · Rewritten (strong) · Metric Anchored · Why It Lands Here\n\n## Keywords to Inject\n(bullets grouped: must-have · nice-to-have · red-flag-to-avoid)\n\n## Interview Traps to Prep\n(5 bullets — likely questions THIS company asks, with the trap and the framing that wins)\n\n## Cover-Note Opener\n(~90 words — the 3-sentence cold note that hooks a hiring manager here)`,
  },
  "reciprocation": {
    title: "Reciprocation Gift",
    inputLabel: "Target company + URL", inputHint: "e.g. 'Prospect Co · prospect.com'",
    system: `${VOICE}\n\nHigh-value free custom door-opener report. Reciprocity by design — the prospect owes you a reply after reading.`,
    userWrap: (i) => `Prospect: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## The Gift (Cover Note)\n(~90 words — why you built this unprompted, no pitch, no ask)\n\n## What We Looked At\n(3 bullets — the exact pages/signals reviewed)\n\n## 5 Leaks Found\nTable: # · Leak · Where Observed · Evidence · Est. $/mo\n\n## The One Move (Free Consult)\n(2–3 short paragraphs — the fastest fix, exactly how to do it, why it works. This is the "gift-within-the-gift".)\n\n## Bonus: Copy Rewrite\n(rewrite ONE piece of copy from their site — headline, CTA, or hero sub — with 2 variants)\n\n## If You Want More\n(3 bullets — soft next-step CTA options, no pressure)`,
  },
  "ai-checklist": {
    title: "AI Readiness Checklist",
    inputLabel: "Company + industry", inputHint: "e.g. 'B2B SaaS, 40 employees'",
    system: `${VOICE}\n\nAI-readiness scoring — the deliverable that opens the AI/automation services conversation.`,
    userWrap: (i) => `Company: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Readiness Score\n(1 bullet — grade A–F + one-line rationale, plus estimated $/month of value locked behind readiness gaps)\n\n## Layer Scores\nTable: Layer · Score /10 · Current State (evidence) · Gap · Quick Win · Est. $ Value\nRows: Data, Ops, Sales, Marketing, Product, Leadership, Compliance/Trust\n\n## Top 5 Blockers\n(5 bullets — each blocker + why it kills adoption + who owns it)\n\n## Fast-Win Automation Menu\nTable: Workflow · Tool · Setup Time · $ Saved/mo\n(6 rows of real, named automations)\n\n## 90-Day Unlock Plan\n(numbered, month-by-month — Month 1 pilot, Month 2 scale, Month 3 govern)\n\n## Risks & Governance\n(3 bullets — model risk, data leakage, over-automation)`,
  },
  "nexus-iq": {
    title: "Prospect Intel · Nexus IQ",
    inputLabel: "Target company + URL", inputHint: "e.g. 'Target Co · target.com'",
    system: `${VOICE}\n\nPre-meeting dossier. Make the operator the smartest person in the room before they walk in.`,
    userWrap: (i) => `Target: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Snapshot\n(4 bullets — what they do, size signals, momentum signals, funding/growth cues)\n\n## Positioning & Messaging\n(3 bullets — quote their homepage headline, name their category, and identify who they filter out)\n\n## Likely Pain\nTable: Signal · Inferred Pain · Confidence (H/M/L) · Why It Matters to Them\n(7 rows)\n\n## Power Map\n(4 bullets — likely economic buyer, likely champion, likely blocker, likely gatekeeper — with hypothetical titles)\n\n## Talking Points\n(6 bullets — open with these; each ties to a specific observed signal)\n\n## Landmines / Traps to Avoid\n(4 bullets — words that will get you dismissed, competitors already in the room, sacred cows)\n\n## Discovery Questions to Bring\n(5 numbered questions — each un-Google-able, each surfaces budget or authority)\n\n## Post-Meeting Sequence\n(3 bullets — same-day recap, 48-hr proof asset, 7-day nudge)`,
  },
  "sales-scripts": {
    title: "Sales Scripts",
    inputLabel: "Offer + audience", inputHint: "e.g. 'diagnostic for CMOs'",
    system: `${VOICE}\n\nCold, warm, and follow-up scripts. Operator voice, no cheese, no "just checking in".`,
    userWrap: (i) => `Context: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Cold Opener — Phone (≤75 words)\n(pattern-interrupt open, one-sentence value, soft ask; give the exact opener line)\n\n## Cold Opener — Email (subject + body)\n(subject line variants: 3 options. Body: ≤90 words, forwardable.)\n\n## Cold Opener — LinkedIn DM (≤60 words)\n\n## Warm Reply (Interested/Maybe) (≤80 words)\n\n## Warm Reply (Send More Info) (≤80 words — the anti-brochure move)\n\n## Follow-Up Day 3 (≤60 words)\n\n## Follow-Up Day 7 (≤60 words — reframe the value)\n\n## Break-Up Day 14 (≤50 words)\n\n## Objection Volleys\nTable: Objection · One-Line Answer · Follow-Up Question\n(8 rows: price, timing, no budget, already have vendor, ghost, "send me a case study", "we tried this and it failed", "not a priority")\n\n## Discovery Question Bank\n(numbered, 8 questions — each un-Google-able, each surfaces urgency, pain, or budget)`,
  },
  "follow-up-plan": {
    title: "Follow-Up Sequences",
    inputLabel: "Meeting recap", inputHint: "Who you met, what was discussed, next step",
    system: `${VOICE}\n\nPost-meeting email plays that keep deals alive when prospects go quiet.`,
    userWrap: (i) => `Meeting: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Meeting Read\n(3 bullets — what actually happened, temperature, next-step risk)\n\n## Day-0 Recap Email (≤100 words)\n(subject line first, then body — includes the 3 agreed-on next steps in numbered form)\n\n## Day-3 Value Ping (≤80 words)\n(delivers ONE new insight tied to their business — not "just checking in")\n\n## Day-7 Reframe (≤80 words)\n(new angle on the value; new subject line)\n\n## Day-14 Case Study Drop (≤80 words)\n(links a named-scenario proof asset)\n\n## Day-21 Break-Up (≤60 words)\n(gives them an easy "no" that often triggers a "yes")\n\n## Silence-Breaker Bank\n(6 bullets — angles to try if the whole sequence lands silent: peer reference, competitor mention, timing shift, price-frame flip, "one question" open, executive escalation)\n\n## Champion Enablement Kit\n(3 bullets — what to send your internal champion so they can sell you upstream)`,
  },
  "linkedin-playbook": {
    title: "LinkedIn Playbook",
    inputLabel: "Role + niche", inputHint: "e.g. 'fractional CMO for SaaS'",
    system: `${VOICE}\n\nLinkedIn lead-engine system: profile → posts → DMs. Ship-ready, no fluff.`,
    userWrap: (i) => `Operator: ${i}\n\nOutput the following sections IN ORDER (then the required "Do This Monday Morning" section):\n\n## Positioning Line\n(1 bullet — the headline that filters IN the right buyers and OUT everyone else)\n\n## Profile Fixes\nTable: Field · Current Weakness · Rewrite\nRows: Headline, About (opening line), About (proof block), About (CTA line), Featured, Experience, Skills\n\n## Content Pillars (3)\n(3 bullets — each pillar with the buyer belief it shifts)\n\n## 14-Day Post Plan\nTable: Day · Format (text/carousel/video/poll) · Hook (first line) · Angle · CTA\n(14 rows — hooks must be under 12 words, distinct across the fortnight)\n\n## 3 Full Post Drafts\n(write 3 complete posts, ~140 words each, in the operator voice — one contrarian, one case-file, one framework)\n\n## DM Sequence\n(numbered — connect note (≤300 chars), first DM (≤400 chars), value follow-up, soft-ask close)\n\n## Comment Strategy\n(3 bullets — who to comment on, what a "authority-earning" comment looks like, and a copy-paste template)\n\n## Weekly Metrics\n(4 bullets — the only 4 numbers: profile views, post impressions, reply rate, booked calls)`,
  },
};

async function callGateway(system: string, user: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("Sandbox unavailable");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system + "\n\nPUBLIC-RUN GUARDRAIL: Do not name any real internal Aetheris client, rep, or system. Work only from user input + scraped context. This is FULL OPERATOR OUTPUT — comprehensive, dense, no compression. End with the required 'Do This Monday Morning' section." },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    if (r.status === 429) throw new Error("Model rate-limited. Try again in a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted. Contact Aetheris to top up.");
    throw new Error(`AI error ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

// Lightweight per-request site context so every tool has a baseline read of
// the company. Best-effort — a scrape failure never blocks the run.
async function fetchSiteContext(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["summary", "markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    const summary = j?.data?.summary || j?.summary || "";
    const md = (j?.data?.markdown || j?.markdown || "").slice(0, 1500);
    const meta = j?.data?.metadata || j?.metadata || {};
    const title = meta?.title || meta?.ogTitle || "";
    const desc = meta?.description || "";
    return [
      title && `TITLE: ${title}`,
      desc && `META: ${desc}`,
      summary && `SUMMARY: ${summary}`,
      md && `EXCERPT:\n${md}`,
    ].filter(Boolean).join("\n").slice(0, 3500);
  } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (rateLimited(ip)) return json({ error: "Rate limit: 20 runs per hour. Buy a tool for unlimited." }, 429);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const toolId  = String(body?.toolId  || "").trim();
  const url     = String(body?.url     || "").trim().slice(0, 500);
  const context = String(body?.context || "").trim().slice(0, 1500);
  // Backward-compat: older callers sent { input }.
  const legacy  = String(body?.input   || "").trim().slice(0, 2000);
  const cfg = PROMPTS[toolId];
  if (!cfg) return json({ error: "Unknown tool" }, 400);
  if (!url && !context && !legacy) {
    return json({ error: "Enter your website URL (and optional context)" }, 400);
  }
  if (url && !/^https?:\/\//i.test(url)) {
    return json({ error: "URL must start with https://" }, 400);
  }

  try {
    // Pull baseline site context in parallel with prompt assembly.
    const siteContext = url ? await fetchSiteContext(url) : "";

    // Assemble the operator input: URL is the anchor, context is the sharpening lens.
    const anchor = url || legacy || context;
    const userInput = cfg.userWrap(anchor);

    const systemWithContext = cfg.system + (siteContext || context ? `\n\n## COMPANY CONTEXT (baseline read — treat as ground truth)\n${
      [
        url && `URL: ${url}`,
        siteContext,
        context && `USER-PROVIDED CONTEXT / GOAL:\n${context}`,
      ].filter(Boolean).join("\n\n")
    }` : "");

    const output = await callGateway(systemWithContext, userInput);
    return json({
      ok: true,
      toolId,
      title: cfg.title,
      contextUsed: Boolean(siteContext),
      output,
    });
  } catch (e: any) {
    return json({ error: e?.message || "Sandbox failed" }, 500);
  }
});

export const TRY_TOOL_META = Object.fromEntries(
  Object.entries(PROMPTS).map(([k, v]) => [k, { title: v.title, inputLabel: v.inputLabel, inputHint: v.inputHint }])
);
