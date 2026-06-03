import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, BookOpenCheck, Mic, DollarSign, Target, ShieldAlert, Sparkles, Briefcase, Phone, MessageSquare } from "lucide-react";

interface ScriptBlock {
  id: string;
  title: string;
  icon: any;
  duration: string;
  goal: string;
  say: string;        // verbatim script to read aloud
  beats: string[];    // talking points / beats to hit
  followUp?: string;  // what to ask them after this block
}

interface ScriptSection {
  id: string;
  label: string;
  icon: any;
  intro: string;
  blocks: ScriptBlock[];
}

const SECTIONS: ScriptSection[] = [
  {
    id: "welcome",
    label: "Day 1 — Welcome & Identity",
    icon: Sparkles,
    intro: "Read this on the kickoff call. Set the tone in the first 10 minutes. No fluff. No corporate voice.",
    blocks: [
      {
        id: "open",
        title: "Opening — who we are",
        icon: Mic,
        duration: "2 min",
        goal: "Anchor them to the mission so every call they make later has weight behind it.",
        say:
`Welcome aboard. Here's the deal before anything else.

We are not consultants. We are not an agency. We are not "AI experts."

We are Business Forensics Operators. Our job is to walk into a business, find where it's leaking money, time, and trust — and seal those leaks before the owner loses another quarter.

Our positioning is simple: "Your business is leaking. You just can't see it from the inside." That is the only sentence you ever need to memorize. Everything we sell flows from that one truth.

The methodology is called The Leak Audit. Seven steps. It's how we diagnose. It's how we earn the room. It's how we close.

You are not selling software. You are not selling hours. You are selling a forensic diagnosis that no one in their industry can deliver the way we do. Carry yourself that way.`,
        beats: [
          "We are operators, not consultants",
          "One-line hook: 'Your business is leaking…'",
          "Methodology = The Leak Audit (7 steps)",
          "They sell a diagnosis, not deliverables",
        ],
        followUp: "Ask them: 'In your own words, what do we do?' Make them repeat it back before moving on.",
      },
      {
        id: "why-you",
        title: "Why you were hired",
        icon: Target,
        duration: "2 min",
        goal: "Make them feel chosen, not onboarded.",
        say:
`I didn't hire you to dial. I have software for that.

I hired you because somewhere in your background you've already done the thing most people are scared of — you've sat across from someone with money and asked them to make a decision. That's the muscle we're building.

The first 30 days, your only job is to learn the language. Not the product. The language. Once you can speak like an operator, the close becomes the easiest part of the day.

If at any point I'm not giving you what you need to win, you tell me. We do not have a hierarchy problem here. We have a results problem to avoid.`,
        beats: [
          "Frame the role: operator, not dialer",
          "First 30 days = language fluency",
          "Open-door rule: speak up fast",
        ],
        followUp: "Ask: 'What's the one thing in your last job you wish you'd been told on day one?' Note their answer.",
      },
    ],
  },
  {
    id: "product",
    label: "Product & Pricing Walkthrough",
    icon: Briefcase,
    intro: "Walk them through what we sell and what they earn on it. Open the rep portal alongside this section.",
    blocks: [
      {
        id: "leak-audit-free",
        title: "The Free Leak Audit (the front door)",
        icon: Target,
        duration: "3 min",
        goal: "Show them the lead magnet so they know the conversation their prospects have already had with us.",
        say:
`Every prospect you call has either taken — or been offered — the Free Leak Audit at aetheris.technology/leak-audit.

It's a self-scan. 90 seconds. They get a number back. That number is almost always uncomfortable.

Your job on the call is not to convince them they're leaking. The audit already did that. Your job is to tell them what to do about it.

The free audit is the bait. The Forensic Diagnostic is the hook. The retainer is the catch.`,
        beats: [
          "Free audit lives at /leak-audit",
          "Audit creates the discomfort — you don't have to",
          "Funnel: free audit → diagnostic → retainer",
        ],
      },
      {
        id: "diagnostic",
        title: "The Forensic Diagnostic — $2,500",
        icon: DollarSign,
        duration: "3 min",
        goal: "Make them confident quoting the diagnostic without flinching.",
        say:
`This is your most popular sale. $2,500 flat. No hourly. No scope creep.

It is a 21-day, operator-led forensic dig into one business. They get a sealed 15-to-30-page report at the end. Every dollar of the $2,500 is credited back if they move into a retainer.

When you quote it, you quote it like you'd quote a CT scan. "It's twenty-five hundred. That's how we find what's actually wrong before anyone writes a treatment plan." Then stop talking.

If they balk at $2,500, you are not talking to a buyer. You're talking to a tire-kicker. Disqualify and move on.`,
        beats: [
          "$2,500 flat, 21 days, sealed report",
          "Fully credited toward a retainer",
          "Quote it flat — no apology, no discount",
          "$2,500 objection = disqualifier",
        ],
        followUp: "Roleplay: 'Quote me the diagnostic right now.' Make them do it three times.",
      },
      {
        id: "flagship",
        title: "Flagships — $18k Diagnostic & $15k Retainer",
        icon: Briefcase,
        duration: "4 min",
        goal: "Get them excited about the upmarket numbers without skipping the small-ticket reps.",
        say:
`We also run two flagship engagements:

The $18,000 Forensic Diagnostic — same methodology, but at enterprise depth. The split is fixed: $10k to the company, $5k to you as the rep, $3k to the partner.

And the $15,000/month Retainer — ongoing operator presence. The split is $8k company, $4k rep, $3k partner — every single month it renews.

That retainer is the prize. One $15k retainer pays you $4,000 a month for as long as it lives. Three of those and you don't need anything else.

But — and write this down — flagship deals come from disciplined $2,500 diagnostics. Skip the small ticket and you'll starve waiting for whales.`,
        beats: [
          "$18k diagnostic split: $10k / $5k / $3k",
          "$15k retainer split: $8k / $4k / $3k MONTHLY",
          "Flagships are earned by closing diagnostics first",
        ],
        followUp: "Show them the Commissions tab in the portal. Have them calculate what 2 retainers + 1 diagnostic pays them in a month.",
      },
      {
        id: "bonuses",
        title: "Bonuses & Referrals",
        icon: DollarSign,
        duration: "2 min",
        goal: "Plant the bonus structure early so they chase it from week one.",
        say:
`On top of splits, you have three bonus ladders.

Volume: hit 2 sales in a month, +$1,000. Three sales, +$2,500. Five, +$5,000.

Retention: any client you brought in who renews — at 3 months, +$1,000; 6 months, +$2,500; 12 months, +$5,000.

Referral: send me a rep candidate who gets hired — $500 the day they onboard. Their first close — $7,000 to you. Then $500 override on every sale they make for 12 months.

If you bring me one good rep this quarter, you have built yourself a passive line of income.`,
        beats: [
          "Volume bonuses: +$1k / +$2.5k / +$5k",
          "Retention bonuses: +$1k / +$2.5k / +$5k",
          "Referral: $500 + $7k + $500/sale for 12mo",
        ],
      },
    ],
  },
  {
    id: "daily",
    label: "Daily Operating Rhythm",
    icon: Phone,
    intro: "How they actually win the day. Read this last on Day 1 so it's the most recent thing in their head when they hang up.",
    blocks: [
      {
        id: "rhythm",
        title: "The non-negotiable daily rhythm",
        icon: Phone,
        duration: "3 min",
        goal: "Anchor the activity floor before any excuses can build.",
        say:
`Here's what every day looks like, Monday through Friday:

Morning: clock in on the portal. Review your three priority leads in the workspace. Watch the daily idea-of-the-day — it's 90 seconds and it almost always reframes something useful.

Block one (90 minutes, before noon): outbound. Dials, walk-ins, or DMs. No email. Email is for after lunch.

Lunch debrief at 12:30 in the team thread. One sentence: what worked, what didn't.

Afternoon: follow-ups, proposals, and discovery calls. This is when the diagnostic closes happen — not in the morning.

End of day: clock out. Log every conversation in the CRM. If it's not in the CRM, it didn't happen.

Miss the rhythm two days in a row and we have a conversation. Miss it three and we have a different conversation.`,
        beats: [
          "Clock in via portal",
          "AM = outbound only",
          "PM = follow-ups, closes, proposals",
          "Every conversation logged in CRM",
        ],
      },
      {
        id: "messaging",
        title: "How to open every call",
        icon: MessageSquare,
        duration: "2 min",
        goal: "Give them a forensic cold open they can use within an hour.",
        say:
`Your cold open is not "Hey, do you have a minute?" That gets you hung up on.

Your cold open is: "This is [name] with Aetheris. I ran a forensic scan on your business this morning. There's something in your numbers I want to ask you about — do you have ninety seconds?"

That is not a script. That is a posture. You walked in already having done work. You are not asking for time — you are returning findings.

If they say yes, you ask one diagnostic question and shut up. The diagnostic question is whatever the audit surfaced. If you don't have an audit on them yet, you ask: "If I told you most businesses in [their industry] are losing about $40,000 a year to a single broken handoff — would you bet you're the exception, or would you want to know for sure?"

Then you stop talking. Whoever talks first loses.`,
        beats: [
          "Open with 'I ran a forensic scan…'",
          "Posture: returning findings, not asking for time",
          "One diagnostic question, then silence",
        ],
        followUp: "Roleplay the cold open 5 times. Don't let them off the call until it sounds natural.",
      },
    ],
  },
  {
    id: "objections",
    label: "Objection Handling",
    icon: ShieldAlert,
    intro: "The four objections they will hear in their first 50 calls. Drill these until the responses are reflex.",
    blocks: [
      {
        id: "too-expensive",
        title: "'$2,500 is too expensive'",
        icon: ShieldAlert,
        duration: "1 min",
        goal: "Reframe price as proof of seriousness, not a barrier.",
        say:
`"I hear you. Real quick — the diagnostic isn't priced to fit a budget, it's priced to filter the room. If twenty-five hundred to find out where you're hemorrhaging six figures feels expensive, you're probably not leaking enough yet for us to help. That's a fine answer. Want me to send the free self-scan instead and we'll talk in ninety days?"`,
        beats: [
          "Don't defend the price",
          "Reframe as a filter, not a cost",
          "Offer the free scan as graceful exit",
        ],
      },
      {
        id: "send-info",
        title: "'Just send me some info'",
        icon: ShieldAlert,
        duration: "1 min",
        goal: "Refuse the brochure trap without burning the lead.",
        say:
`"I don't actually send brochures — we'd both waste a week. What I'll do instead: I'll run a 90-second forensic scan on your public footprint right now while we're on the phone, and tell you the top three leaks I see. If it's interesting, we book the diagnostic. If it's not, I'll buy you back the two minutes. Fair?"`,
        beats: [
          "Never agree to 'send info'",
          "Offer a live mini-audit instead",
          "Frame it as fair exchange of 2 minutes",
        ],
      },
      {
        id: "not-now",
        title: "'Not the right time'",
        icon: ShieldAlert,
        duration: "1 min",
        goal: "Pin a specific follow-up before they hang up.",
        say:
`"Totally fair. Quick question — is 'not now' because the year is loud, or because what I described doesn't match what's actually broken? If it's the first, I'll loop back in 30 days. If it's the second, tell me what is broken and I'll tell you straight up whether we're the right call or not."`,
        beats: [
          "Force a real reason out of them",
          "Lock a 30-day callback",
          "Stay calm — no chase energy",
        ],
      },
      {
        id: "have-consultant",
        title: "'We already have a consultant'",
        icon: ShieldAlert,
        duration: "1 min",
        goal: "Differentiate without slandering competitors.",
        say:
`"Good — most operators I respect have one. We're not the consultant. We're the second opinion. Consultants build plans; we run forensics on whether the plan is actually working. If yours is producing the numbers you want, we're noise. If you're not sure — that's exactly the gap the diagnostic fills. Worth a 15-minute scoping call?"`,
        beats: [
          "Position as second opinion, not replacement",
          "Don't slander the existing consultant",
          "Ask for 15-min scoping, not a sale",
        ],
      },
    ],
  },
  {
    id: "close",
    label: "Closing the Kickoff",
    icon: BookOpenCheck,
    intro: "How you end Day 1 so they leave fired up instead of overwhelmed.",
    blocks: [
      {
        id: "wrap",
        title: "The Day-1 close",
        icon: BookOpenCheck,
        duration: "2 min",
        goal: "Set the next 48 hours so they don't go cold.",
        say:
`Here's what happens next.

By end of day tomorrow, I want you logged into the portal and through onboarding modules 1 and 2. Should take you under two hours total.

By Friday, I want one diagnostic question asked to a real prospect — not a friend, not a relative, a real lead from the workspace. Doesn't matter if it goes anywhere. I just want the first rep on the board.

Daily standup is 10 minutes, Monday through Friday. Numbers, blockers, one win. That's it.

Last thing: every operator I've ever hired has hit one wall around day 9 to 14. They feel like they don't know enough, the calls are awkward, the no's stack up. I'm telling you now so when it happens you recognize it for what it is — not a sign you're failing, a sign you're crossing the threshold. Push through that week and the second month is a different job.

Welcome in. Let's go to work.`,
        beats: [
          "48-hour checkpoint: portal + modules 1–2",
          "Friday checkpoint: 1 real diagnostic question asked",
          "Pre-warn the day-9-to-14 wall",
          "Close strong — 'let's go to work'",
        ],
      },
    ],
  },
];

