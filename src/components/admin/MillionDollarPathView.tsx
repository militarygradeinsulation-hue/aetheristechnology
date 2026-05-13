import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, TrendingUp, Phone, Calendar, FileText, DollarSign, Users, AlertTriangle, CheckCircle2, Flame, Sparkles } from "lucide-react";
import { buildScenario, buildWeeks, OFFERS, FUNNEL, MDP_GOAL_CENTS } from "@/lib/millionDollarPath";
import { OfferStackSection, TargetMarketSection, OutreachSection, SalesProcessSection, TrainingMatrixSection, KpiScoreboardSection } from "@/components/admin/WarPlanSections";
import { upsertCompanyEntry } from "@/lib/companyCalendar";
import { toast } from "@/hooks/use-toast";
import { CalendarPlus, Loader2 } from "lucide-react";

const fmt = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;
const fmtBig = (cents: number) => `$${(cents / 100_000).toFixed(0)}k`;

const STORAGE_KEY = "hires.mdp.done";

export const MillionDollarPathView: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState(30);
  const [retainers, setRetainers] = useState(18);
  const [recurringMonths, setRecurringMonths] = useState(14);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const toggle = (k: string) => setDone(s => {
    const next = { ...s, [k]: !s[k] }; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); return next;
  });

  const scenario = useMemo(() => buildScenario({ diagnostics, retainers, recurringMonths }),
    [diagnostics, retainers, recurringMonths]);
  const weeks = useMemo(() => buildWeeks(), []);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pushing, setPushing] = useState(false);

  const pushToCalendar = async () => {
    setPushing(true);
    let ok = 0; let failed = 0;
    const start = new Date(`${startDate}T12:00:00`);
    // Anchor to the Monday of the start week
    const dow = start.getDay(); // 0 Sun..6 Sat
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    start.setDate(start.getDate() + mondayOffset);

    // Goal anchor
    try {
      await upsertCompanyEntry({
        date: startDate,
        kind: "goal",
        title: `🎯 $1M in 90 Days — Sprint Begins`,
        body: `Target: $1,000,000 gross in 90 days.\nMix: ${diagnostics} Diagnostics + ${retainers} Retainers (mo1) + ${recurringMonths} recurring retainer-months.\nTeam-wide outbound floor: ${scenario.outboundPerDay}/day. Meetings: ~${scenario.meetingsPerWeek}/week.`,
        pinned: true,
        color: "cat:kickoff_90day",
        ai_plan: {
          summary: "$1M in 90 days operator sprint kickoff.",
          tactics: [`${scenario.outboundPerDay}/day outbound team-wide`, `${scenario.meetingsPerWeek} meetings/week`, `${scenario.proposalsNeeded} proposals to send`, `${scenario.diagnosticsToClose + scenario.retainersToClose} closes needed`],
          kpis: [`$${(MDP_GOAL_CENTS/100000).toFixed(0)}k gross`, `${scenario.diagnosticsToClose} Diagnostics closed`, `${scenario.retainersToClose} Retainers closed`],
        },
      });
      ok++;
    } catch { failed++; }

    // Weekly entries on Monday of each week
    for (const w of weeks) {
      const d = new Date(start);
      d.setDate(d.getDate() + (w.week - 1) * 7);
      const date = d.toISOString().slice(0, 10);
      const phaseEmoji = w.phase === "Foundation" ? "🧱" : w.phase === "Acceleration" ? "🚀" : "💎";
      const kind = w.phase === "Acceleration" ? "push" : "goal";
      const body = [
        `Phase: ${w.phase} · Theme: ${w.theme}`,
        `Cumulative target by end of week: $${Math.round(w.revenueTarget/100).toLocaleString()}`,
        `Targets: ${w.newMeetings} new meetings · ${w.newCloses} new closes · ${w.hires} reps on the bench`,
        ``,
        `Focus:`,
        ...w.focus.map(f => `• ${f}`),
        ``,
        `Exit criteria: ${w.exitCriteria}`,
      ].join("\n");
      try {
        await upsertCompanyEntry({
          date,
          kind: kind as never,
          title: `${phaseEmoji} Week ${w.week} · ${w.theme}`,
          body,
          color: w.phase === "Foundation" ? "#F2A623" : w.phase === "Acceleration" ? "#DC2626" : "#10B981",
          ai_plan: {
            summary: `Week ${w.week} of $1M sprint — ${w.phase}.`,
            tactics: w.focus,
            kpis: [`$${Math.round(w.revenueTarget/100).toLocaleString()} cumulative`, `${w.newMeetings} new meetings`, `${w.newCloses} new closes`],
          },
        });
        ok++;
      } catch { failed++; }
    }

    setPushing(false);
    toast({
      title: failed === 0 ? "Pushed to Company Calendar" : "Pushed with some errors",
      description: `${ok} entries created${failed ? `, ${failed} failed` : ""}. Sprint kickoff + 13 weekly milestones, anchored to Monday ${start.toISOString().slice(0,10)}.`,
      variant: failed === 0 ? "default" : "destructive",
    });
  };
  const onPace = scenario.grossRevenue >= MDP_GOAL_CENTS;

  // Today’s position in the 90 days (rough — uses week 1 as anchor of NOW)
  // Operator can use the weekly checkboxes to mark themselves "current"
  const completedWeeks = weeks.filter(w => done[`week:${w.week}`]).length;
  const cumulativeAchieved = completedWeeks > 0 ? weeks[completedWeeks - 1].revenueTarget : 0;
  const overallPct = Math.min(100, Math.round((cumulativeAchieved / MDP_GOAL_CENTS) * 100));

  return (
    <div className="space-y-6">
      {/* THE GOAL */}
      <Card className="bg-gradient-to-br from-amber/10 via-card/60 to-destructive/5 border-amber/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber font-mono mb-1">The Operator Sprint</div>
              <CardTitle className="text-2xl md:text-3xl font-forensic flex items-center gap-2">
                <Flame className="w-6 h-6 text-destructive" />
                $1,000,000 in 90 Days
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                This is not a vibe. This is the math. Below is exactly what has to happen each week, who owns it, and how
                many calls must hit the dial. Adjust the offer mix; the funnel updates live.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">Cumulative collected</div>
              <div className="text-2xl font-forensic text-amber">{fmt(cumulativeAchieved)}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{overallPct}% of $1M</div>
              <Progress value={overallPct} className="w-44 h-2 mt-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-amber/30 bg-background/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <CalendarPlus className="w-5 h-5 text-amber shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">Push the 90-day plan to the Company Calendar</div>
              <div className="text-xs text-muted-foreground">Drops the kickoff goal + all 13 weekly milestones (focus list, targets, exit criteria) onto everyone's calendar so the whole team stays on track.</div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[150px] bg-background/60 border-border/60 text-xs"
              />
              <Button onClick={pushToCalendar} disabled={pushing} size="sm" className="bg-amber hover:bg-amber/90 text-background font-bold whitespace-nowrap">
                {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                <span className="ml-1.5">{pushing ? "Pushing…" : "Push to Calendar"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MATH MODEL */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-amber" /> The Math · Adjust the Mix
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Default: 30 Diagnostics + 18 Retainers (mo1) + 14 retainer-months recurring inside the 90 days. Change anything.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <MixInput label="Diagnostics ($18k each)" value={diagnostics} onChange={setDiagnostics} />
            <MixInput label="Retainers (mo 1, $15k)"   value={retainers}   onChange={setRetainers} />
            <MixInput label="Recurring months ($15k)"  value={recurringMonths} onChange={setRecurringMonths} />
          </div>

          <div className={`rounded-md border p-4 ${onPace ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm">
                {onPace ? <CheckCircle2 className="w-4 h-4 text-emerald-500 inline mr-2" /> : <AlertTriangle className="w-4 h-4 text-destructive inline mr-2" />}
                Projected gross: <strong className="text-amber">{fmt(scenario.grossRevenue)}</strong>
              </div>
              <Badge variant="outline" className={`font-mono text-[10px] ${onPace ? "border-emerald-500/50 text-emerald-500" : "border-destructive/50 text-destructive"}`}>
                {onPace ? "ON PACE" : "BELOW $1M"}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <FunnelStat icon={DollarSign} label="Closes needed" value={`${scenario.diagnosticsToClose + scenario.retainersToClose}`} sub="Diagnostic + Retainer" />
            <FunnelStat icon={FileText}   label="Proposals to send" value={`${scenario.proposalsNeeded}`} sub={`@ ${(FUNNEL.proposalToClose * 100).toFixed(0)}% close`} />
            <FunnelStat icon={Calendar}   label="Meetings to run"   value={`${scenario.meetingsNeeded}`} sub={`~${scenario.meetingsPerWeek}/week`} />
            <FunnelStat icon={Phone}      label="Outbound touches"  value={`${scenario.outboundNeeded.toLocaleString()}`} sub={`~${scenario.outboundPerDay}/day team-wide`} />
          </div>

          <div className="rounded-md border border-border/60 p-3 bg-muted/10 text-xs text-muted-foreground space-y-1">
            <div><strong className="text-foreground">Funnel assumptions</strong> (edit in <code className="font-mono">millionDollarPath.ts</code>):</div>
            <div>• {(FUNNEL.outboundToConvo * 100).toFixed(0)}% outbound → conversation</div>
            <div>• {(FUNNEL.convoToMeeting * 100).toFixed(0)}% conversation → meeting</div>
            <div>• {(FUNNEL.meetingToProposal * 100).toFixed(0)}% meeting → proposal</div>
            <div>• {(FUNNEL.proposalToClose * 100).toFixed(0)}% proposal → close</div>
          </div>
        </CardContent>
      </Card>

      {/* ROLE LOAD */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-amber" /> Who Does What — Daily Floors
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <RoleCard role="Joseph (Operator)" tone="amber" lines={[
            "2 standups/day (8am + 4pm, ≤10 min)",
            "10 partnership outreaches/week",
            "Personally close every deal >$25k",
            "1:1 with each rep weekly",
            "Public LinkedIn post 5x/week",
          ]} />
          <RoleCard role="Brandon (Partner)" tone="amber" lines={[
            "Shadow every proposal call wk 1-4",
            "Daily 4pm close-call wk 8-13",
            "Own CRM hygiene + commission payouts",
            "Codify won-deal debriefs weekly",
            "Hire pipeline always 2 reps deep",
          ]} />
          <RoleCard role="Each Rep" tone="amber" lines={[
            `${scenario.outboundPerDay >= 60 ? "60+" : `${Math.max(40, Math.ceil(scenario.outboundPerDay / 10))}+`}/day outbound (call+LI+email)`,
            "3 booked meetings/day floor by wk 5",
            "Clock in via portal — partners see efficiency",
            "Update every lead in portal same-day",
            "Use AI Coach before every important call",
          ]} />
        </CardContent>
      </Card>

      {/* WAR PLAN — Operational Sections (offers, ICP, scripts, sales, training) */}
      <OfferStackSection />
      <TargetMarketSection />
      <OutreachSection />
      <SalesProcessSection />
      <TrainingMatrixSection />


      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber" /> Week-by-Week · 13 Weeks to $1M
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Check off each week as you finish it. Cumulative target updates above.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {weeks.map(w => {
            const k = `week:${w.week}`;
            const isDone = !!done[k];
            const phaseColor = w.phase === "Foundation" ? "border-amber/40 bg-amber/5"
              : w.phase === "Acceleration" ? "border-destructive/40 bg-destructive/5"
              : "border-emerald-500/40 bg-emerald-500/5";
            return (
              <div key={w.week} className={`rounded-md border p-4 ${phaseColor} ${isDone ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggle(k)}
                      className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isDone ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground"}`}
                      aria-label={`Mark week ${w.week} complete`}
                    >
                      {isDone && <CheckCircle2 className="w-4 h-4 text-background" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">{w.phase}</Badge>
                        <div className="font-forensic text-lg">Week {w.week}</div>
                        <div className={`text-sm text-muted-foreground ${isDone ? "line-through" : ""}`}>· {w.theme}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-1">
                        Target: <span className="text-amber">{fmtBig(w.revenueTarget)}</span> cumulative
                        · {w.newMeetings} new meetings · {w.newCloses} closes · {w.hires} reps on staff
                      </div>
                    </div>
                  </div>
                </div>
                <ol className="space-y-1.5 ml-8 list-decimal text-sm marker:text-amber marker:font-mono">
                  {w.focus.map((f, i) => <li key={i} className="text-foreground/90">{f}</li>)}
                </ol>
                <div className="mt-3 ml-8 rounded border border-amber/30 bg-background/40 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-0.5">Exit criteria</div>
                  <div className="text-xs text-muted-foreground">{w.exitCriteria}</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* TRIGGERS / KILL SWITCHES */}
      <Card className="bg-card/60 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Pivot Triggers · When to Change the Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
          <TriggerCard when="End of Week 3 < $80k" then="Drop one vertical. Re-target. Brandon takes over rep coaching daily." />
          <TriggerCard when="End of Week 7 < $400k" then="Emergency offer-mix call. Discount Diagnostic to $14k for 14 days OR add a $9k self-serve tier." />
          <TriggerCard when="Any rep <$0 closed by Day 30" then="Move them to Team-2 SDR-only role or terminate. Don't carry dead weight 90 days." />
          <TriggerCard when="MRR not building by Week 8" then="Bundle Diagnostic+3-month retainer for $39k flat. Force the recurring conversion." />
          <TriggerCard when="Pipeline <$300k by Week 5" then="Joseph pauses operator work for 5 days, runs outbound himself. Lead from the front." />
          <TriggerCard when="Churn risk on any retainer" then="Brandon does a save call same week. Discount mo+1 by 20% to retain. Never let one cancel quietly." />
        </CardContent>
      </Card>

      {/* COMMISSION REMINDER */}
      <Card className="bg-card/60 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber" /> Net to House at $1M
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid md:grid-cols-3 gap-3">
            <NetCard label="Diagnostics × 30" company={OFFERS.diagnostic.companyNet * 30} rep={OFFERS.diagnostic.repPayout * 30} partner={OFFERS.diagnostic.partnerPayout * 30} />
            <NetCard label="Retainer mo1 × 18" company={OFFERS.retainer.companyNet * 18} rep={OFFERS.retainer.repPayout * 18} partner={OFFERS.retainer.partnerPayout * 18} />
            <NetCard label="Recurring × 14 mo" company={OFFERS.recurring.companyNet * 14} rep={OFFERS.recurring.repPayout * 14} partner={OFFERS.recurring.partnerPayout * 14} />
          </div>
          <div className="text-xs text-muted-foreground italic">
            Locked split honors the rep + partner every single recurring month. The recurring tail is the actual prize — the
            sprint just builds the book.
          </div>
        </CardContent>
      </Card>

      <KpiScoreboardSection />
    </div>
  );
};

const MixInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono mb-1">{label}</div>
    <Input type="number" min={0} value={value} onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))} className="font-mono" />
  </div>
);

