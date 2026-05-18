import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, Calendar, Megaphone, Copy, Sparkles, Trophy, Target } from "lucide-react";

/**
 * IncentivePlan, Aetheris Referral & Lead-Gen Incentive Plan
 * Calibrated to the real flagship economics:
 *   • 21-Day Revenue Diagnostic, $18,500  → Rep $5,000 / Partner $3,000 / Company $10,000
 *   • Implementation Retainer , $15,000/mo → Rep $4,000/mo / Partner $3,000/mo / Company $8,000/mo
 *   • Existing referral overlay: $500 onboard + $7,000 first-close + $500/sale override 12 months
 *
 * This screen doubles as a content kit, every block has a "Copy as post" button
 * so reps can paste straight into LinkedIn / SMS / email.
 */

type PostBlock = { title: string; body: string };

const POST_BLOCKS: PostBlock[] = [
  {
    title: "The pitch (LinkedIn)",
    body:
`Most businesses are leaking 6–7 figures a year and can't see it from the inside.

We run a 21-Day Revenue Diagnostic, forensic-grade, $18,500 flat, and hand back the exact list of leaks plus what to plug first.

If you know an operator who'd want that audit, send them my way. I get paid to make warm intros, you get the leak map. Everyone wins.`,
  },
  {
    title: "The intro ask (DM / text)",
    body:
`Quick favor, I'm rolling out forensic revenue diagnostics for SMBs and SaaS shops doing $1M–$50M.

If you know one founder/operator who'd want a 21-day audit of where their business is leaking money, drop their name. No pressure on them, no commitment from you.`,
  },
  {
    title: "The webinar invite",
    body:
`Free 30-min session: "Where Your Business Is Leaking, and the 7-Step Fix."

We walk live through the same forensic framework we use on $18,500 paid diagnostics. No fluff, no upsell theater, bring a notebook.

Drop your email and I'll send you the link with my name attached.`,
  },
];

