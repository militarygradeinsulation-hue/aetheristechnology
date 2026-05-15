import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HelpCircle, Copy, CheckCircle2, BookOpen, DollarSign, Users,
  Workflow, Cpu, Heart, Shield, User as UserIcon, Search, ChevronDown, ChevronRight,
  Building2, Award,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Section = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
  script?: string;
  scriptLabel?: string;
};

const SECTIONS: Section[] = [
  {
    id: "who",
    title: "Who Aetheris Is (30-second open)",
    subtitle: "Use this as the first thing you say after the handshake. It frames everything else.",
    icon: Building2,
    bullets: [
      "Aetheris Technology is a Business Forensics firm. We are not consultants. We are operators.",
      'Our hook: "Your business is leaking — you just can\'t see it from the inside." We find the leaks, then we fix them.',
      "Our methodology is The Leak Audit™ — a 7-step forensic process. Anyone can run a free self-scan at aetheris.technology/leak-audit.",
      "Operator-led work starts with a $2,500 Forensic Diagnostic that gets credited toward the larger engagement.",
      "We focus on specialty manufacturers and operators doing $5M–$25M who know they're losing money but can't name where.",
    ],
    scriptLabel: "WORD-FOR-WORD SCRIPT",
    script:
      `"I'm with Aetheris Technology — we're a business forensics firm. Most owners know their business is leaking money, they just can't see it from the inside. Our job is to find the leaks, prove them with data, and then operate the fixes. We're not consultants writing slide decks. We are the operators."`,
  },
  {
    id: "systems",
    title: "The Systems & Tech Stack",
    subtitle: 'When the candidate asks "how do you actually do this?" — pull from here.',
    icon: Cpu,
    bullets: [
      "We don't sell software. We sell the operator who runs the software for you. Our internal stack runs 13 forensic systems on top of whatever CRM the client uses, plus an AI layer the rep team uses to generate scripts, follow-up plans, and content.",
      "That's why reps ramp fast — the tools do the heavy lifting.",
      "The Leak Audit™ instruments the bleed in real dollars: lead leaks, follow-up leaks, pricing leaks, owner-overload leaks, dead-pipeline leaks.",
      "Then we install the fix: scripts, automations, dashboards, hiring filters — operator-built, not slide-deck consulting.",
    ],
  },
  {
    id: "pay",
    title: "The Pay Structure (read this verbatim if needed)",
    subtitle: "This is the most important part of the interview. Make the numbers feel real and inevitable.",
    icon: DollarSign,
    bullets: [
      "Two flagship offers run the business: the $18,000 Diagnostic (one-time) and the $15,000/month Implementation Retainer.",
      "Flagship splits are FIXED DOLLAR — not percentage games. $18k Diagnostic close → Company $10k / Rep $5k / Partner $3k.",
      "$15k/mo Retainer → Company $8k / Rep $4k / Partner $3k EVERY MONTH it stays active.",
      "One retainer close pays the rep $4k recurring. Two retainers = $8k/mo. Five = $20k/mo recurring before bonuses.",
      "Catalog products use tiered % (50/30/20 → 60/25/15 → 70/20/10 as volume grows).",
    ],
  },
  {
    id: "bonuses",
    title: "Bonuses (this is what closes them)",
    subtitle: "Save this for the second half of the interview — it's the kicker that gets a yes.",
    icon: Award,
    bullets: [
      "Volume bonuses: hit 2 flagship sales in a month → +$1,000. Hit 3 → +$2,500. Hit 5 → +$5,000. Stacks on top of every commission you already earned.",
      "Retention bonuses: client extends past the 3-month minimum → +$1,000. 6-month extension → +$2,500. 12-month extension → +$5,000 plus a $500/month bump for the duration.",
      "Referral structure: recommend a hire we onboard → $500 instant payout. When that new hire closes their first flagship → THEY get $7,000 (instead of $5k) and YOU get a $500/sale override on every sale they make for the next 12 months.",
      "Webinar bonus: bring people to a webinar — if they buy, your commission % bumps automatically.",
    ],
  },
  {
    id: "culture",
    title: "Culture & Tone (what we are NOT)",
    subtitle: "Filter candidates fast — we don't want polish, we want operators.",
    icon: Heart,
    bullets: [
      'We are blunt, forensic, and operator-first. Not corporate. Not influencer-y. Not "AI guru."',
      "No fluffy slide decks, no hype, no testimonials wall. The findings report and the dollar math do the talking.",
      "We hire people who would rather be right than liked. Clients pay us to tell them the truth.",
      "Reps are expected to use the Leak Audit framework on every conversation — find the leak, name the dollar amount, present the fix.",
      'If a candidate uses "synergy," "leverage," or "thought leadership" unironically — they\'re probably not the right seat.',
    ],
  },
  {
    id: "objections",
    title: "Candidate Objections (handle in real time)",
    subtitle: "If a candidate pushes back, here's the playbook.",
    icon: Shield,
    bullets: [
      '"What if I don\'t close anything for a few months?" → "You\'re not on a base. But the catalog products pay $30–$200 a pop and you can run them while flagships are pending. Most reps land their first flagship inside 60 days."',
      '"Is this commission-only?" → "Yes. But the upside is uncapped and the bonuses stack. A rep who closes one flagship per quarter clears $200k+ from flagships alone."',
      '"How do leads come in?" → "Inbound from the website, partner referrals, and our outbound systems. You also get a leads board in your portal and an AI coach that helps you work it."',
      '"What if I want to bring my book of business?" → "We love that. Bring them in, run them through the Leak Audit, and you keep the same flat-dollar split on every close."',
    ],
  },
  {
    id: "close",
    title: "Closing the Interview",
    subtitle: "End strong. Give them homework so you find out who actually shows up.",
    icon: CheckCircle2,
    scriptLabel: "WORD-FOR-WORD CLOSE",
    script:
      `"Two questions for you to think about before our next call:
 1. Pick one number you've personally driven in the last 12 months and be ready to defend it.
 2. Tell me one process you'd want to break inside a company you joined — and why.
If those land, we move to a working session with Joseph. Sound fair?"`,
    bullets: [
      "Always give homework. The candidates who don't do it disqualify themselves.",
      "Hand-off to Joseph for delivery; you stay attached for renewal commission.",
    ],
  },
];