const FunnelStat: React.FC<{ icon: any; label: string; value: string; sub: string }> = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-md border border-border/60 p-3 bg-background/40">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber font-mono mb-1"><Icon className="w-3 h-3" /> {label}</div>
    <div className="text-2xl font-forensic">{value}</div>
    <div className="text-[11px] text-muted-foreground font-mono">{sub}</div>
  </div>
);

const RoleCard: React.FC<{ role: string; tone: string; lines: string[] }> = ({ role, lines }) => (
  <div className="rounded-md border border-amber/30 bg-amber/5 p-3">
    <div className="font-forensic text-base mb-2">{role}</div>
    <ul className="space-y-1 text-xs text-muted-foreground">
      {lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-amber">▸</span><span>{l}</span></li>)}
    </ul>
  </div>
);

const TriggerCard: React.FC<{ when: string; then: string }> = ({ when, then }) => (
  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
    <div className="text-[10px] uppercase tracking-wide text-destructive font-mono mb-1">If</div>
    <div className="text-sm font-medium mb-2">{when}</div>
    <div className="text-[10px] uppercase tracking-wide text-amber font-mono mb-1">Then</div>
    <div className="text-xs text-muted-foreground">{then}</div>
  </div>
);

const NetCard: React.FC<{ label: string; company: number; rep: number; partner: number }> = ({ label, company, rep, partner }) => (
  <div className="rounded-md border border-border/60 bg-background/40 p-3 text-xs space-y-1">
    <div className="font-mono text-[10px] uppercase tracking-wide text-amber">{label}</div>
    <div>Company: <span className="font-mono text-foreground">{fmt(company)}</span></div>
    <div>Rep: <span className="font-mono text-foreground">{fmt(rep)}</span></div>
    <div>Partner: <span className="font-mono text-foreground">{fmt(partner)}</span></div>
  </div>
);
