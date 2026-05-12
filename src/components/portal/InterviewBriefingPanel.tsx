import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HelpCircle, Copy, CheckCircle2, BookOpen, DollarSign, Users,
  Workflow, Cpu, Heart, Shield, User as UserIcon, Search, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Section = {
  id: string; title: string; icon: React.ComponentType<{ className?: string }>; body: string;
};

const SECTIONS: Section[] = [
  {
    id: "company", title: "Company open (90 seconds)", icon: BookOpen, body:
`We're Aetheris Technology — Business Forensics Operators based in Indianapolis. We don't sell "consulting" or "AI." We find the leaks inside a company — the silent places where revenue, time, and trust are bleeding out — and we plug them with operator-built systems.

Two flagship engagements: the $2,500 Forensic Diagnostic (applied toward the engagement) and the $15k/mo Operator Retainer. Founder is Joseph Toney (operator + builder). I'm Brandon — partner on the revenue side. You'd be working closes, not cold-dialing into a void.`,
  },
  {
    id: "systems", title: "What we actually do (the systems)", icon: Workflow, body:
`The Leak Audit™ — a 7-step forensic methodology that tears a business down to where money is escaping: lead leaks, follow-up leaks, pricing leaks, owner-overload leaks, dead-pipeline leaks. We instrument it with our own software (CRM mirror, hygiene engine, audit AI) so we can prove the bleed in dollars, not vibes.

Then we install the fix: scripts, automations, dashboards, follow-up sequences, hiring filters — whatever the leak demands. Operator-built, not slide-deck consulting.`,
  },
  {
    id: "pay", title: "Pay & commission (the math)", icon: DollarSign, body:
`Flagship splits are FIXED DOLLAR — not percentage games:
• $18k Forensic Diagnostic close → Company $10k / Rep $5k / Partner $3k
• $15k/mo Operator Retainer → Company $8k / Rep $4k / Partner $3k EVERY MONTH it stays active

So one retainer close pays the rep $4k recurring. Two retainers = $8k/mo. Five = $20k/mo recurring before bonuses.

Catalog products use tiered % (50/30/20 → 60/25/15 → 70/20/10 as volume grows).`,
  },
  {
    id: "bonuses", title: "Bonuses (stack on top of split)", icon: CheckCircle2, body:
`Volume bonus: +$1k at 2 sales/mo, +$2.5k at 3, +$5k at 5.
Retention bonus: +$1k / +$2.5k / +$5k at 3 / 6 / 12 month retainer extensions.
Referral bonus: $500 onboard + $7k first-close + $500/sale override for 12 months on every rep you bring in.
Webinar bonus: bring people to a webinar — if they buy, your commission % bumps automatically.`,
  },
  {
    id: "leads", title: "Leads (warm vs. cold)", icon: Users, body:
`We feed reps a daily drop of pre-scored inbound leads (Leak Audit submissions, scanner submissions, contact form, webinars). Each lead has an explainable score — you know WHY it's hot before you call.

You're closing inbound that already raised a hand. Cold prospecting is allowed and rewarded (referral bonus + webinar boost), but the daily drop is the engine.`,
  },
  {
    id: "process", title: "Sales process", icon: Workflow, body:
`1. Daily drop opens at 7am — work the top of the board first.
2. Discovery call → run the conversation through Sales Coach in your portal if you get stuck mid-call.
3. Pitch the Forensic Diagnostic ($2.5k) as the on-ramp. Closing the diagnostic closes the door — once they see the leaks priced in dollars, the retainer sells itself.
4. Hand-off to Joseph for delivery; you stay attached for renewal commission.`,
  },
  {
    id: "tech", title: "Tech / requirements", icon: Cpu, body:
`Laptop + reliable internet + a quiet place to take calls. Everything else lives in the portal: leads board, calendar, scripts, AI sales coach, training, commission ledger, time clock. We don't ask reps to buy software — the stack is provided.

1099 contractor. You set your hours; the leads system rewards consistency, not 9-to-5 theater.`,
  },
  {
    id: "culture", title: "Culture filter (who fits)", icon: Heart, body:
`We hire operators, not "sales personalities." Direct, blunt, allergic to fluff. If you need a manager standing over your shoulder, this isn't it. If you can run your own day, take ownership when something breaks, and tell a CEO the truth about their business — you'll thrive.

Red flags: trash-talking past employers, vague answers about why you left, can't articulate a number you closed, treats this like a side hustle.`,
  },
  {
    id: "objections", title: "Objection handling (candidate's objections)", icon: Shield, body:
`"Why 1099 and not W-2?" → Because the math works for both sides. $4k/mo recurring per retainer beats most W-2 OTEs once you stack 2-3.
"How do I know the leads are real?" → I'll show you live in the portal during onboarding. Every lead has a score and a paper trail.
"What if I don't close in month 1?" → We have a 60-day ramp. The ones who win in month 1 are usually the ones who've sold high-ticket consulting before. Most reps hit their stride in week 6-8.
"Why should I leave my current role?" → I'm not asking you to. Talk to 5 leads, close 1, and decide.`,
  },
  {
    id: "close", title: "Close the interview", icon: CheckCircle2, body:
`"Two questions for you to think about before our next call:
 1. Pick one number you've personally driven in the last 12 months and be ready to defend it.
 2. Tell me one process you'd want to break inside a company you joined — and why.
If those land, we move to a working session with Joseph. Sound fair?"`,
  },
];

