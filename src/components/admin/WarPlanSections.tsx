// War Plan operational content — offers, ICP, scripts, sales process, training, KPIs.
// Styled with the project's forensic tokens (amber/charcoal/Fraunces/JetBrains Mono).
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Layers, Crosshair, Send, Handshake, GraduationCap, Gauge, ShieldAlert, Rocket,
  Copy, ClipboardList, MessageSquare,
} from "lucide-react";

const useCopy = () => {
  const { toast } = useToast();
  return (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text).then(() => toast({ title: label }));
  };
};

// ──────────────────────────────────────────────────────────────────────
// 1. OFFER STACK
// ──────────────────────────────────────────────────────────────────────
const OFFERS_TABLE = [
  { name: "Forensic Diagnostic (Leak Audit)", what: "Full forensic: CRM, marketing, ops, systems. Ranked list of where money is being lost and how to recover it.", price: "$2.5k → applied", time: "7–10 days", use: "Entry point. Almost always reveals enough to sell implementation." },
  { name: "Revenue Recovery Sprint", what: "Fix the top 3 highest-impact leaks identified in the audit. CRM cleanup, automation, offer restructuring, funnel repair.", price: "$25k – $50k", time: "30 days", use: "Post-audit upsell. High close rate — the problem is already proven." },
  { name: "Implementation Retainer", what: "Custom AI tools, automation stacks, digital infrastructure. Recovery Engine, Hygiene Engine, LinkedIn Engine, custom builds.", price: "$15k / mo", time: "rolling 3–6 mo", use: "Mid-market $10M–$50M ready to scale operations." },
  { name: "Fractional CTO Retainer", what: "Strategic oversight of tech stack, AI roadmap, vendor management, system governance. Monthly calls + async + quarterly reviews.", price: "$5k – $15k / mo", time: "rolling 6–12 mo", use: "Post-project. Builds recurring revenue. Stacks fast." },
  { name: "Done-For-You Growth Stack", what: "Full engagement: audit + systems build + 90 days of retainer support. White-glove, premium.", price: "$100k – $175k", time: "90–120 days", use: "Serious operators who want one partner, not a patchwork." },
];