export function IncentivePlan() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast({ title: "Copied", description: label });
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  // Sample monthly stack
  const sample = useMemo(() => {
    const directDiag = 5000;       // close 1 Diagnostic
    const retainerMo = 4000;       // 1 retainer that month
    const referralFirstClose = 7000; // 1 referred Diagnostic closes
    const referralOverride = 500 * 2; // 2 prior-referred sales tick this month
    const qualifiedRef = 250 * 2;   // 2 qualified referrals (no close yet)
    const aptBonus = 250 * 1;       // 1 booked-and-closed appointment
    const webinarBonus = 400 * 1;   // 1 webinar attendee converted
    const total = directDiag + retainerMo + referralFirstClose + referralOverride + qualifiedRef + aptBonus + webinarBonus;
    return { directDiag, retainerMo, referralFirstClose, referralOverride, qualifiedRef, aptBonus, webinarBonus, total };
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero */}
      <Card className="border-amber/40 bg-gradient-to-br from-amber/10 via-card to-card">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Trophy className="w-7 h-7 text-amber mt-1" />
            <div>
              <CardTitle className="font-display text-2xl">Aetheris Referral & Lead-Gen Incentive Plan</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Layered on top of your direct commission. Multiple paths to earn, close, refer,
                book, or invite. Every block below has a <span className="text-amber font-semibold">Copy as post</span> button so you can ship it today.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Base economics reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber" /> Your base commission (what you already earn)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">21-Day Revenue Diagnostic</div>
            <div className="font-mono text-2xl text-foreground mt-1">$18,500 flat</div>
            <div className="mt-2 text-sm">Rep: <span className="font-mono text-amber">$5,000</span> · Partner: <span className="font-mono">$3,000</span> · Company: <span className="font-mono">$10,000</span></div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Implementation Retainer</div>
            <div className="font-mono text-2xl text-foreground mt-1">$15,000 / month</div>
            <div className="mt-2 text-sm">Rep: <span className="font-mono text-amber">$4,000/mo</span> · Partner: <span className="font-mono">$3,000/mo</span> · Company: <span className="font-mono">$8,000/mo</span></div>
            <div className="mt-1 text-xs text-muted-foreground">Paid every month the client stays.</div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Referral Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-amber" /> 1. Referral Commission Structure
          </CardTitle>
          <p className="text-xs text-muted-foreground">For deals you bring us but don't close yourself.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber/40 bg-amber/5 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline" className="border-amber/50 text-amber">Tier 1</Badge>
                <h4 className="font-semibold text-foreground mt-2">Successful Referral Close</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl text-amber">$7,000</div>
                <div className="text-xs text-muted-foreground">first close, paid once</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Your referred prospect signs the $18,500 Diagnostic. You get a flat <span className="text-amber font-mono">$7,000</span> first-close bounty
             , <em>plus</em> a <span className="text-amber font-mono">$500/sale override</span> on every additional Aetheris purchase that account makes for the next 12 months.
              You don't have to be on the calls. You just made the intro.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Tier 2</Badge>
                <h4 className="font-semibold text-foreground mt-2">Qualified Referral (no close required)</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl text-foreground">$250</div>
                <div className="text-xs text-muted-foreground">flat, per qualified intro</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Referred prospect completes the intake call or books a demo with our team. We pay <span className="font-mono text-amber">$250</span> the moment
              they hit qualified status, even if they never close. Builds your pipeline depth and your bank account at the same time.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Tier 3</Badge>
                <h4 className="font-semibold text-foreground mt-2">Onboarding Bounty</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl text-foreground">$500</div>
                <div className="text-xs text-muted-foreground">when they sign the SOW</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Auto-paid the day a referred client countersigns. Stacks with the $7,000 first-close and the 12-month override.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Activity Bonus */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber" /> 2. Activity Bonus Structure
          </CardTitle>
          <p className="text-xs text-muted-foreground">Reward for the work, not just the close.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Bonus A</Badge>
                <h4 className="font-semibold text-foreground mt-2">Appointment Booked → Joseph closes</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl text-foreground">$250</div>
                <div className="text-xs text-muted-foreground">per closed appointment</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              You book the prospect on Joseph's calendar. He runs the pitch. If they close within 30 days,
              you get <span className="font-mono text-amber">$250</span> bonus on top of any commission you'd already earn.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Bonus B</Badge>
                <h4 className="font-semibold text-foreground mt-2">Webinar Invite → Attends → Closes</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-2xl text-foreground">$400</div>
                <div className="text-xs text-muted-foreground">per converted attendee</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Use your tracking link <code className="text-xs bg-muted px-1.5 py-0.5 rounded">aetheris.technology/webinar?ref=YOUR_CODE</code>.
              They register, they attend, they close inside 30 days, you get <span className="font-mono text-amber">$400</span>.
              Even if someone else on the team runs the close call.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Volume Stack</Badge>
                <h4 className="font-semibold text-foreground mt-2">Monthly close volume</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg text-foreground">+$1k / +$2.5k / +$5k</div>
                <div className="text-xs text-muted-foreground">at 2 / 3 / 5 closes in a month</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Hit 2 Diagnostic or Retainer closes in a calendar month: <span className="font-mono">+$1,000</span>.
              3 in a month: <span className="font-mono">+$2,500</span>. 5 in a month: <span className="font-mono">+$5,000</span>. Resets monthly.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Badge variant="outline">Retention Stack</Badge>
                <h4 className="font-semibold text-foreground mt-2">Client retention bonus</h4>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg text-foreground">+$1k / +$2.5k / +$5k</div>
                <div className="text-xs text-muted-foreground">at 3 / 6 / 12 months retained</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Your retainer client stays past 3, 6, and 12 months, you get a one-time bonus at each milestone, on top of your monthly $4k.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-amber" /> 3. Attribution & Tracking Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="text-foreground font-semibold">Referrals</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Submit via the <span className="text-amber">Leads</span> tab, name, company, contact, why they're a fit.</li>
              <li>Referrals are live for <span className="font-mono text-foreground">90 days</span>. Closes inside that window count.</li>
              <li>If you also close the deal yourself, you get the direct commission, not the referral bounty (no double-dip on the base).</li>
            </ul>
          </div>
          <div>
            <p className="text-foreground font-semibold">Appointments</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Book directly on Joseph's calendar. The booking is the receipt.</li>
              <li>Bonus pays only if the prospect closes within 30 days of the appointment.</li>
            </ul>
          </div>
          <div>
            <p className="text-foreground font-semibold">Webinars</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Use your <code className="text-xs bg-muted px-1.5 py-0.5 rounded">?ref=YOUR_CODE</code> tracking link.</li>
              <li>Attendance verified by the registration system.</li>
              <li>Close must happen within 30 days of the webinar date.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 4. Sample monthly stack */}
      <Card className="border-amber/30">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber" /> 4. Sample Monthly Stack, Rep "Jessica"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2">Activity</th><th>Source</th><th className="text-right">Payout</th></tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr><td className="py-2">Closed 1 Diagnostic herself</td><td className="text-xs">Direct</td><td className="text-right font-mono">{fmt(sample.directDiag)}</td></tr>
                <tr><td className="py-2">1 Retainer client billing this month</td><td className="text-xs">Recurring</td><td className="text-right font-mono">{fmt(sample.retainerMo)}</td></tr>
                <tr><td className="py-2">1 referred prospect closed Diagnostic</td><td className="text-xs">Tier 1 referral</td><td className="text-right font-mono">{fmt(sample.referralFirstClose)}</td></tr>
                <tr><td className="py-2">2 prior-referred accounts bought again</td><td className="text-xs">12-mo override</td><td className="text-right font-mono">{fmt(sample.referralOverride)}</td></tr>
                <tr><td className="py-2">2 qualified referrals (no close yet)</td><td className="text-xs">Tier 2 referral</td><td className="text-right font-mono">{fmt(sample.qualifiedRef)}</td></tr>
                <tr><td className="py-2">1 booked appointment Joseph closed</td><td className="text-xs">Bonus A</td><td className="text-right font-mono">{fmt(sample.aptBonus)}</td></tr>
                <tr><td className="py-2">1 webinar attendee converted</td><td className="text-xs">Bonus B</td><td className="text-right font-mono">{fmt(sample.webinarBonus)}</td></tr>
                <tr className="border-t-2 border-amber/40">
                  <td className="py-2 font-semibold">Month total</td>
                  <td></td>
                  <td className="text-right font-mono text-xl text-amber">{fmt(sample.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            That's <span className="text-foreground font-semibold">{fmt(sample.total)}</span> in one month
           , without Jessica having to close more than one deal herself. Stack referrals, intros, and webinar invites and the math compounds fast.
          </p>
        </CardContent>
      </Card>

      {/* 5. Posts to copy */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber" /> 5. Post Kit, copy & ship
          </CardTitle>
          <p className="text-xs text-muted-foreground">Drop straight into LinkedIn, SMS, or email. Swap your name + tracking link in.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {POST_BLOCKS.map((p) => (
            <div key={p.title} className="rounded-lg border border-border/60 bg-card/50 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h4 className="font-semibold text-foreground">{p.title}</h4>
                <Button size="sm" variant="outline" onClick={() => copy(p.title, p.body)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> {copied === p.title ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">{p.body}</pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 6. Why this works */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Why this works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li><span className="text-foreground font-semibold">Scalable.</span> We only pay when deals close or pipeline moves. Low risk to the company, zero ceiling for you.</li>
            <li><span className="text-foreground font-semibold">Multiple paths.</span> Close it, refer it, book it, or invite, every action has a payout attached.</li>
            <li><span className="text-foreground font-semibold">Stackable.</span> Direct commissions + referral bounty + 12-mo override + activity bonuses + volume + retention all add up.</li>
            <li><span className="text-foreground font-semibold">Self-sustaining.</span> Reps become the sourcing engine. The pipeline gets warmer every month.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default IncentivePlan;
