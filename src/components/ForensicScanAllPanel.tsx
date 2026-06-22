import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ScanLine, FileDown, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { downloadForensicGoldenPdf, type ForensicReport, type Chapter } from "@/lib/generateForensicGoldenPdf";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  target_url: string;
  company_name: string | null;
  status: string;
  stage_status: Record<string, { state: string; at: string; extra?: unknown }>;
  report: ForensicReport | null;
  error_message: string | null;
};

const STAGES: { key: string; label: string }[] = [
  { key: "queued",        label: "Queued" },
  { key: "site",          label: "Site crawl + branding" },
  { key: "scan_website",  label: "Website forensics" },
  { key: "friction",      label: "Brand contradictions + friction audit" },
  { key: "crm",           label: "CRM / pipeline forensics" },
  { key: "synth",         label: "Synthesizing 14-chapter report" },
];

export function ForensicScanAllPanel() {
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const pollRef = useRef<number | null>(null);

  const isAdmin = !!getAdminToken();
  const headers: Record<string, string> = isAdmin
    ? { "x-admin-token": getAdminToken() || "" }
    : { "x-portal-token": getPortalToken() || "" };

  async function startScan() {
    if (!url.trim()) { toast({ title: "Enter a URL", variant: "destructive" }); return; }
    setBusy(true);
    setScanId(null); setRow(null);
    try {
      const { data, error } = await supabase.functions.invoke("forensic-scan-all", {
        body: { url: url.trim(), company: company.trim() || undefined },
        headers,
      });
      if (error) throw error;
      if (!data?.scan_id) throw new Error("No scan id returned");
      setScanId(data.scan_id);
    } catch (e) {
      toast({ title: "Scan failed to start", description: String((e as Error).message || e), variant: "destructive" });
    } finally { setBusy(false); }
  }

  // poll
  useEffect(() => {
    if (!scanId) return;
    let stopped = false;
    const tick = async () => {
      const { data, error } = await supabase.from("forensic_scans").select("*").eq("id", scanId).single();
      if (!error && data && !stopped) {
        setRow(data as unknown as Row);
        if (data.status === "completed" || data.status === "failed") return;
      }
      pollRef.current = window.setTimeout(tick, 3000) as unknown as number;
    };
    tick();
    return () => {
      stopped = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [scanId]);

  const stageState = (key: string) => row?.stage_status?.[key]?.state || (scanId ? "pending" : "");
  const report = row?.report || null;
  const chapters: Chapter[] = report?.chapters || [];

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold tracking-wide">Forensic Scan All — Golden Report</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Runs every diagnostic against one target: site crawl, SEO, brand contradictions, friction vocabulary,
          and (when connected) pipeline forensics. Builds a 14-chapter Smart PDF you can search or ask questions of.
        </p>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <Input placeholder="Target URL (https://example.com)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Company name (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <Button onClick={startScan} disabled={busy || (!!scanId && row?.status !== "completed" && row?.status !== "failed")} className="bg-amber-500 text-black hover:bg-amber-400">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
          Run Scan All
        </Button>
      </Card>

      {scanId && (
        <Card className="p-4 bg-card border-border">
          <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">Progress</h4>
          <ul className="space-y-1.5">
            {STAGES.map((s) => {
              const st = stageState(s.key);
              const dot =
                st === "done" ? "bg-green-500" :
                st === "running" ? "bg-amber-500 animate-pulse" :
                st === "skipped" ? "bg-zinc-500" : "bg-zinc-700";
              return (
                <li key={s.key} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span>{s.label}</span>
                  {st === "skipped" && <span className="text-xs text-muted-foreground">(skipped)</span>}
                </li>
              );
            })}
          </ul>
          {row?.status === "failed" && (
            <p className="mt-3 text-sm text-red-400">Failed: {row.error_message}</p>
          )}
        </Card>
      )}

      {report && row && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="font-semibold">Report — {row.company_name || row.target_url}</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadForensicGoldenPdf({
                report, company: row.company_name || row.target_url, url: row.target_url, scanId: row.id,
              })}>
                <FileDown className="w-4 h-4 mr-1" /> Download Smart PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(`/report/${row.id}/ask`, "_blank")}>
                <MessageSquare className="w-4 h-4 mr-1" /> Ask this report
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider text-amber-500 mb-1">Executive Summary</div>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{report.executive_summary}</div>
          </div>

          {!!(report.top_leaks?.length) && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wider text-amber-500 mb-2">Top Leaks</div>
              <ol className="space-y-1 text-sm">
                {report.top_leaks!.map((l) => (
                  <li key={l.rank}>
                    <span className="text-amber-500 font-mono mr-2">#{l.rank}</span>
                    <span className="font-semibold">{l.name}</span>
                    {l.dollars_low != null && l.dollars_high != null && (
                      <span className="text-muted-foreground ml-2">
                        ${l.dollars_low.toLocaleString()}–${l.dollars_high.toLocaleString()}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-amber-500 mb-1">Index — 14 Chapters</div>
            {chapters.map((c) => {
              const isOpen = !!open[c.no];
              return (
                <div key={c.no} className="border border-border rounded">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30"
                    onClick={() => setOpen((p) => ({ ...p, [c.no]: !isOpen }))}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-amber-500 text-xs">CH{String(c.no).padStart(2, "0")}</span>
                      <span className="font-semibold">{c.title}</span>
                    </span>
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  {isOpen && (
                    <div className="px-3 py-2 border-t border-border text-sm space-y-2">
                      {c.verdict && <p className="text-red-400 italic">{c.verdict}</p>}
                      {c.what_we_found && <div><div className="text-xs font-bold text-amber-500 mb-1">WHAT WE FOUND</div><div className="whitespace-pre-wrap">{c.what_we_found}</div></div>}
                      {c.why_its_leaking && <div><div className="text-xs font-bold text-amber-500 mb-1">WHY IT'S LEAKING</div><div className="whitespace-pre-wrap">{c.why_its_leaking}</div></div>}
                      {c.what_its_costing && <div><div className="text-xs font-bold text-amber-500 mb-1">COST (USD)</div><div className="whitespace-pre-wrap">{c.what_its_costing}</div></div>}
                      {c.what_to_do && (
                        <div>
                          <div className="text-xs font-bold text-amber-500 mb-1">WHAT TO DO</div>
                          {(["this_week","this_month","this_quarter"] as const).map((k) => (
                            (c.what_to_do?.[k]?.length ? (
                              <div key={k} className="mb-1">
                                <div className="font-semibold capitalize">{k.replace("_"," ")}</div>
                                <ul className="list-disc ml-5">
                                  {c.what_to_do![k]!.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                              </div>
                            ) : null)
                          ))}
                        </div>
                      )}
                      {c.evidence?.length ? (
                        <div>
                          <div className="text-xs font-bold text-amber-500 mb-1">EVIDENCE</div>
                          <ul className="font-mono text-xs space-y-0.5">
                            {c.evidence.map((e, i) => <li key={i}><span className="text-muted-foreground">{e.label}:</span> {e.value}</li>)}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default ForensicScanAllPanel;
