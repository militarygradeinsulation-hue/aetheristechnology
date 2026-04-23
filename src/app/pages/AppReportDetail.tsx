import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, AlertTriangle, TrendingDown, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Finding {
  key: string;
  label: string;
  count: number;
  exposure_cents: number;
  diagnostic: string;
  formula: string;
  time_period: string;
  sample_ids: string[];
  recovery_plan: { day: string; action: string }[];
  primary_action: { label: string; action_type: string };
}

interface Report {
  summary: string;
  total_exposure_cents: number;
  findings: Finding[];
  generated_at: string;
}

interface AuditRun {
  id: string;
  account_id: string;
  status: string;
  report: Report;
  total_exposure_cents: number;
  findings_count: number;
  started_at: string;
  completed_at: string | null;
}

const AppReportDetail = () => {
  const { id } = useParams();
  const [run, setRun] = useState<AuditRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvedKeys, setApprovedKeys] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("audit_runs").select("*").eq("id", id).maybeSingle();
      setRun(data as unknown as AuditRun | null);
      const { data: actions } = await supabase
        .from("pending_actions")
        .select("finding_key")
        .eq("audit_run_id", id);
      setApprovedKeys(new Set((actions || []).map((a: any) => a.finding_key)));
      setLoading(false);
    };
    load();
  }, [id]);

  const handleApprove = async (finding: Finding) => {
    if (!run) return;
    setApproving(finding.key);
    try {
      const { error } = await supabase.from("pending_actions").insert({
        account_id: run.account_id,
        audit_run_id: run.id,
        finding_key: finding.key,
        action_type: finding.primary_action?.action_type || finding.key,
        payload: {
          label: finding.primary_action?.label,
          sample_ids: finding.sample_ids,
          exposure_cents: finding.exposure_cents,
        },
      });
      if (error) throw error;
      setApprovedKeys(new Set([...approvedKeys, finding.key]));
      toast({ title: "Action queued", description: "Will execute once HubSpot write-back is enabled." });
    } catch (err: any) {
      toast({ title: "Couldn't queue action", description: err.message, variant: "destructive" });
    } finally {
      setApproving(null);
    }
  };

  const handleDownload = () => {
    if (!run?.report) return;
    const blob = new Blob([JSON.stringify(run.report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-leak-audit-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <AppLayout><div className="h-32 bg-muted rounded animate-pulse" /></AppLayout>;
  if (!run) return <AppLayout><p>Audit not found.</p></AppLayout>;

  if (run.status !== "complete") {
    return (
      <AppLayout>
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
          <p className="font-medium">Audit {run.status}</p>
          <p className="text-sm text-muted-foreground mt-1">This page will refresh when the audit completes.</p>
        </div>
      </AppLayout>
    );
  }

  const report = run.report;
  const top3 = report.findings.slice(0, 3);
  const remaining = report.findings.slice(3);

  return (
    <AppLayout>
      <Link to="/app/reports" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> All audits
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-br from-destructive/10 via-card to-card border border-destructive/20 rounded-xl p-8 mb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total revenue exposure</p>
            <h1 className="text-5xl font-semibold tracking-tight">
              ${(report.total_exposure_cents / 100).toLocaleString()}
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{report.summary}</p>
          </div>
          <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
            <Download className="h-3.5 w-3.5" /> Download report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
          {top3.map((f, i) => (
            <div key={f.key} className="bg-background/50 border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Finding #{i + 1}</div>
              <div className="font-medium text-sm mb-2">{f.label}</div>
              <div className="text-2xl font-semibold text-destructive">${(f.exposure_cents / 100).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.count} records</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 deep dive */}
      <h2 className="text-xl font-semibold mb-4">Top findings</h2>
      <div className="space-y-4 mb-10">
        {top3.map((f, i) => (
          <FindingCard
            key={f.key}
            finding={f}
            index={i + 1}
            approved={approvedKeys.has(f.key)}
            approving={approving === f.key}
            onApprove={() => handleApprove(f)}
          />
        ))}
      </div>

      {/* Appendix */}
      {remaining.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Appendix — additional findings</h2>
          <div className="space-y-3">
            {remaining.map((f, i) => (
              <details key={f.key} className="bg-card border border-border rounded-lg p-4">
                <summary className="cursor-pointer flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground">#{i + 4}</span>
                    <span className="font-medium truncate">{f.label}</span>
                  </div>
                  <div className="text-sm text-muted-foreground shrink-0">
                    ${(f.exposure_cents / 100).toLocaleString()} · {f.count} records
                  </div>
                </summary>
                <div className="mt-4 pt-4 border-t border-border">
                  <FindingCardBody
                    finding={f}
                    approved={approvedKeys.has(f.key)}
                    approving={approving === f.key}
                    onApprove={() => handleApprove(f)}
                  />
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
};

const FindingCard = ({ finding, index, approved, approving, onApprove }: {
  finding: Finding; index: number; approved: boolean; approving: boolean; onApprove: () => void;
}) => (
  <div className="bg-card border border-border rounded-xl p-6">
    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Finding #{index}</p>
          <h3 className="text-lg font-semibold">{finding.label}</h3>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted-foreground">Exposure</div>
        <div className="text-2xl font-semibold text-destructive">${(finding.exposure_cents / 100).toLocaleString()}</div>
      </div>
    </div>
    <FindingCardBody finding={finding} approved={approved} approving={approving} onApprove={onApprove} />
  </div>
);

const FindingCardBody = ({ finding, approved, approving, onApprove }: {
  finding: Finding; approved: boolean; approving: boolean; onApprove: () => void;
}) => (
  <>
    <p className="text-sm mb-4">{finding.diagnostic}</p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
      <div className="bg-muted/30 rounded p-3">
        <div className="text-muted-foreground mb-1">Records affected</div>
        <div className="font-medium text-sm">{finding.count.toLocaleString()}</div>
      </div>
      <div className="bg-muted/30 rounded p-3">
        <div className="text-muted-foreground mb-1">Detection formula</div>
        <div className="font-mono text-xs">{finding.formula}</div>
      </div>
      <div className="bg-muted/30 rounded p-3">
        <div className="text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Time period</div>
        <div className="font-medium text-sm">{finding.time_period}</div>
      </div>
    </div>

    <div className="bg-muted/20 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
        <TrendingDown className="h-3 w-3" /> 30-day recovery plan
      </div>
      <ol className="space-y-2">
        {finding.recovery_plan?.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5 w-12">Day {step.day}</span>
            <span>{step.action}</span>
          </li>
        ))}
      </ol>
    </div>

    <Button
      onClick={onApprove}
      disabled={approved || approving}
      size="sm"
      className="gap-2"
      variant={approved ? "secondary" : "default"}
    >
      {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {approved ? "Queued" : approving ? "Queuing..." : finding.primary_action?.label || "Approve & Execute"}
    </Button>
  </>
);

export default AppReportDetail;