const HireBlueprintScript: React.FC = () => {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  const active = useMemo(() => SECTIONS.find(s => s.id === activeId) || SECTIONS[0], [activeId]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Select the text manually.", variant: "destructive" });
    }
  };

  const copyFullSection = () => {
    const full = active.blocks
      .map(b => `## ${b.title}  (${b.duration})\nGoal: ${b.goal}\n\n${b.say}\n\nKey beats:\n${b.beats.map(x => `• ${x}`).join("\n")}${b.followUp ? `\n\nFollow-up: ${b.followUp}` : ""}`)
      .join("\n\n---\n\n");
    copy(`# ${active.label}\n\n${active.intro}\n\n${full}`, active.label);
  };

  const copyEverything = () => {
    const all = SECTIONS.map(s => {
      const body = s.blocks
        .map(b => `## ${b.title}  (${b.duration})\nGoal: ${b.goal}\n\n${b.say}\n\nKey beats:\n${b.beats.map(x => `• ${x}`).join("\n")}${b.followUp ? `\n\nFollow-up: ${b.followUp}` : ""}`)
        .join("\n\n---\n\n");
      return `# ${s.label}\n\n${s.intro}\n\n${body}`;
    }).join("\n\n========================================\n\n");
    copy(all, "Full new-hire blueprint");
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-amber/10 via-card/60 to-card/60 border-amber/40">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="w-4 h-4 text-amber" /> New-Hire Blueprint — Talking Script
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">
                Five sections, ~25 minutes total. Read aloud verbatim on the Day-1 kickoff call. Every block has a goal, a script,
                the beats you must hit, and (often) a follow-up question to test retention.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copyEverything} className="gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy entire blueprint
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs transition-colors ${
                isActive
                  ? "bg-amber/15 border-amber/60 text-foreground"
                  : "bg-card/60 border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <Card className="bg-card/60 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <active.icon className="w-4 h-4 text-amber" /> {active.label}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">{active.intro}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={copyFullSection} className="gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy section
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {active.blocks.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div key={b.id} className="rounded-lg border border-border/60 bg-background/40 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-card/40 border-b border-border/40 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-muted-foreground font-mono text-xs">{String(idx + 1).padStart(2, "0")}</span>
                    <Icon className="w-3.5 h-3.5 text-amber" />
                    {b.title}
                    <Badge variant="outline" className="ml-1 text-[10px] font-mono">{b.duration}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={() => copy(b.say, b.title)}
                  >
                    <Copy className="w-3 h-3" /> Copy script
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="text-amber font-semibold">Goal:</span> {b.goal}
                  </div>

                  <div className="rounded-md bg-background/60 border border-border/60 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">Read aloud</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif">{b.say}</p>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-mono">Key beats</div>
                    <ul className="space-y-1">
                      {b.beats.map((beat, i) => (
                        <li key={i} className="text-xs text-foreground/90 flex items-start gap-2">
                          <span className="text-amber mt-0.5">▸</span>
                          <span>{beat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {b.followUp && (
                    <div className="rounded-md bg-amber/5 border border-amber/30 px-3 py-2 text-xs">
                      <span className="text-amber font-semibold">After this block: </span>
                      <span className="text-foreground/90">{b.followUp}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default HireBlueprintScript;
