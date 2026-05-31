import React, { useEffect, useState } from "react";
import { Clock, Mail, Linkedin, Phone, BookOpen, Download, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { matchPlaybooksForLead, type MatchedPlaybook } from "@/lib/leadPlaybookMatch";

interface Props {
  lead: {
    industry?: string | null;
    notes?: string | null;
    why_fit?: string | null;
    business_name?: string | null;
    website?: string | null;
    email?: string | null;
    contact_name?: string | null;
  };
  rr?: any | null;
}

interface ContactPlan {
  method: { kind: "email" | "linkedin" | "phone"; label: string; reason: string };
  time: { window: string; day: string; reason: string };
}

const INDUSTRY_TIME: Array<{ match: RegExp; day: string; window: string; reason: string }> = [
  { match: /law|legal|attorney/i, day: "Tue–Thu", window: "8:00–9:30 AM local", reason: "Before docket / client calls start." },
  { match: /restaurant|food|hospitality|bar|cafe/i, day: "Tue–Thu", window: "2:30–4:30 PM local", reason: "Between lunch and dinner rush — owners breathe." },
  { match: /retail|ecom|shop|store/i, day: "Tue–Wed", window: "10:00–11:30 AM local", reason: "Post-open, before midday rush." },
  { match: /real ?estate|realtor|broker|property/i, day: "Tue–Thu", window: "9:00–10:30 AM local", reason: "Between morning showings and client calls." },
  { match: /construction|contractor|trades|hvac|plumb|electric|roof/i, day: "Mon–Wed", window: "6:30–7:30 AM or 4:30–5:30 PM", reason: "Before crews start / after they wrap." },
  { match: /health|clinic|dental|medical|chiropract|therap/i, day: "Tue–Thu", window: "12:00–1:30 PM local", reason: "Lunch break between patient blocks." },
  { match: /agency|marketing|consult|saas|software|tech/i, day: "Tue–Thu", window: "10:00–11:30 AM local", reason: "Post-standup, pre-lunch decision window." },
  { match: /finance|accounting|cpa|bookkeep|insurance/i, day: "Tue–Thu", window: "9:30–11:00 AM local", reason: "After market open, before client meetings stack." },
  { match: /manufactur|industrial|logistics|warehouse/i, day: "Tue–Wed", window: "7:30–9:00 AM local", reason: "Shift handover — owners on the floor with coffee." },
  { match: /auto|dealer|repair|mechanic/i, day: "Tue–Thu", window: "10:00–11:30 AM local", reason: "After service bays fill, before lunch." },
  { match: /fitness|gym|wellness|spa|salon/i, day: "Tue–Thu", window: "1:00–3:00 PM local", reason: "Between morning and evening client waves." },
  { match: /education|school|tutor|coach/i, day: "Tue–Thu", window: "3:30–5:00 PM local", reason: "Post-class, pre-evening prep." },
];

const DEFAULT_TIME = { day: "Tue–Thu", window: "10:00–11:30 AM local", reason: "Highest decision-maker open rate across most B2B industries." };

function pickTime(industry?: string | null) {
  if (industry) {
    for (const row of INDUSTRY_TIME) {
      if (row.match.test(industry)) return { day: row.day, window: row.window, reason: row.reason };
    }
  }
  return DEFAULT_TIME;
}

function pickMethod(lead: Props["lead"], rr: any): ContactPlan["method"] {
  const hasEmail = !!(lead.email || rr?.best_email);
  const hasLinkedIn = !!(rr?.linkedin_url);
  const hasPhone = Array.isArray(rr?.phones) && rr.phones.length > 0;

  if (hasEmail) {
    return {
      kind: "email",
      label: `Email${rr?.best_email ? ` → ${rr.best_email}` : ""}`,
      reason: "Direct, async, leaves a written paper trail they can forward internally.",
    };
  }
  if (hasLinkedIn) {
    return {
      kind: "linkedin",
      label: `LinkedIn DM${rr?.name ? ` → ${rr.name}` : ""}`,
      reason: "No email surfaced — LinkedIn lands in their pocket and gets read.",
    };
  }
  if (hasPhone) {
    return {
      kind: "phone",
      label: `Call → ${rr.phones[0]?.number}`,
      reason: "No digital channel verified — phone is the highest-confidence touch.",
    };
  }
  return {
    kind: "email",
    label: "Hunt the email first",
    reason: "No contact channel verified yet. Run RocketReach or scrape the site contact page before reaching out.",
  };
}

export const DetectiveContactPlan: React.FC<Props> = ({ lead, rr }) => {
  const [playbook, setPlaybook] = useState<MatchedPlaybook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    matchPlaybooksForLead(lead, 1)
      .then((m) => { if (!cancelled) setPlaybook(m[0] || null); })
      .catch(() => { if (!cancelled) setPlaybook(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.industry, lead.business_name, lead.website]);

  const method = pickMethod(lead, rr);
  const time = pickTime(lead.industry);
  const MethodIcon = method.kind === "email" ? Mail : method.kind === "linkedin" ? Linkedin : Phone;

  return (
    <div className="rounded-md border-2 border-amber/40 bg-background/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber">Detective's playbook · time · channel</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        {/* Best playbook */}
        <div className="rounded border border-border/60 bg-card/40 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber" />
            <p className="text-[9px] font-mono uppercase tracking-wider text-amber/80">Best playbook</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> matching…</div>
          ) : playbook ? (
            <>
              <p className="text-[12px] font-display font-semibold text-foreground leading-snug">{playbook.title}</p>
              {playbook.subtitle && <p className="text-[10px] text-muted-foreground line-clamp-2">{playbook.subtitle}</p>}
              {playbook.matched_on.length > 0 && (
                <Badge variant="outline" className="text-[9px] py-0">matched on {playbook.matched_on[0]}</Badge>
              )}
              <Button size="sm" variant="outline" asChild className="h-7 w-full text-[10px] border-amber/40 text-amber hover:bg-amber/10 mt-1">
                <a href={playbook.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-3 h-3 mr-1" /> Download PDF
                </a>
              </Button>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No playbook in library yet.</p>
          )}
        </div>

        {/* Best time */}
        <div className="rounded border border-border/60 bg-card/40 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber" />
            <p className="text-[9px] font-mono uppercase tracking-wider text-amber/80">Best time to reach</p>
          </div>
          <p className="text-[12px] font-display font-semibold text-foreground">{time.day}</p>
          <p className="text-[12px] text-foreground">{time.window}</p>
          <p className="text-[10px] text-muted-foreground italic leading-snug">{time.reason}</p>
        </div>

        {/* Best method */}
        <div className="rounded border border-border/60 bg-card/40 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <MethodIcon className="w-3.5 h-3.5 text-amber" />
            <p className="text-[9px] font-mono uppercase tracking-wider text-amber/80">Best method</p>
          </div>
          <p className="text-[12px] font-display font-semibold text-foreground capitalize">{method.kind}</p>
          <p className="text-[11px] text-foreground break-words">{method.label}</p>
          <p className="text-[10px] text-muted-foreground italic leading-snug">{method.reason}</p>
        </div>
      </div>
    </div>
  );
};