type FAQ = { q: string; a: string; tag: string };
const FAQS: FAQ[] = [
  { tag: "Pay", q: "How much can I actually make in my first 90 days?", a: "Realistic ramp: 1 catalog sale in week 2-3 ($30–$200), first flagship inside 60 days ($5k diagnostic + $4k/mo retainer). A rep who lands one flagship per quarter clears $200k+ from flagships alone, plus catalog and bonuses on top. The math: you keep 27% of every Diagnostic and 27% of every Retainer month, with stacked bonuses. If you want a salary, this isn't the right seat. If you want uncapped, this is the best math you'll find." },
  { tag: "Pay", q: "What happens to my commission if a client cancels?", a: "Catalog products: commission is locked at sale. Flagships: Diagnostic commission locks once the diagnostic is delivered (typically week 3). Retainer commission pays monthly as long as the client pays — if they cancel in month 4, you got 3 months of retainer commission. We don't claw back." },
  { tag: "Process", q: "What does a normal sales call actually look like?", a: "Step one: get them to run the free Leak Audit at aetheris.technology/leak-audit — that gives them a score and shows them their leaks. Step two: book a 30-minute call to walk them through the result. Step three: pitch the $2,500 Forensic Diagnostic — the cheapest way to prove ROI. Step four: that Diagnostic feeds them into the $18,000 full Diagnostic and the $15,000/month retainer. You're not selling cold — you're selling the next obvious step." },
  { tag: "Process", q: "Do I need to be technical?", a: "No. You need to be coachable and aggressive. The 13 forensic systems and the AI layer are operated by us — you're selling the outcome, not the tech. The portal hands you scripts, objection answers, and follow-up plans. Anyone who can read a P&L and have a real conversation with an owner can sell this." },
  { tag: "Leads", q: "Where do leads come from?", a: "Inbound: Leak Audit submissions, free website scanner, contact forms, webinar registrations, and referral traffic. Each rep gets a daily drop of pre-scored leads in the portal at 7am." },
  { tag: "Culture", q: "Who is my ideal customer? Who should I be calling?", a: "$5M–$25M specialty manufacturers, construction, and commercial services in the Midwest. Owners who know they're losing money but can't name where. We do a weekly forecast review. We do not do hour-long Monday meetings. If your numbers are honest and trending up, we leave you alone. If they're not, we coach hard." },
  { tag: "Objections", q: 'This sounds too good to be true / why are you paying so much?', a: "Because the math works for everyone. The Diagnostic is $18,000 and we keep $10,000 of it — that funds the operator who actually runs the work. The retainer is $15k/mo and we keep $8k — that funds delivery, software, and overhead. Your $5k + $4k/mo isn't a marketing line — it's what the model can sustain because we don't have a sales floor, an SDR team, or a VP of Sales taking a cut." },
  { tag: "Personal", q: "Who's Joseph? Who's Braden?", a: "I'm Braden — I've operated and sold inside companies in this revenue band for years. Aetheris is built for the rep I wish I'd had a seat at. The IP is owned by CTOguy.ai. We're based out of Indianapolis. You'll have my phone number from day one — I take rep calls before partner calls. If I can't help you close, you don't owe me your time." },
  { tag: "Tech", q: "What tools do I need?", a: "Laptop, reliable internet, quiet space for calls. Everything else (CRM, leads, scripts, calendar, training, AI coach) is in the portal. We don't ask reps to buy software." },
  { tag: "Pay", q: "1099 or W-2?", a: "1099 contractor. You set your own hours. The portal tracks everything — clock-in, leads worked, commission ledger — so you always know exactly where you stand." },
  { tag: "Process", q: "What's the ramp?", a: "60 days. Most reps hit their stride in week 6-8. The portal has a sales coach, scripts, training modules, and an AI assistant that pulls live company data so you're never flying blind." },
  { tag: "Objections", q: "Why should I leave my current role?", a: "Don't yet. Talk to 5 leads, close 1, and decide based on the math — not the pitch." },
];