type FAQ = { q: string; a: string; tag: string };
const FAQS: FAQ[] = [
  { tag: "Pay", q: "How does commission actually work?", a: "Fixed-dollar split on flagships. $18k Diagnostic → you get $5k. $15k/mo Retainer → you get $4k every month it stays active. Catalog products use tiered %. Bonuses stack on top." },
  { tag: "Pay", q: "1099 or W-2?", a: "1099 contractor. You set your own hours. The portal tracks everything — clock-in, leads worked, commission ledger — so you always know exactly where you stand." },
  { tag: "Pay", q: "When do I get paid?", a: "Commission lands within 7 days of the customer's payment clearing. Retainer commission pays monthly on the same cycle as the customer's invoice." },
  { tag: "Leads", q: "Where do leads come from?", a: "Inbound: Leak Audit submissions, free website scanner, contact forms, webinar registrations, and referral traffic. Each rep gets a daily drop of pre-scored leads in the portal at 7am." },
  { tag: "Leads", q: "Will I have to cold-call?", a: "Not required. Outbound is allowed and rewarded (referral bonus + webinar attendees boost your %). But the engine is the inbound daily drop." },
  { tag: "Process", q: "What's the sales process?", a: "Discovery call → pitch the $2.5k Forensic Diagnostic as the entry → Joseph delivers the diagnostic → that report sells the $15k/mo retainer. You stay attached for renewal commission." },
  { tag: "Process", q: "What's the ramp?", a: "60 days. Most reps hit their stride in week 6-8. The portal has a sales coach, scripts, training modules, and an AI assistant that pulls live company data so you're never flying blind." },
  { tag: "Tech", q: "What tools do I need?", a: "Laptop, reliable internet, quiet space for calls. Everything else (CRM, leads, scripts, calendar, training, AI coach) is in the portal. We don't ask reps to buy software." },
  { tag: "Tech", q: "Do I need sales experience?", a: "Yes — preferably high-ticket B2B or consulting. We're not the right fit for someone learning sales for the first time. We hire operators." },
  { tag: "Culture", q: "What's the culture?", a: "Direct, blunt, operator-led. No micromanagement. We expect you to run your own day, tell the truth, and own your numbers. If you need hand-holding, this isn't the right seat." },
  { tag: "Objections", q: "Why should I leave my current role?", a: "Don't yet. Talk to 5 leads, close 1, and decide based on the math — not the pitch." },
  { tag: "Personal", q: "Who's Joseph? Who's Brandon?", a: "Joseph Toney is the founder and operator — builder, technical, runs delivery. I'm Brandon — partner on the revenue side. You'd report to me on sales motion and to Joseph on delivery hand-off." },
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Card className="border-amber/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mr-2">Case File</span>
            Interview Briefing
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Read top to bottom before any interview. Each section is copy-paste-ready — read it word-for-word, paraphrase, or pull lines on demand.
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
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-amber" />
                    <span className="font-semibold text-sm">{s.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); copy(s.body, s.id); }}
                      className="text-xs text-muted-foreground hover:text-amber flex items-center gap-1 px-2 py-1 rounded"
                    >
                      {copied === s.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 py-3 bg-background/40 text-sm whitespace-pre-line leading-relaxed text-foreground/90">
                    {s.body}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-md border border-amber/30 bg-amber/10 p-4 mt-3 flex items-start gap-3">
            <UserIcon className="w-4 h-4 text-amber mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">Tip for Brandon:</span> the cleanest interviews follow this order — Company open → Systems → Pay → Bonuses → Culture filter → Objections → Close. If you only have 15 minutes, skip Systems and go straight from Pay to Bonuses to Close. The math closes them faster than the tech.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber/40 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber" />
            Common Questions — Pre-Made Answers
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            12 baked answers for the questions candidates always ask. Filter, search, copy, paste into a text or read it off your phone mid-interview.
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
                  className="h-7 text-xs"
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
              const key = `faq-${i}`;
              const isOpen = open[key];
              return (
                <div key={key} className="border border-border/50 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen(p => ({ ...p, [key]: !p[key] }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">{f.tag}</Badge>
                      <span className="text-sm font-medium truncate">{f.q}</span>
                    </div>
                    {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 bg-background/40 text-sm leading-relaxed">
                      <p className="whitespace-pre-line text-foreground/90">{f.a}</p>
                      <button
                        onClick={() => copy(f.a, key)}
                        className="mt-2 text-xs text-amber hover:underline flex items-center gap-1"
                      >
                        {copied === key ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy answer
                      </button>
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
