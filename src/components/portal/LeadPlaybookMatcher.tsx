import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Mail, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { matchPlaybooksForLead, type MatchedPlaybook } from "@/lib/leadPlaybookMatch";
import { openRepMail } from "@/lib/repMail";
import { useToast } from "@/hooks/use-toast";

interface Props {
  lead: {
    id: string;
    industry?: string | null;
    notes?: string | null;
    why_fit?: string | null;
    business_name?: string | null;
    website?: string | null;
    email?: string | null;
    contact_name?: string | null;
  };
}

export const LeadPlaybookMatcher: React.FC<Props> = ({ lead }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchedPlaybook[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    matchPlaybooksForLead(lead, 3)
      .then((m) => { if (!cancelled) setMatches(m); })
      .catch(() => { if (!cancelled) setMatches([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id, lead.industry, lead.notes]);

  const top = matches[0];

  const attachToEmail = (p: MatchedPlaybook) => {
    if (!lead.email) {
      toast({ title: "No lead email", description: "Add an email to the lead first.", variant: "destructive" });
      return;
    }
    const firstName = (lead.contact_name || "").split(" ")[0] || "there";
    const company = lead.business_name || "your team";
    const subject = `For ${company}: ${p.title}`;
    const body =
`Hi ${firstName},

While digging into ${company}, I pulled the playbook our operators built for situations like yours: "${p.title}".

${p.summary || p.description}

Download it here (no form, no gate): ${p.file_url}

Worth a 12-minute walkthrough this week? I'll map the top 1-2 leaks I see on ${company} against what's in the playbook so you can act on it immediately.

— Aetheris`;
    openRepMail(lead.email, { subject, body });
  };

  return (
    <Card className="glass border-amber/30">
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber" />
            Matched Playbooks
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="outline" className="text-[10px]">{matches.length}</Badge>
            )}
            {top && !open && (
              <span className="text-xs text-muted-foreground font-normal truncate max-w-[180px] hidden sm:inline">
                · top: {top.title}
              </span>
            )}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber" /></div>}
          {!loading && matches.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No playbooks available yet.</p>
          )}
          {!loading && matches.map((p, i) => (
            <div key={p.id} className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {i === 0 && p.score > 0 && (
                      <Badge className="bg-amber/20 text-amber border-amber/40 text-[10px]"><Sparkles className="w-3 h-3 mr-1" />Best fit</Badge>
                    )}
                    <h4 className="font-semibold text-sm text-foreground">{p.title}</h4>
                  </div>
                  {p.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</p>}
                  {p.matched_on.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.matched_on.slice(0, 4).map((m) => (
                        <Badge key={m} variant="outline" className="text-[9px] py-0">{m}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Download className="w-3 h-3 mr-1" /> Download PDF
                  </a>
                </Button>
                <Button size="sm" variant="default" onClick={() => attachToEmail(p)} disabled={!lead.email}>
                  <Mail className="w-3 h-3 mr-1" /> Attach to email
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};
