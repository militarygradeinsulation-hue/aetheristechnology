import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "../AppLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, Sparkles, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Metric {
  id: string;
  audit_run_id: string;
  total_ms: number;
  stage_timings: Record<string, number>;
  ai_call_count: number;
  ai_error_count: number;
  patterns_with_zero_findings: number;
  total_patterns: number;
  health_score: number;
  bottleneck_stage: string | null;
  created_at: string;
}

interface TuningProposal {
  id: string;
  field: string;
  current_value: { value: any };
  proposed_value: { value: any };
  reason: string;
  expected_impact: string | null;
  confidence: number;
  status: string;
  created_at: string;
}

interface CodeProposal {
  id: string;
  title: string;
  diagnosis: string;
  target_file: string;
  proposed_change: string;
  status: string;
  created_at: string;
}

interface TuningConfig {
  auto_apply_enabled: boolean;
  self_analysis_enabled: boolean;
  [k: string]: any;
}

const AppAuditHealth = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tuning, setTuning] = useState<TuningProposal[]>([]);
  const [code, setCode] = useState<CodeProposal[]>([]);
  const [config, setConfig] = useState<TuningConfig | null>(null);

  const load = async () => {
    setLoading(true);
    const [m, t, c, cfg] = await Promise.all([
      supabase.from("audit_run_metrics").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("audit_tuning_proposals").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("audit_code_proposals").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("audit_tuning_config").select("*").eq("id", 1).maybeSingle(),
    ]);
    setMetrics((m.data || []) as any);
    setTuning((t.data || []) as any);
    setCode((c.data || []) as any);
    setConfig((cfg.data || null) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleConfig = async (field: "auto_apply_enabled" | "self_analysis_enabled", value: boolean) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    const { error } = await supabase.from("audit_tuning_config").update({ [field]: value }).eq("id", 1);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      load();
    }
  };

  const review = async (id: string, action: "approve" | "reject") => {
    const { error } = await supabase.functions.invoke("audit-apply-proposal", { body: { proposal_id: id, action } });
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: action === "approve" ? "Applied" : "Rejected" });
    load();
  };

  const reviewCode = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("audit_code_proposals").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const latest = metrics[0];
  const pendingTuning = tuning.filter(p => p.status === "pending");
  const autoApplied = tuning.filter(p => p.status === "auto_applied");
  const pendingCode = code.filter(p => p.status === "pending");

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> Audit Health
            </h1>
            <p className="text-muted-foreground mt-1">The audit watching itself. Self-diagnosis, auto-tuning, and code proposals.</p>
          </div>
          <div className="flex items-center gap-6 bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={!!config?.self_analysis_enabled}
                onCheckedChange={(v) => toggleConfig("self_analysis_enabled", v)}
              />
              <span className="text-sm">Self-analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!!config?.auto_apply_enabled}
                onCheckedChange={(v) => toggleConfig("auto_apply_enabled", v)}
              />
              <span className="text-sm">Auto-apply tuning</span>
            </div>
          </div>
        </div>

        {/* Latest health */}
        <div className="grid md:grid-cols-4 gap-4">
          <StatBlock label="Latest health" value={latest ? `${latest.health_score}/100` : ", "} icon={<Sparkles className="h-4 w-4" />} highlight={latest?.health_score && latest.health_score < 70} />
          <StatBlock label="Last run duration" value={latest ? `${(latest.total_ms / 1000).toFixed(1)}s` : ", "} icon={<Clock className="h-4 w-4" />} />
          <StatBlock label="Bottleneck" value={latest?.bottleneck_stage || ", "} icon={<AlertTriangle className="h-4 w-4" />} />
          <StatBlock label="Pending proposals" value={String(pendingTuning.length + pendingCode.length)} icon={<Activity className="h-4 w-4" />} highlight={pendingTuning.length + pendingCode.length > 0} />
        </div>

        {/* Trends */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Recent runs</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : metrics.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audit runs yet. Run one from the Dashboard.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 pr-4">When</th>
                    <th className="text-left py-2 pr-4">Health</th>
                    <th className="text-left py-2 pr-4">Duration</th>
                    <th className="text-left py-2 pr-4">AI calls</th>
                    <th className="text-left py-2 pr-4">AI errors</th>
                    <th className="text-left py-2 pr-4">Bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(m => (
                    <tr key={m.id} className="border-b border-border/40">
                      <td className="py-2 pr-4 text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4"><HealthBadge score={m.health_score} /></td>
                      <td className="py-2 pr-4">{(m.total_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2 pr-4">{m.ai_call_count}</td>
                      <td className="py-2 pr-4">{m.ai_error_count > 0 ? <span className="text-destructive">{m.ai_error_count}</span> : "0"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{m.bottleneck_stage || ", "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tuning proposals */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Tuning proposals</h2>
            <span className="text-xs text-muted-foreground">{pendingTuning.length} pending · {autoApplied.length} auto-applied</span>
          </div>
          {tuning.length === 0 ? (
            <p className="text-sm text-muted-foreground">No proposals yet. They appear after audit runs.</p>
          ) : (
            <div className="space-y-3">
              {tuning.slice(0, 20).map(p => (
                <div key={p.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-secondary px-2 py-0.5 rounded">{p.field}</code>
                        <span className="text-xs text-muted-foreground">
                          {JSON.stringify(p.current_value?.value)} → <strong className="text-foreground">{JSON.stringify(p.proposed_value?.value)}</strong>
                        </span>
                        <Badge variant="outline" className="text-xs">conf {Math.round(p.confidence * 100)}%</Badge>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-sm mt-2">{p.reason}</p>
                      {p.expected_impact && <p className="text-xs text-muted-foreground mt-1">Impact: {p.expected_impact}</p>}
                    </div>
                    {p.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => review(p.id, "approve")}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => review(p.id, "reject")}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Code proposals */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Code proposals</h2>
            <span className="text-xs text-muted-foreground">{pendingCode.length} pending · review-only</span>
          </div>
          {code.length === 0 ? (
            <p className="text-sm text-muted-foreground">No code proposals yet.</p>
          ) : (
            <div className="space-y-3">
              {code.slice(0, 20).map(p => (
                <div key={p.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{p.title}</h3>
                        <code className="text-xs bg-secondary px-2 py-0.5 rounded">{p.target_file}</code>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{p.diagnosis}</p>
                      <pre className="text-xs bg-secondary/50 p-3 rounded mt-2 overflow-x-auto whitespace-pre-wrap">{p.proposed_change}</pre>
                    </div>
                    {p.status === "pending" && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => {
                          navigator.clipboard.writeText(`Apply this audit improvement to ${p.target_file}:\n\n${p.proposed_change}`);
                          toast({ title: "Copied", description: "Paste into Lovable chat to apply." });
                        }}>Copy for Lovable</Button>
                        <Button size="sm" onClick={() => reviewCode(p.id, "accepted")}>Mark accepted</Button>
                        <Button size="sm" variant="ghost" onClick={() => reviewCode(p.id, "rejected")}>Reject</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

const StatBlock = ({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) => (
  <div className={`bg-card border rounded-xl p-4 ${highlight ? "border-primary/40" : "border-border"}`}>
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

const HealthBadge = ({ score }: { score: number }) => {
  const color = score >= 85 ? "bg-green-500/10 text-green-500" : score >= 65 ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive";
  return <span className={`text-xs px-2 py-0.5 rounded ${color}`}>{score}</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
    approved: { label: "Approved", cls: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
    auto_applied: { label: "Auto-applied", cls: "bg-primary/10 text-primary", icon: <Sparkles className="h-3 w-3" /> },
    rejected: { label: "Rejected", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
    accepted: { label: "Accepted", cls: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const m = map[status] || map.pending;
  return <span className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 ${m.cls}`}>{m.icon}{m.label}</span>;
};

export default AppAuditHealth;
