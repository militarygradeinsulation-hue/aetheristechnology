import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  GitBranch, AlertTriangle, TrendingDown, Zap, Calendar, Target,
  Copy, Check, DollarSign, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { saveToolRun } from "@/lib/toolSaveHelper";
import { isPortalSession } from "@/lib/portalWorkspace";
import { QuickDownloadBar } from "./QuickDownloadBar";
import { useActiveLeadAutofill } from "@/lib/activeLead";

const PHASES = [
  { label: "Auditing lead sources...", target: 18 },
  { label: "Mapping funnel stages...", target: 38 },
  { label: "Detecting leak points...", target: 60 },
  { label: "Estimating dollar loss...", target: 80 },
  { label: "Building 7-day fix plan...", target: 98 },
];

type Form = {
  businessName: string;
  website: string;
  industry: string;
  leadSources: string;
  monthlyLeads: string;
  currentFunnel: string;
  biggestDropoff: string;
  avgDealSizeUsd: string;
};

const usd = (n: number) =>
  typeof n === "number" && isFinite(n)
    ? `$${Math.round(n).toLocaleString()}`
    : "$0";

const severityStyle = (s: string) =>
  s === "critical"
    ? "text-red-400 bg-red-500/10 border-red-500/30"
    : s === "high"
      ? "text-amber bg-amber/10 border-amber/30"
      : "text-blue-400 bg-blue-500/10 border-blue-500/30";

const verdictStyle = (v: string) =>
  v === "healthy"
    ? "text-green-400 bg-green-500/10"
    : v === "critical"
      ? "text-red-400 bg-red-500/10"
      : "text-amber bg-amber/10";

/** Render mermaid via public mermaid.ink service — no runtime dependency. */
function MermaidDiagram({ code }: { code: string }) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(() => {
    try {
      // btoa needs latin1-safe input; strip anything outside
      const safe = code.replace(/[^\x00-\xff]/g, "");
      const b64 = btoa(unescape(encodeURIComponent(safe)));
      return `https://mermaid.ink/svg/${b64}?theme=dark&bgColor=0a0a0a`;
    } catch {
      return "";
    }
  }, [code]);

  if (!code) return null;
  return (
    <div className="glass rounded-xl p-4 border border-border overflow-auto">
      {!failed && src ? (
        <img
          src={src}
          alt="Lead flow diagram"
          className="mx-auto max-w-full"
          onError={() => setFailed(true)}
        />
      ) : (
        <pre className="text-[11px] font-mono text-amber whitespace-pre-wrap">{code}</pre>
      )}
    </div>
  );
}

