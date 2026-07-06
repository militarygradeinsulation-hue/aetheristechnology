import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Flame, Clock, Target, BookOpen, ExternalLink } from "lucide-react";
import { getPortalProfile } from "@/lib/portalAuth";

interface Task {
  id: string;
  label: string;
  detail?: string;
  route?: string;       // suggested website link to visit
  expand?: React.ReactNode; // deep-dive content shown when the task is expanded
}
interface Session { id: string; title: string; minutes: number; goal: string; tasks: Task[]; }
interface DayPlan { day: 1 | 2 | 3; theme: string; tagline: string; sessions: Session[]; }

// Reusable expand block primitives
const Block: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">{title}</div>
    <div className="text-[12px] text-foreground/90 leading-relaxed">{children}</div>
  </div>
);

const Bullets: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="space-y-1">
    {items.map((i, idx) => (
      <li key={idx} className="flex gap-2"><span className="text-amber">•</span><span>{i}</span></li>
    ))}
  </ul>
);

const PROGRAM: DayPlan[] = [
  {
    day: 1,
    theme: "Foundations · Who We Are, What We Sell",
    tagline: "By end of day: you can pitch the Leak Audit cold without a deck.",
    sessions: [
      {
        id: "d1-s1",
        title: "Morning · Company DNA",
        minutes: 90,
        goal: "Internalize positioning, tone, and the Forensic Operator identity.",
        tasks: [
          {
            id: "d1-s1-1",
            label: "Read the Brand Strategy doc end to end",
            detail: "Hook: 'Your business is leaking. You just can't see it from the inside.'",
            route: "/portal?tab=documents",
            expand: (
              <div className="space-y-3">
                <Block title="What we are">
                  Aetheris is a <strong>Chaos Theory Forensics</strong> firm. We are operators, not consultants, not influencers, not a marketing operator. We diagnose where a business is bleeding money, time, and attention — and then we seal the leaks.
                </Block>
                <Block title="The hook (memorize verbatim)">
                  "Your business is leaking. You just can't see it from the inside."
                </Block>
                <Block title="Our identity">
                  <Bullets items={[
                    "Forensic > influencer",
                    "Operator > consultant",
                    "Evidence > opinion",
                    "Diagnose first, then prescribe — never the other way around",
                  ]}/>
                </Block>
                <Block title="Tone of voice">
                  Aggressive, blunt, non-corporate. We don't hype. We name what's broken, show the receipts, and quote the fix.
                </Block>
              </div>
            ),
          },
          {
            id: "d1-s1-2",
            label: "Watch the Welcome onboarding module",
            route: "/portal?tab=onboarding",
            expand: (
              <Block title="What to listen for">
                <Bullets items={[
                  "How Joseph frames the company in the first 60 seconds",
                  "The 3-word identity: Forensic. Operator. Evidence.",
                  "The single sentence that ends every intro: 'We don't pitch — we diagnose.'",
                ]}/>
              </Block>
            ),
          },
          {
            id: "d1-s1-3",
            label: "Memorize the 1-line pitch + 30-second pitch",
            detail: "Practice out loud 5x. Forensic > influencer. Operator > consultant.",
            expand: (
              <div className="space-y-3">
                <Block title="1-line pitch">
                  "We're a business forensics firm — we find the money your business is leaking and seal it shut."
                </Block>
                <Block title="30-second pitch">
                  "Most owners I talk to feel something is off but can't name it. We run a Leak Audit — a 7-step forensic sweep across ops, sales, marketing, and finance — and hand you a 15-30 page report that names every leak in dollars. Flat $2,500, 21 days, applied toward whatever we fix together. No active case, no scope creep."
                </Block>
                <Block title="Drill">
                  Say it out loud 5x without looking. Then say it 3x to a real human. If they ask "what do you do?" and you stumble, repeat the drill.
                </Block>
              </div>
            ),
          },
          {
            id: "d1-s1-4",
            label: "List 3 things we will NEVER say",
            detail: "No 'AI Systems Architect', no 'Magic Robot', no influencer gradients.",
            expand: (
              <div className="space-y-3">
                <Block title="Forbidden vocabulary">
                  <Bullets items={[
                    "'AI Systems Architect' — we are operators, not titles",
                    "'Magic Robot' / 'wizard' / 'guru' — we're forensic, not mystical",
                    "'10x your revenue', 'crush it', 'unlock potential' — influencer noise",
                    "'Cutting-edge AI-powered solutions' — generic operator filler",
                    "Anything that sounds like a LinkedIn carousel",
                  ]}/>
                </Block>
                <Block title="What we say instead">
                  "We found three leaks costing you $X per month. Here's the seal."
                </Block>
              </div>
            ),
          },
        ],
      },
      {
        id: "d1-s2",
        title: "Midday · The Offer Stack",
        minutes: 75,
        goal: "Know every product, price, and what is included.",
        tasks: [
          {
            id: "d1-s2-1",
            label: "Memorize the Forensic Diagnostic ($2,500 flat, applied toward engagement)",
            expand: (
              <div className="space-y-3">
                <Block title="The offer">
                  <strong>Forensic Diagnostic — $2,500 flat.</strong> 21 calendar days, kickoff to sealed report. 15-30 page deliverable. Every dollar applied toward any engagement that follows.
                </Block>
                <Block title="What's included">
                  <Bullets items={[
                    "7-step Leak Audit across ops, sales, marketing, finance",
                    "Owner + key-staff interviews",
                    "Systems & data sweep (CRM, books, site analytics, ad accounts)",
                    "Forensic report naming every leak in dollars",
                    "Prioritized seal plan with ROI estimates",
                  ]}/>
                </Block>
                <Block title="Why $2,500">
                  Low enough to remove the 'should I?' friction. High enough that only serious owners book. Credited back the moment they engage — so it costs them nothing if they move forward.
                </Block>
                <Block title="One-liner close">
                  "It's $2,500, takes 21 days, and if we work together after, the whole thing comes off the first invoice. You either get a report worth keeping or a credit you'll use."
                </Block>
              </div>
            ),
          },
          {
            id: "d1-s2-2",
            label: "Memorize the $18k Diagnostic + $15k/mo Active Case flagship economics",
            expand: (
              <div className="space-y-3">
                <Block title="Flagship Diagnostic — $18,000 fixed">
                  Deep forensic engagement for $5M-$50M operators. Full systems rebuild plan + 90-day execution roadmap.
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">Split: Company $10k / Rep $5k / Partner $3k</div>
                </Block>
                <Block title="Flagship Active Case — $15,000 / month">
                  Ongoing operator partnership. Embedded forensic + execution muscle.
                  <div className="mt-2 font-mono text-[11px] text-muted-foreground">Split: Company $8k / Rep $4k / Partner $3k — EVERY month the client stays</div>
                </Block>
                <Block title="Why this matters to you">
                  One flagship close = $5k upfront + $4k/mo recurring. Three retained clients = $12k/mo personal recurring on top of new business.
                </Block>
              </div>
            ),
          },
          {
            id: "d1-s2-3",
            label: "Walk the Services page top to bottom",
            route: "/services",
            expand: (
              <Block title="What to study">
                <Bullets items={[
                  "How the Leak Audit is framed above the fold",
                  "The 7 steps of the methodology and the order they appear in",
                  "Which industries get called out by name",
                  "Where the $2,500 anchor is placed vs. the flagship pricing",
                ]}/>
              </Block>
            ),
          },
          {
            id: "d1-s2-4",
            label: "Run the free Leak Audit on yourself",
            route: "/leak-audit",
            expand: (
              <Block title="Why">
                You can't sell what you haven't felt. Run the free self-scan on your own freelance / side business / past employer. Notice which questions hit hardest — those are the same ones that will land with prospects.
              </Block>
            ),
          },
        ],
      },
      {
        id: "d1-s3",
        title: "Afternoon · Portal Tour + Clock In",
        minutes: 90,
        goal: "Operate the portal without a guide.",
        tasks: [
          { id: "d1-s3-1", label: "Log into the Rep Portal with your code", route: "/portal" },
          { id: "d1-s3-2", label: "Clock IN using the Rep Clock widget", route: "/portal?tab=home" },
          { id: "d1-s3-3", label: "Add 3 starter leads to the Leads Board", route: "/portal?tab=leads" },
          {
            id: "d1-s3-4",
            label: "Generate 1 AI Lead Game Plan from a real prospect URL",
            expand: (
              <Block title="How">
                Open Tools → All-In-One Generator. Paste a real prospect website URL. Read the full game plan it produces. Notice the leaks it surfaces — those become your talking points on the first call.
              </Block>
            ),
          },
          { id: "d1-s3-5", label: "Post a 'Day 1 done' note on the Team Message Board", route: "/portal?tab=messages" },
        ],
      },
      {
        id: "d1-s4",
        title: "End of Day · Quiz",
        minutes: 30,
        goal: "Verify retention.",
        tasks: [
          { id: "d1-s4-1", label: "Complete the Day 1 training quiz", route: "/portal?tab=training" },
          { id: "d1-s4-2", label: "Clock OUT" },
        ],
      },
    ],
  },
  {
    day: 2,
    theme: "Toolbelt · The Unfair Advantage",
    tagline: "By end of day: you can prep a prospect call in under 10 minutes.",
    sessions: [
      {
        id: "d2-s1",
        title: "Morning · The Tools Tab",
        minutes: 90,
        goal: "Master the All-In-One, Image Studio, and Playbook browser.",
        tasks: [
          {
            id: "d2-s1-1",
            label: "Run the All-In-One Generator on 3 different prospect URLs",
            route: "/portal?tab=tools",
            expand: (
              <Block title="What you're learning">
                <Bullets items={[
                  "How fast you can go from URL → talking points (target: under 5 min)",
                  "Which leaks the AI catches that you'd miss",
                  "How to translate AI output into a human-sounding opener",
                ]}/>
              </Block>
            ),
          },
          {
            id: "d2-s1-2",
            label: "Generate 2 branded prospect graphics in Image Studio",
            expand: (
              <Block title="Use case">
                Custom graphic in an outreach email = 3-5x reply rate. Make one for a specific prospect's site, attach it to your first email.
              </Block>
            ),
          },
          { id: "d2-s1-3", label: "Browse every category of the Playbook tab", route: "/portal?tab=playbook" },
          { id: "d2-s1-4", label: "Save your favorite playbook as a quick-reference note" },
        ],
      },
      {
        id: "d2-s2",
        title: "Midday · The AI Sales Coach",
        minutes: 60,
        goal: "Use the AI Coach as your second brain before every call.",
        tasks: [
          {
            id: "d2-s2-1",
            label: "Ask the Sales Coach 5 real objections you expect to hear",
            route: "/portal?tab=coach",
            expand: (
              <Block title="Starter objections to drill">
                <Bullets items={[
                  "'We already have someone doing this'",
                  "'$2,500 feels steep for an audit'",
                  "'Just send me a proposal'",
                  "'Can you do it for free first?'",
                  "'We're slammed right now — circle back in Q2'",
                ]}/>
              </Block>
            ),
          },
          { id: "d2-s2-2", label: "Ask it to draft a follow-up to a CFO who ghosted" },
          { id: "d2-s2-3", label: "Ask it for the Leak Audit pitch in <60 words" },
        ],
      },
      {
        id: "d2-s3",
        title: "Afternoon · Pipeline Discipline",
        minutes: 90,
        goal: "Forecast Center + Leads hygiene = trust with leadership.",
        tasks: [
          { id: "d2-s3-1", label: "Add 7 more leads with realistic amounts", route: "/portal?tab=leads" },
          { id: "d2-s3-2", label: "Move 2 leads through statuses (new → contacted → qualified)" },
          { id: "d2-s3-3", label: "Open the Forecast Center and review your weekly/monthly numbers", route: "/portal?tab=forecast" },
          { id: "d2-s3-4", label: "Make 10 outbound dials. Log every conversation as a lead." },
        ],
      },
      {
        id: "d2-s4",
        title: "End of Day · Quiz + Roleplay",
        minutes: 45,
        goal: "Pitch under pressure.",
        tasks: [
          { id: "d2-s4-1", label: "Complete the Day 2 training quiz", route: "/portal?tab=training" },
          { id: "d2-s4-2", label: "Roleplay the Leak Audit pitch with a partner or recording app" },
          { id: "d2-s4-3", label: "Clock OUT" },
        ],
      },
    ],
  },
  {
    day: 3,
    theme: "Live Reps · Pipeline + Close Mechanics",
    tagline: "By end of day: you've booked at least one real discovery call.",
    sessions: [
      {
        id: "d3-s1",
        title: "Morning · Cold Outreach Sprint",
        minutes: 120,
        goal: "Generate real pipeline using the playbook.",
        tasks: [
          { id: "d3-s1-1", label: "Use the All-In-One on 10 specialty manufacturer prospects ($5M-$25M revenue)" },
          { id: "d3-s1-2", label: "Send 25 personalized cold emails using AI Coach drafts" },
          { id: "d3-s1-3", label: "Make 25 outbound dials. Log every conversation." },
          { id: "d3-s1-4", label: "Add every conversation to Leads Board, even rejections", route: "/portal?tab=leads" },
        ],
      },
      {
        id: "d3-s2",
        title: "Midday · Objection Handling Lab",
        minutes: 75,
        goal: "Bullet-proof the top 5 objections.",
        tasks: [
          {
            id: "d3-s2-1",
            label: "Drill: 'We already have a marketing person'",
            expand: (
              <Block title="The reframe">
                "Perfect — we're not a marketing operator. We're forensics. We tell your marketing person exactly where their work is leaking and what to fix first. Think of us as the audit, not the replacement."
              </Block>
            ),
          },
          {
            id: "d3-s2-2",
            label: "Drill: 'Send me some info first'",
            expand: (
              <Block title="The reframe">
                "I could, but generic info is what got you ghosted by the last three vendors. Give me 15 minutes — I'll run a free mini-scan on your site live and you'll leave with 3 specific leaks named. Worst case, you've got free intel."
              </Block>
            ),
          },
          {
            id: "d3-s2-3",
            label: "Drill: 'It's too expensive'",
            expand: (
              <Block title="The reframe">
                "$2,500 is the Diagnostic — and every dollar comes off the first invoice if we work together. So it's either a report worth keeping, or a credit you'll use. What's actually expensive is another quarter not knowing where the money's going."
              </Block>
            ),
          },
          {
            id: "d3-s2-4",
            label: "Drill: 'We're not ready right now'",
            expand: (
              <Block title="The reframe">
                "Got it. Quick question — when you say 'not ready,' is it bandwidth, budget, or timing on a specific thing? Because the Audit is designed to run in the background — you don't lift a finger for 21 days."
              </Block>
            ),
          },
          {
            id: "d3-s2-5",
            label: "Drill: 'Just send the proposal'",
            expand: (
              <Block title="The reframe">
                "I don't send proposals before I've seen the leaks — it'd be guessing. Give me 20 minutes on a screen-share, I'll show you 3 specific things on your site and ops right now. Then if it's a fit, the proposal writes itself."
              </Block>
            ),
          },
        ],
      },
      {
        id: "d3-s3",
        title: "Afternoon · Commission Mechanics + Referrals",
        minutes: 60,
        goal: "Know exactly what you make and how to stack it.",
        tasks: [
          {
            id: "d3-s3-1",
            label: "Memorize fixed-dollar split: $18k Diagnostic = $5k Rep / $3k Partner / $10k Company",
            expand: (
              <Block title="What this means for you">
                Every flagship Diagnostic you close puts <strong>$5,000</strong> in your pocket. One close per month = $60k/yr from Diagnostics alone, before active cases stack.
              </Block>
            ),
          },
          {
            id: "d3-s3-2",
            label: "Memorize Active Case split: $15k/mo = $4k Rep / $3k Partner / $8k Company EVERY month",
            expand: (
              <Block title="The compounding math">
                <Bullets items={[
                  "1 retained client = $4,000/mo recurring",
                  "3 retained clients = $12,000/mo recurring ($144k/yr)",
                  "5 retained clients = $20,000/mo recurring ($240k/yr)",
                  "This stacks on top of new Diagnostic closes",
                ]}/>
              </Block>
            ),
          },
          { id: "d3-s3-3", label: "Read the Referral & Lead Generation Incentive Plan", route: "/portal?tab=incentive" },
          { id: "d3-s3-4", label: "Identify 3 people in your network you can ask for warm intros" },
        ],
      },
      {
        id: "d3-s4",
        title: "End of Day · Final Certification",
        minutes: 60,
        goal: "Graduate the bootcamp.",
        tasks: [
          { id: "d3-s4-1", label: "Complete the Day 3 training quiz", route: "/portal?tab=training" },
          { id: "d3-s4-2", label: "Submit at least 1 booked discovery call OR 5 qualified leads" },
          { id: "d3-s4-3", label: "Post a 'Bootcamp complete' note on the Team Board", route: "/portal?tab=messages" },
          { id: "d3-s4-4", label: "Clock OUT and start Week 2 with full pipeline" },
        ],
      },
    ],
  },
];