const TAGS = ["All", "Pay", "Leads", "Process", "Tech", "Culture", "Objections", "Personal"];

export const InterviewBriefingPanel: React.FC = () => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [tag, setTag] = useState("All");
  const [q, setQ] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Copied" });
    setTimeout(() => setCopied(null), 1200);
  };

  const filtered = useMemo(() => {
    return FAQS.filter(f => (tag === "All" || f.tag === tag) &&
      (!q || `${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase())));
  }, [tag, q]);

  const sectionFullText = (s: Section) =>
    [s.title, ...s.bullets, s.script ? `\n${s.scriptLabel || "SCRIPT"}:\n${s.script}` : ""]
      .filter(Boolean).join("\n• ").replace("• " + s.title, s.title);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-amber/40 bg-card/60">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">For Braden — Interview Kit</span>
            <Badge variant="outline" className="text-[10px] border-amber/40 text-amber ml-auto">v1 · Always current</Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber" />
            Interview Briefing — Talking Points & Pay Structure
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you need to walk into a rep interview cold and run it seamlessly. Each section is a script you can read verbatim, plus the bullets behind it so you can riff. Click to expand. Copy the script straight to your phone if you need it on the call.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isOpen = open[s.id];
            return (
              <div key={s.id} className="border border-border/50 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(p => ({ ...p, [s.id]: !p[s.id] }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{s.title}</div>
                      {s.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); copy(sectionFullText(s), s.id); }}
                      className="text-xs text-muted-foreground hover:text-amber flex items-center gap-1 px-2 py-1 rounded"
                    >
                      {copied === s.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 py-4 bg-background/40 text-sm leading-relaxed space-y-3">
                    {s.bullets.length > 0 && (
                      <ul className="space-y-2">
                        {s.bullets.map((b, i) => (
                          <li key={i} className="flex gap-2 text-foreground/90">
                            <span className="text-amber mt-1.5 shrink-0">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.script && (
                      <div className="rounded-md border border-amber/30 bg-amber/5 p-3 mt-2 relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                            {s.scriptLabel || "Script"}
                          </span>
                          <button
                            onClick={() => copy(s.script!, `${s.id}-script`)}
                            className="text-xs text-muted-foreground hover:text-amber flex items-center gap-1"
                          >
                            {copied === `${s.id}-script` ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        </div>
                        <p className="italic text-foreground/90 whitespace-pre-line">{s.script}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-md border border-amber/30 bg-amber/10 p-4 mt-3 flex items-start gap-3">
            <UserIcon className="w-4 h-4 text-amber mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">Tip for Braden:</span> the cleanest interviews follow this order — Company open → Systems → Pay → Bonuses → Culture filter → Objections → Close. If you only have 15 minutes, skip Systems and go straight from Pay to Bonuses to Close. The math closes them faster than the tech.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber" />
            Common Questions — Pre-Made Answers
            <Badge variant="outline" className="text-[10px] border-amber/40 text-amber ml-auto">{FAQS.length} answers</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            The questions every candidate asks. Pre-baked answers Braden can read or paraphrase. Click to expand, copy if you want it on your phone.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions..." className="pl-8 h-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              {TAGS.map(t => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={tag === t ? "default" : "outline"}
                  onClick={() => setTag(t)}
                  className="h-7 text-xs uppercase tracking-wider"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No questions match.</p>
            )}
            {filtered.map((f, i) => {
              const key = `faq-${f.tag}-${i}`;
              const isOpen = open[key];
              return (
                <div key={key} className="border border-border/50 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(p => ({ ...p, [key]: !p[key] }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0 uppercase border-amber/40 text-amber">{f.tag}</Badge>
                      <span className="text-sm font-medium truncate">"{f.q}"</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 bg-background/40 text-sm leading-relaxed">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Answer</span>
                        <button
                          onClick={() => copy(f.a, key)}
                          className="text-xs text-amber hover:underline flex items-center gap-1"
                        >
                          {copied === key ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </button>
                      </div>
                      <p className="whitespace-pre-line text-foreground/90">{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InterviewBriefingPanel;