export const LeadFlowMapper: React.FC<{ adminMode?: boolean }> = ({ adminMode = true }) => {
  const [form, setForm] = useState<Form>({
    businessName: "",
    website: "",
    industry: "",
    leadSources: "",
    monthlyLeads: "",
    currentFunnel: "",
    biggestDropoff: "",
    avgDealSizeUsd: "",
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [result, setResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useActiveLeadAutofill("lead-flow-mapper", (lead) => {
    setForm((p) => ({
      ...p,
      businessName: p.businessName || lead.business_name || "",
      website: p.website || lead.website || "",
      industry: p.industry || lead.industry || "",
    }));
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({ title: "Copied" });
  };

  const handleGenerate = async () => {
    if (!form.leadSources.trim() || !form.currentFunnel.trim()) {
      toast({
        title: "Missing fields",
        description: "Lead sources and current funnel are required.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setProgress(0);
    setResult(null);
    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        const p = PHASES[phase];
        setPhaseLabel(p.label);
        setProgress((prev) => Math.min(prev + Math.random() * 8 + 4, p.target));
        phase++;
      }
    }, 3800);

    try {
      const { data, error } = await supabase.functions.invoke("generate-lead-flow-map", {
        body: form,
      });
      clearInterval(interval);
      if (error || !data) throw new Error(error?.message || "Failed to map lead flow");
      if ((data as any).error) throw new Error((data as any).error);
      setProgress(100);
      setPhaseLabel("Done");
      setTimeout(() => setResult(data), 350);
      if (adminMode || isPortalSession()) {
        saveToolRun({
          tool_type: "lead_flow_map",
          title: `${form.businessName || form.website || "Lead flow"} — ${new Date().toLocaleDateString()}`,
          input_data: form,
          output_data: data,
        }).catch((e) => console.error("Library save failed:", e));
      }
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setResult(null);
    setLoading(false);
    setProgress(0);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Input */}
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-bold text-foreground font-display">Lead Flow Mapper</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6 font-mono">
            Diagnose where deals leak between first touch and closed revenue.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Business Name</label>
              <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Acme Roofing" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Website</label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Industry</label>
              <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Home services, SaaS, …" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Leads / month (approx)</label>
              <Input value={form.monthlyLeads} onChange={(e) => set("monthlyLeads", e.target.value)} placeholder="120" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Avg deal size (USD)</label>
              <Input value={form.avgDealSizeUsd} onChange={(e) => set("avgDealSizeUsd", e.target.value)} placeholder="8500" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Biggest known dropoff</label>
              <Input value={form.biggestDropoff} onChange={(e) => set("biggestDropoff", e.target.value)} placeholder="After first call, before proposal…" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Lead sources *</label>
              <Textarea
                rows={3}
                value={form.leadSources}
                onChange={(e) => set("leadSources", e.target.value)}
                placeholder="Google Ads (40%), organic SEO (25%), referrals (20%), cold outbound (15%)…"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block uppercase tracking-wider">Current funnel *</label>
              <Textarea
                rows={5}
                value={form.currentFunnel}
                onChange={(e) => set("currentFunnel", e.target.value)}
                placeholder="Form submit → auto reply → SDR call within 48h → proposal sent → 2 follow-ups → close or lost…"
              />
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            className="mt-6 bg-red-500 hover:bg-red-500/90 text-background font-bold px-8"
          >
            <GitBranch className="w-4 h-4 mr-2" /> Map The Leak
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <p className="text-red-400 font-semibold mb-4 font-mono">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <QuickDownloadBar
            toolType="lead_flow_map"
            title={`${form.businessName || form.website || "Lead flow"} — ${new Date().toLocaleDateString()}`}
            outputData={result}
            inputData={form}
          />

          {/* Header stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass rounded-xl p-6 border border-border text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">Flow Health</p>
              <div
                className={`text-5xl font-bold font-display ${
                  (result.healthScore || 0) >= 70
                    ? "text-green-400"
                    : (result.healthScore || 0) >= 40
                      ? "text-amber"
                      : "text-red-400"
                }`}
              >
                {result.healthScore ?? 0}
                <span className="text-xl text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="glass rounded-xl p-6 border border-red-500/30 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">Monthly Leak</p>
              <div className="text-4xl font-bold font-display text-red-400 flex items-center justify-center gap-1">
                <TrendingDown className="w-6 h-6" />
                {usd(result.monthlyLeakEstimateUsd || 0)}
              </div>
            </div>
            <div className="glass rounded-xl p-6 border border-red-500/30 text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">Annualized</p>
              <div className="text-4xl font-bold font-display text-red-400 flex items-center justify-center gap-1">
                <DollarSign className="w-6 h-6" />
                {usd(result.annualLeakEstimateUsd || (result.monthlyLeakEstimateUsd || 0) * 12).replace("$", "")}
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          {result.overallDiagnosis && (
            <div className="glass rounded-xl p-6 border-l-4 border-red-500/60 border-t border-r border-b border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">Forensic Diagnosis</p>
              <p className="text-sm text-foreground leading-relaxed">{result.overallDiagnosis}</p>
            </div>
          )}

          {/* Mermaid flow */}
          {result.mermaid && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-400" /> Lead Flow Map
              </h3>
              <MermaidDiagram code={result.mermaid} />
              <div className="text-right mt-2">
                <button
                  className="text-[11px] text-muted-foreground hover:text-amber font-mono inline-flex items-center gap-1"
                  onClick={() => copy(result.mermaid, "mermaid")}
                >
                  {copiedId === "mermaid" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  copy mermaid source
                </button>
              </div>
            </div>
          )}

          {/* Stages */}
          {Array.isArray(result.stages) && result.stages.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3">Stage Benchmarks</h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Stage</th>
                      <th className="text-left p-3">Your Rate</th>
                      <th className="text-left p-3">Benchmark</th>
                      <th className="text-left p-3">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.stages.map((s: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3 font-mono">{s.conversionRate}</td>
                        <td className="p-3 font-mono text-muted-foreground">{s.benchmark}</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${verdictStyle(s.verdict)}`}>
                            {s.verdict}
                          </span>
                          {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leak points */}
          {Array.isArray(result.leakPoints) && result.leakPoints.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Leak Points
              </h3>
              <div className="space-y-3">
                {result.leakPoints.map((l: any, i: number) => (
                  <div key={i} className={`glass rounded-lg p-4 border ${severityStyle(l.severity)}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{l.location}</p>
                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded mt-1 ${severityStyle(l.severity)}`}>
                          {l.severity}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Lost / mo</p>
                        <p className="text-lg font-bold text-red-400 font-display">{usd(l.estimatedMonthlyLossUsd || 0)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1"><span className="text-foreground font-semibold">What breaks:</span> {l.whatBreaks}</p>
                    <p className="text-xs text-muted-foreground"><span className="text-foreground font-semibold">Root cause:</span> {l.rootCause}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source breakdown */}
          {Array.isArray(result.sourceBreakdown) && result.sourceBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3">Source Breakdown</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {result.sourceBreakdown.map((s: any, i: number) => (
                  <div key={i} className="glass rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{s.source}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        s.strength === "strong" ? "text-green-400 bg-green-500/10" :
                        s.strength === "weak" ? "text-red-400 bg-red-500/10" :
                        "text-amber bg-amber/10"
                      }`}>{s.strength}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top fixes */}
          {Array.isArray(result.topFixes) && result.topFixes.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber" /> Top Fixes (ranked by ROI)
              </h3>
              <div className="space-y-2">
                {result.topFixes.map((f: any, i: number) => (
                  <div key={i} className="glass rounded-lg p-4 border border-border flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber/20 text-amber flex items-center justify-center text-sm font-bold flex-shrink-0 font-display">
                      {f.rank || i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground mb-1">{f.fix}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
                        <span><span className="text-green-400">Impact:</span> {f.impact}</span>
                        <span><span className="text-amber">Effort:</span> {f.effort}</span>
                        <span><span className="text-blue-400">Time:</span> {f.timeToImplement}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick wins */}
          {Array.isArray(result.quickWins) && result.quickWins.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber" /> Quick Wins (24-48h)
              </h3>
              <div className="grid md:grid-cols-2 gap-2">
                {result.quickWins.map((q: string, i: number) => (
                  <div key={i} className="glass rounded-lg p-3 border border-amber/20 text-xs text-muted-foreground flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber flex-shrink-0 mt-0.5" />
                    {q}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-day plan */}
          {Array.isArray(result.sevenDayPlan) && result.sevenDayPlan.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-foreground font-display mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-400" /> 7-Day Fix Plan
              </h3>
              <div className="space-y-2">
                {result.sevenDayPlan.map((d: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 glass rounded-lg p-3 border border-border">
                    <span className="w-14 flex-shrink-0 text-[10px] font-mono uppercase tracking-wider text-red-400 pt-0.5">
                      Day {d.day ?? i + 1}
                    </span>
                    <p className="text-sm text-foreground">{d.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={reset}>Run another map</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadFlowMapper;