const ALL_TASK_IDS = PROGRAM.flatMap(d => d.sessions.flatMap(s => s.tasks.map(t => t.id)));

function storageKey(code: string | null) {
  return `aetheris_bootcamp_v1_${code || "anon"}`;
}

export const RepBootcamp3Day: React.FC = () => {
  const profile = getPortalProfile();
  const code = profile?.code || null;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openDay, setOpenDay] = useState<number>(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(code));
      if (raw) setDone(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [code]);

  const persist = (next: Record<string, boolean>) => {
    setDone(next);
    try { localStorage.setItem(storageKey(code), JSON.stringify(next)); } catch { /* ignore */ }
  };

  const toggle = (id: string) => persist({ ...done, [id]: !done[id] });
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const reset = () => { if (confirm("Reset all 3-day bootcamp progress?")) persist({}); };

  const completedCount = useMemo(() => ALL_TASK_IDS.filter(id => done[id]).length, [done]);
  const totalCount = ALL_TASK_IDS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  const dayCompletion = (d: DayPlan) => {
    const ids = d.sessions.flatMap(s => s.tasks.map(t => t.id));
    const c = ids.filter(id => done[id]).length;
    return { c, t: ids.length, pct: Math.round((c / ids.length) * 100) };
  };

  return (
    <Card className="border-amber/40 bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mb-1">Onboarding · Bootcamp</div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Flame className="w-5 h-5 text-amber" />
              3-Day Operator Bootcamp
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Everything you need in 72 hours. Check tasks off, tap <BookOpen className="inline w-3 h-3 -mt-0.5" /> to expand company knowledge, or follow the suggested links to act inside the portal.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Progress</div>
            <div className="text-2xl font-bold text-amber">{pct}%</div>
            <div className="text-xs text-muted-foreground">{completedCount} / {totalCount} tasks</div>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-3">
          <div className="h-full bg-amber transition-all" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROGRAM.map((day) => {
          const stats = dayCompletion(day);
          const open = openDay === day.day;
          const dayDone = stats.c === stats.t;
          return (
            <div key={day.day} className={`border rounded-lg overflow-hidden transition ${dayDone ? "border-emerald-500/40" : "border-border/60"}`}>
              <button
                type="button"
                onClick={() => setOpenDay(open ? 0 : day.day)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition"
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center font-bold flex-shrink-0 ${dayDone ? "bg-emerald-500/20 text-emerald-500" : "bg-amber/15 text-amber"}`}>
                  {dayDone ? <CheckCircle2 className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">Day {day.day}</span>
                    <span className="font-semibold">{day.theme}</span>
                    <Badge variant="outline" className="text-[10px]">{stats.c}/{stats.t}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{day.tagline}</p>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {open && (
                <div className="border-t border-border/60 bg-background/40 p-4 space-y-4">
                  {day.sessions.map((s) => (
                    <div key={s.id} className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-sm">{s.title}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {s.minutes} min</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Target className="w-3 h-3" /> {s.goal}</span>
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {s.tasks.map((t) => {
                          const checked = !!done[t.id];
                          const isExpanded = !!expanded[t.id];
                          return (
                            <div
                              key={t.id}
                              className={`rounded-md border transition ${
                                checked ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 hover:border-amber/30"
                              }`}
                            >
                              <div className="flex items-start gap-3 p-2">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggle(t.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>{t.label}</div>
                                  {t.detail && <div className="text-[11px] text-muted-foreground mt-0.5">{t.detail}</div>}
                                  {t.route && (
                                    <a
                                      href={t.route}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-[11px] text-amber hover:underline font-mono mt-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      suggested link → {t.route}
                                    </a>
                                  )}
                                </div>
                                {t.expand && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(t.id)}
                                    className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition ${
                                      isExpanded
                                        ? "border-amber/60 bg-amber/10 text-amber"
                                        : "border-border/50 text-muted-foreground hover:text-amber hover:border-amber/40"
                                    }`}
                                    aria-expanded={isExpanded}
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    {isExpanded ? "Hide" : "Expand"}
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                              {t.expand && isExpanded && (
                                <div className="border-t border-border/40 bg-background/60 px-3 py-3">
                                  {t.expand}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground hover:text-amber">
            Reset progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepBootcamp3Day;
