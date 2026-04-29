import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, TrendingDown, Quote, ArrowRight } from "lucide-react";

interface FlaggedPhrase {
  originalPhrase: string;
  category: string;
  issue: string;
  severity: string;
  suggestedReplacement: string;
  context?: string;
}

interface AuditData {
  businessName?: string;
  frictionScore?: number;
  overallAssessment?: string;
  flaggedPhrases?: FlaggedPhrase[];
  strongerCTAs?: { current: string; replacement: string; whyBetter: string }[];
  topPriorityFixes?: string[];
  copyStrengths?: string[];
}

interface Prospect {
  id: string;
  business_name: string | null;
  website_url: string | null;
  scraped_data: {
    audit_status?: string;
    friction_audit?: AuditData;
    audit_url?: string;
  } | null;
}

const severityColor = (s: string) => {
  if (s === "critical") return "bg-destructive/15 text-destructive border-destructive/30";
  if (s === "high") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-amber-500/15 text-amber-400 border-amber-500/30";
};

export default function LeakReportPage() {
  const { prospectId } = useParams<{ prospectId: string }>();
  const [loading, setLoading] = useState(true);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!prospectId) return;
      const { data, error } = await supabase
        .from("drip_prospects")
        .select("id, business_name, website_url, scraped_data")
        .eq("id", prospectId)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("Report not found");
      else setProspect(data as Prospect);
      setLoading(false);
    })();
  }, [prospectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !prospect || !prospect.scraped_data?.friction_audit) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="max-w-md w-full p-8 text-center glass">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-display font-bold mb-2">Report unavailable</h1>
          <p className="text-muted-foreground mb-6">
            {error || "This forensic report isn't ready yet, or the link is invalid."}
          </p>
          <Link to="/leak-audit">
            <Button>Run your own Leak Audit</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const audit = prospect.scraped_data.friction_audit!;
  const businessName = audit.businessName || prospect.business_name || "Your business";
  const score = audit.frictionScore ?? 0;
  const scoreColor = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-destructive";

  return (
    <>
      <SEOHead
        title={`Leak Report: ${businessName} | Aetheris`}
        description="A forensic copy audit of your public site. Where the words leak revenue."
        path={`/leak-report/${prospect.id}`}
      />
      <div className="min-h-screen py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Case File · Forensic Copy Audit
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
            {businessName} is leaking.
          </h1>
          {prospect.scraped_data.audit_url && (
            <p className="text-muted-foreground mb-8 font-mono text-sm">
              Source: {prospect.scraped_data.audit_url}
            </p>
          )}

          <Card className="glass p-8 mb-8">
            <div className="flex items-center gap-6">
              <div className={`text-6xl font-bold font-mono ${scoreColor}`}>{score}</div>
              <div>
                <div className="text-sm uppercase font-mono text-muted-foreground tracking-widest mb-1">
                  Friction Score
                </div>
                <div className="text-foreground">
                  {audit.overallAssessment || "Copy analyzed."}
                </div>
              </div>
            </div>
          </Card>

          {audit.flaggedPhrases && audit.flaggedPhrases.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
                <Quote className="w-5 h-5 text-destructive" /> Flagged phrases
              </h2>
              <div className="space-y-3">
                {audit.flaggedPhrases.map((p, i) => (
                  <Card key={i} className="glass p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <Badge variant="outline" className={severityColor(p.severity)}>
                        {p.severity}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground uppercase">{p.category}</span>
                    </div>
                    <p className="font-serif text-lg text-foreground mb-2">"{p.originalPhrase}"</p>
                    <p className="text-sm text-muted-foreground mb-3">{p.issue}</p>
                    <div className="bg-primary/5 border border-primary/20 rounded p-3 flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Stronger: </span>"{p.suggestedReplacement}"
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {audit.strongerCTAs && audit.strongerCTAs.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4">CTA upgrades</h2>
              <div className="space-y-3">
                {audit.strongerCTAs.map((c, i) => (
                  <Card key={i} className="glass p-5">
                    <div className="grid md:grid-cols-2 gap-3 mb-2">
                      <div>
                        <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Current</div>
                        <div className="font-serif text-base">"{c.current}"</div>
                      </div>
                      <div>
                        <div className="text-xs font-mono uppercase text-primary mb-1">Replace with</div>
                        <div className="font-serif text-base text-primary">"{c.replacement}"</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.whyBetter}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {audit.topPriorityFixes && audit.topPriorityFixes.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" /> Priority fixes
              </h2>
              <Card className="glass p-6">
                <ol className="space-y-3 list-decimal list-inside">
                  {audit.topPriorityFixes.map((f, i) => (
                    <li key={i} className="text-foreground">{f}</li>
                  ))}
                </ol>
              </Card>
            </section>
          )}

          {audit.copyStrengths && audit.copyStrengths.length > 0 && (
            <section className="mb-10">
              <h2 className="font-serif text-2xl font-bold mb-4">What's working</h2>
              <Card className="glass p-6">
                <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                  {audit.copyStrengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </Card>
            </section>
          )}

          <Card className="glass p-8 text-center mt-12 border-primary/30">
            <h3 className="font-serif text-2xl font-bold mb-3">This is one leak. There are usually six.</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Copy is the surface. The real bleed is in your follow-up, brand consistency, and operational handoffs.
              The full Leak Audit™ maps all seven.
            </p>
            <Link to="/leak-audit">
              <Button size="lg">Run the full Leak Audit</Button>
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