export const OfferStackSection: React.FC = () => (
  <Card className="bg-card/60 border-border/60">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Layers className="w-4 h-4 text-amber" /> Offer Stack · What You're Actually Selling
      </CardTitle>
      <p className="text-xs text-muted-foreground mt-1">
        We don't sell "AI" or "automation." We sell <strong className="text-foreground">revenue recovery, operational
        control, growth without waste.</strong> Every offer is framed around what the client is losing right now.
      </p>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              {["Offer", "What it is", "Price", "Time", "Best Use"].map(h => (
                <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-amber border-b border-border/60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OFFERS_TABLE.map((o, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                <td className="px-3 py-3 align-top text-foreground font-medium">{o.name}</td>
                <td className="px-3 py-3 align-top text-muted-foreground">{o.what}</td>
                <td className="px-3 py-3 align-top text-amber font-mono whitespace-nowrap">{o.price}</td>
                <td className="px-3 py-3 align-top text-muted-foreground font-mono whitespace-nowrap">{o.time}</td>
                <td className="px-3 py-3 align-top text-muted-foreground">{o.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-amber/30 bg-amber/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-1">Pricing logic</div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
            <li>Diagnostic priced as a no-brainer vs. what they bleed monthly</li>
            <li>Sprints are ROI-positive in 60 days or less</li>
            <li>Retainers convert because clients won't lose the relationship post-build</li>
            <li>Never discount — offer payment terms instead</li>
            <li>Anchor every conversation to cost of inaction</li>
          </ul>
        </div>
        <div className="rounded-md border border-amber/30 bg-amber/5 p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-1">The framing that closes</div>
          <p className="text-xs text-muted-foreground italic">
            "Most companies your size are losing $300k–$2M a year in preventable revenue leaks — missed follow-up,
            broken systems, underperforming marketing, ops gaps. We find exactly where it's happening and fix it. The
            audit pays for itself in the first finding."
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────────────────────────────
// 2. ICP / TARGET MARKET
// ──────────────────────────────────────────────────────────────────────
const VERTICALS = [
  { tag: "Vertical 1 — Primary", name: "Specialty Manufacturers", lines: [
    "Revenue: $5M–$50M",
    "Pain: long sales cycles, manual quoting, no CRM discipline, outdated systems",
    'Trigger words: "leaving money on the table" / "sales doesn\'t follow up" / "built on spreadsheets"',
    "Best entry: Forensic Diagnostic",
    "Find them: LinkedIn, NAM + regional mfg councils, trade shows",
  ]},
  { tag: "Vertical 2 — Secondary", name: "Commercial Construction & GCs", lines: [
    "Revenue: $8M–$40M",
    "Pain: chaotic bid process, project handoffs break, post-close client comms fail",
    'Trigger words: "win bids but lose on margins" / "can\'t scale without hiring" / "CRM is a mess"',
    "Best entry: Revenue Recovery Sprint",
    "Find them: LinkedIn, AGC chapter events, local business journals",
  ]},
  { tag: "Vertical 3 — Fast Cash", name: "Commercial Services ($10M–$30M)", lines: [
    "HVAC, electrical, landscaping, facility management at commercial scale",
    "Pain: recurring revenue uncaptured, tech stack is a mess, marketing scattered",
    'Trigger words: "website doesn\'t bring anything" / "lose customers after year 1" / "no system"',
    "Best entry: Diagnostic or full Growth Stack",
    "Find them: LinkedIn, local chambers, CPA/attorney referrals",
  ]},
];

const LEAD_SOURCES = [
  { src: "Warm Network (personal/professional)", vol: "15–25 leads", conv: "30–40%", days: "7–14", priority: "FIRST", tone: "border-destructive/50 text-destructive" },
  { src: "LinkedIn Direct Outreach (DMs)", vol: "200–500 / mo", conv: "3–8%", days: "21–45", priority: "HIGH", tone: "border-amber/50 text-amber" },
  { src: "Cold Email (targeted ICP)", vol: "500–2000 / mo", conv: "1–4%", days: "21–30", priority: "HIGH", tone: "border-amber/50 text-amber" },
  { src: "Strategic Referral Partners (CPAs, attorneys, agencies)", vol: "5–15 / mo active", conv: "25–50%", days: "14–21", priority: "HIGH", tone: "border-amber/50 text-amber" },
  { src: "LinkedIn Content (thought leadership)", vol: "passive / compounds", conv: "2–5% engaged", days: "30–60", priority: "SUPPORT", tone: "border-muted-foreground/50 text-muted-foreground" },
  { src: "Paid Ads (LinkedIn, Meta retargeting)", vol: "scalable", conv: "1–3%", days: "30–60", priority: "PHASE 2+", tone: "border-muted-foreground/50 text-muted-foreground" },
];

export const TargetMarketSection: React.FC = () => (
  <Card className="bg-card/60 border-border/60">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Crosshair className="w-4 h-4 text-amber" /> ICP · Who You're Hunting
      </CardTitle>
      <p className="text-xs text-muted-foreground mt-1">
        Pick three verticals and dominate them in 90 days. Depth beats breadth. Niche language in outreach triples
        response rates.
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        {VERTICALS.map(v => (
          <div key={v.name} className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-1">{v.tag}</div>
            <div className="font-forensic text-base mb-2">{v.name}</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {v.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-amber">▸</span><span>{l}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              {["Lead Source", "Volume", "Conv.", "Days", "Priority"].map(h => (
                <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-amber border-b border-border/60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEAD_SOURCES.map((r, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                <td className="px-3 py-2 text-foreground">{r.src}</td>
                <td className="px-3 py-2 text-muted-foreground font-mono">{r.vol}</td>
                <td className="px-3 py-2 text-amber font-mono">{r.conv}</td>
                <td className="px-3 py-2 text-muted-foreground font-mono">{r.days}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={`font-mono text-[9px] uppercase ${r.tone}`}>{r.priority}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────────────────────────────
// 3. OUTREACH SCRIPTS (copyable)
// ──────────────────────────────────────────────────────────────────────
const SCRIPTS = [
  { label: "LinkedIn DM — First Touch (Cold Connection)", note: "Keep it short. One question at the end. No links. Reply rate drops 60% with links in first message.",
    text: `Hey [First Name] — noticed you're running [Company] in [industry].

Most companies your size are quietly bleeding $300k–$1M/year through broken follow-up systems, underperforming marketing, and ops gaps they don't even know exist.

We built a diagnostic process that finds exactly where it's happening — in about 7 days.

Not pitching anything today — just thought this might be worth a 15-minute conversation if the timing is right.

Interested?` },
  { label: "LinkedIn DM — Follow Up (Day 5, no reply)", note: 'The reversal ("if everything is fine, you don\'t need us") consistently outperforms standard follow-ups by triggering self-assessment.',
    text: `Hey [First Name] — following up on my note from earlier this week.

Quick version: we find where B2B companies your size are leaking revenue — then fix it.

If you're not losing any leads, your systems are running clean, and your marketing is working the way it should — you definitely don't need us.

If any of those feel off, might be worth a short call.

Up to you either way.` },
  { label: 'Cold Email — Subject: "Quick question about [Company]"', note: 'Personalize [Company] and [industry]. Send from a warmed domain. Use Instantly or Smartlead. Never use "I hope this email finds you well."',
    text: `Subject: Quick question about [Company Name]

[First Name],

We work with specialty [manufacturers / contractors / commercial services companies] in the $5M–$40M range to find and fix the revenue leaks that are costing them six figures per year.

Most of the time, the biggest problems are:
→ Leads falling through the cracks after initial contact
→ Marketing that looks busy but doesn't convert
→ Ops and systems that can't scale without adding headcount

We do a 7-day Forensic Diagnostic that surfaces exactly where the money is going — and what it would take to get it back.

Worth a 20-minute call to see if it applies to [Company Name]?

— Joseph
Aetheris AI | aetheris.technology` },
  { label: "Referral Partner Outreach (CPAs, Attorneys, M&A Advisors)", note: "Position as a resource, not a commission pitch. Referral fee conversation happens AFTER they show interest.",
    text: `Hey [Name] — I know you work with a lot of growth-stage businesses in the $5M–$50M range.

We do revenue and operations diagnostics for companies in that zone — specifically finding where they're bleeding money in their systems, marketing, and ops.

It's not a marketing agency play. We find broken things and build tools to fix them. Most engagements recover significantly more than they cost.

If any of your clients are dealing with stalled growth, chaotic operations, or "we're leaving money on the table" conversations — I'd love to be on your referral list.

Happy to send over a one-pager or jump on a call if that's easier.

Worth connecting?` },
];

export const OutreachSection: React.FC = () => {
  const copy = useCopy();
  return (
    <Card className="bg-card/60 border-border/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="w-4 h-4 text-amber" /> Outreach · The Contact Machine
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Copy any script straight from here. Personalize the bracketed fields, send, log it in the portal.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { v: "20", l: "LinkedIn DMs / Day" },
            { v: "50", l: "Cold Emails / Day" },
            { v: "5",  l: "LinkedIn Posts / Week" },
            { v: "3",  l: "Referral Calls / Week" },
          ].map(s => (
            <div key={s.l} className="rounded border border-border/60 bg-background/40 p-3 text-center">
              <div className="text-2xl font-forensic text-amber">{s.v}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono mt-1">{s.l}</div>
            </div>
          ))}
        </div>
        {SCRIPTS.map((s, i) => (
          <div key={i} className="rounded-md border border-amber/30 bg-amber/5 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-wide text-amber font-mono">{s.label}</div>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => copy(s.text, "Script copied")}>
                <Copy className="w-3 h-3 mr-1" />Copy
              </Button>
            </div>
            <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed">{s.text}</pre>
            <div className="text-[11px] text-muted-foreground italic mt-2">{s.note}</div>
          </div>
        ))}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-2">Daily outreach sequence</div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
              <li>Morning 8–9am: review replies, book calls, follow up on open threads</li>
              <li>9–10am: send 20 LinkedIn DMs (new + follow-ups)</li>
              <li>10–11am: send 50 cold emails OR run 1–2 sales calls</li>
              <li>Afternoon: LinkedIn content post (pre-scheduled)</li>
              <li>EOD: log all activity in CRM, update pipeline stage</li>
            </ul>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-2">LinkedIn content — 5 posts / week</div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Mon</strong> — revenue leak insight (problem awareness)</li>
              <li><strong className="text-foreground">Tue</strong> — mini case study / before-after</li>
              <li><strong className="text-foreground">Wed</strong> — diagnostic question ("does your company have this?")</li>
              <li><strong className="text-foreground">Thu</strong> — system or tool breakdown (credibility)</li>
              <li><strong className="text-foreground">Fri</strong> — POV post — the thing most consultants won't say</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ──────────────────────────────────────────────────────────────────────
// 4. SALES PROCESS + OBJECTIONS
// ──────────────────────────────────────────────────────────────────────
const STAGES = [
  { stage: "Stage 1", time: "Discovery Call · 20–30 min", title: "The entry conversation",
    bullets: [
      "Goal: understand their situation, not pitch your services",
      'Questions: "What\'s not working right now?" / "Where are you leaving money?" / "What does growth look like if systems worked?"',
      "Find the pain, quantify it loosely, earn the right to a deeper conversation",
      'Close: "Based on what you shared, an audit would show exactly what this is costing you. Can I send what that looks like?"',
  ]},
  { stage: "Stage 2", time: "Audit Proposal · 24–48 hrs", title: "The diagnostic proposal",
    bullets: [
      "1–2 page document (not a deck)",
      'Lead with what you heard: "Based on our conversation, here\'s what appears to be happening…"',
      "Describe the audit process and what they'll receive (ranked issues, recovery estimates, recommended path)",
      "Price: $2.5k Forensic Diagnostic (applied toward engagement)",
      'Frame: "Either it shows you where the money is — or confirms you don\'t have a problem. Either way, you\'ll know."',
  ]},
  { stage: "Stage 3", time: "Audit Delivery · Day 7–10", title: "The proof moment",
    bullets: [
      "Present findings on a live call (not just email)",
      "Lead with the most painful, highest-dollar finding first",
      "Use real numbers from their data wherever possible",
      'Frame each finding: "What\'s happening / What it\'s costing / What fixing it looks like"',
      'End with: "We can fix the top 3 in 30 days. Want to see what that engagement looks like?"',
  ]},
  { stage: "Stage 4", time: "Sprint / Build Proposal · 48–72 hrs", title: "The big close",
    bullets: [
      "The hard sell is already done — by the audit findings",
      "Proposal scoped to their exact issues, not a generic package",
      'Anchor to ROI: "Recover 20% of what we found and this pays for itself 4x over"',
      "Offer two paths: Sprint ($25k–$50k) or Implementation Retainer ($15k/mo)",
      "Payment terms close fence-sitters: 50% upfront, 50% at delivery",
  ]},
  { stage: "Stage 5", time: "Retainer Conversion · Day 60–90", title: "Lock in recurring revenue",
    bullets: [
      "At 60–70% completion of any project, introduce the retainer",
      'Frame: "Most clients keep us on for strategic oversight — last thing you want is to rebuild these systems in 6 months without anyone watching the architecture"',
      "$5k–$15k/month depending on scope",
      "Goal: 5 retainer clients by Day 90 = $25k–$75k/month MRR foundation",
  ]},
];

const OBJECTIONS = [
  { tag: "Too Expensive", title: "The cost of nothing",
    body: '"What I\'d ask you to consider — based on what we found in the audit, you\'re losing roughly [X] per month right now. This engagement costs [Y]. If we recover even 30% of what\'s leaking, it pays for itself in [Z] weeks. The real question isn\'t whether this costs too much — it\'s whether you can afford to keep losing it."' },
  { tag: "Not the Right Time", title: "Timing reframe",
    body: '"I hear that — when would be a better time? Reason I ask: every month this isn\'t fixed is another month of [the problem]. Most clients tell us they wish they\'d started sooner. Is there a specific constraint right now, or is it more about bandwidth?"' },
  { tag: "We Need to Think About It", title: "The clear ask",
    body: '"Absolutely — what specifically is the part you\'d want to think through? Want to make sure I haven\'t left anything unclear. Most of the time when someone wants to think it over, there\'s a specific concern I haven\'t addressed — what is it for you?"' },
];

export const SalesProcessSection: React.FC = () => {
  const copy = useCopy();
  return (
    <Card className="bg-card/60 border-border/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Handshake className="w-4 h-4 text-amber" /> Sales Process · Diagnose, Don't Pitch
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          You are not a salesperson — you are a <strong className="text-foreground">diagnostician</strong>. Your job is
          to help the prospect see the problem more clearly than they ever have.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGES.map(s => (
          <div key={s.stage} className="rounded-md border border-border/60 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div>
                <Badge variant="outline" className="font-mono text-[10px] uppercase mr-2">{s.stage}</Badge>
                <span className="font-forensic text-base">{s.title}</span>
              </div>
              <div className="text-[11px] text-amber font-mono">{s.time}</div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
              {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        ))}

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          {OBJECTIONS.map(o => (
            <div key={o.tag} className="rounded-md border border-amber/30 bg-amber/5 p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-amber font-mono">Objection · {o.tag}</div>
                  <div className="font-forensic text-sm mt-0.5">{o.title}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => copy(o.body, "Response copied")}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{o.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ──────────────────────────────────────────────────────────────────────
// 5. TRAINING MATRIX
// ──────────────────────────────────────────────────────────────────────
const TRAINING = [
  { module: "Offer Fluency Drill", owner: "Joseph", format: "Live roleplay, 30 min", freq: "Weekly (Days 1–30)", target: "Day 7" },
  { module: "Discovery Call Framework", owner: "Joseph", format: "Recorded call + debrief", freq: "2x/week first month", target: "Day 10" },
  { module: "Objection Response Bank", owner: "Joseph", format: "Written doc + practice", freq: "Review weekly", target: "Day 5" },
  { module: "Revenue Leak Diagnosis (per ICP)", owner: "Joseph + Braden", format: "Case study walkthrough", freq: "Per new vertical", target: "Day 14" },
  { module: "CRM Pipeline Discipline", owner: "Joseph", format: "HubSpot SOP document", freq: "One-time + audit", target: "Day 3" },
  { module: "Outreach Sequence Certification", owner: "Joseph", format: "Live review of sent messages", freq: "Weekly", target: "Day 7" },
  { module: "Commission Rep Onboarding Pack", owner: "Joseph", format: "Written + recorded video", freq: "Per new rep", target: "Day 14" },
];

export const TrainingMatrixSection: React.FC = () => (
  <Card className="bg-card/60 border-border/60">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-amber" /> Team Training · Fluency, Not Familiarity
      </CardTitle>
      <p className="text-xs text-muted-foreground mt-1">
        If they can't explain it at dinner, they can't sell it on a Zoom. Train every rep to fluency on offer, top 5
        objections, and discovery flow without notes.
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              {["Module", "Owner", "Format", "Frequency", "Done by"].map(h => (
                <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-amber border-b border-border/60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRAINING.map((r, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                <td className="px-3 py-2 text-foreground font-medium">{r.module}</td>
                <td className="px-3 py-2 text-muted-foreground font-mono">{r.owner}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.format}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.freq}</td>
                <td className="px-3 py-2 text-amber font-mono">{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-md border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-2">Sales rep onboarding · Days 1–7</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Day 1</strong> — mission, ICP, offer stack, pricing rationale</li>
            <li><strong className="text-foreground">Day 2</strong> — Revenue Leak frame in 90 seconds</li>
            <li><strong className="text-foreground">Day 3</strong> — discovery script, flow, qualifying fast</li>
            <li><strong className="text-foreground">Day 4</strong> — objection handling — top 5 word for word</li>
            <li><strong className="text-foreground">Day 5</strong> — LinkedIn outreach — 10 messages supervised</li>
            <li><strong className="text-foreground">Day 6</strong> — shadow Joseph on a live call or replay</li>
            <li><strong className="text-foreground">Day 7</strong> — solo discovery call with debrief</li>
          </ul>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-2">Weekly team rhythm</div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Mon 9am</strong> — pipeline review (moved / stuck / closes-this-week)</li>
            <li><strong className="text-foreground">Wed</strong> — call debrief — replay one call, identify one fix</li>
            <li><strong className="text-foreground">Fri</strong> — numbers check — sent / replies / booked / proposals / closed</li>
            <li><strong className="text-foreground">Always</strong> — every rep logs activity in HubSpot same day. No exceptions.</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ──────────────────────────────────────────────────────────────────────
// 6. KPI SCOREBOARD + RECOVERY/ACCEL
// ──────────────────────────────────────────────────────────────────────
const KPIS = [
  { kpi: "LinkedIn DM reply rate", target: "10–15%", min: "6%", action: "Rewrite opening line, test 3 new variants" },
  { kpi: "Cold email open rate", target: "35–50%", min: "25%", action: "A/B subject lines, recheck domain health" },
  { kpi: "Cold email reply rate", target: "4–8%", min: "2%", action: "Rewrite body, tighten ICP targeting" },
  { kpi: "Discovery → Proposal", target: "50–60%", min: "35%", action: "Audit discovery structure, add qualifying questions" },
  { kpi: "Proposal → Close", target: "30–40%", min: "20%", action: "Review pricing, sharpen proposal, add case study proof" },
  { kpi: "Audit → Sprint upsell", target: "60–70%", min: "40%", action: "Improve audit delivery presentation, sharpen ROI framing" },
  { kpi: "Client → Retainer conversion", target: "50%", min: "25%", action: "Introduce retainer earlier, improve success milestones" },
];

export const KpiScoreboardSection: React.FC = () => (
  <Card className="bg-card/60 border-border/60">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Gauge className="w-4 h-4 text-amber" /> KPI Scoreboard · The Numbers That Matter
      </CardTitle>
      <p className="text-xs text-muted-foreground mt-1">
        If a number drops below minimum acceptable, the action column is what happens that week. No debate.
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { v: "70",   l: "LinkedIn DMs / wk" },
          { v: "250",  l: "Cold emails / wk" },
          { v: "8–12", l: "Discovery calls / wk" },
          { v: "3–5",  l: "Proposals / wk" },
          { v: "1–2",  l: "Closes / wk" },
        ].map(s => (
          <div key={s.l} className="rounded border border-border/60 bg-background/40 p-3 text-center">
            <div className="text-xl font-forensic text-amber">{s.v}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              {["KPI", "Target", "Min", "Action if below"].map(h => (
                <th key={h} className="px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-amber border-b border-border/60">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KPIS.map((r, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/10">
                <td className="px-3 py-2 text-foreground font-medium">{r.kpi}</td>
                <td className="px-3 py-2 text-amber font-mono">{r.target}</td>
                <td className="px-3 py-2 text-destructive font-mono">{r.min}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <div className="text-[10px] uppercase tracking-wide text-destructive font-mono">Recovery protocol — if behind</div>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
            <li><strong className="text-foreground">Wk 3 not at $50k</strong> — work warm network harder. Personal calls, not messages.</li>
            <li><strong className="text-foreground">Wk 6 not at $300k</strong> — add a second rep, increase outreach 2x.</li>
            <li><strong className="text-foreground">Wk 9 not at $600k</strong> — drop all non-revenue activity. Outreach + calls only.</li>
            <li><strong className="text-foreground">Never</strong> — lower prices, add products, or pivot positioning mid-sprint.</li>
          </ul>
        </div>
        <div className="rounded-md border border-amber/40 bg-amber/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-amber" />
            <div className="text-[10px] uppercase tracking-wide text-amber font-mono">Acceleration protocol — if ahead</div>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
            <li>Add a second commissioned rep immediately</li>
            <li>Increase LinkedIn content to 2x per day</li>
            <li>Launch referral partner program with structured commission</li>
            <li>Build case study library for the inbound engine</li>
            <li>Initiate retainer conversations with ALL active clients</li>
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-amber/30 bg-amber/5 p-3 flex gap-3 items-start">
        <ClipboardList className="w-4 h-4 text-amber mt-0.5 shrink-0" />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-1">Daily 5 absolutes</div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc ml-5">
            <li>Have at least one revenue conversation</li>
            <li>Send outreach (LinkedIn + cold email)</li>
            <li>Log everything in HubSpot before EOD</li>
            <li>Post or schedule one piece of LinkedIn content</li>
            <li>End the day knowing what closes tomorrow</li>
          </ul>
        </div>
      </div>

      <div className="rounded-md border border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-4">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 text-amber mt-0.5" />
          <p className="text-sm text-foreground/90 italic leading-relaxed">
            <strong className="text-amber">The final word.</strong> Companies our size, with our offer, at our price
            points, do not need luck — they need execution discipline. The math works. The market is there. The only
            variable is whether the machine runs every day without exception. Run the machine.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);
