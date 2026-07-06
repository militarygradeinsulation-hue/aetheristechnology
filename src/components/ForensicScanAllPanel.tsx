import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ScanLine, FileDown, MessageSquare, ChevronDown, ChevronRight, Download } from "lucide-react";
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
        // Auto-expand every chapter as soon as the report lands
        const r = (data as unknown as Row).report;
        if (r?.chapters?.length) {
          setOpen((prev) => {
            if (Object.keys(prev).length >= r.chapters!.length) return prev;
            const next: Record<number, boolean> = {};
            for (const c of r.chapters!) next[c.no] = true;
            return next;
          });
        }
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
        <Card className="p-0 bg-card border-border overflow-hidden">
          <div className="p-5 border-b border-border bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500 mb-1">
                  Case File · Forensic Golden Report
                </div>
                <h4 className="font-serif text-xl font-bold truncate">{row.company_name || row.target_url}</h4>
                <a href={row.target_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground font-mono hover:text-amber-500 break-all">
                  {row.target_url}
                </a>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => downloadForensicGoldenPdf({
                    report, company: row.company_name || row.target_url, url: row.target_url, scanId: row.id,
                  })}
                  className="bg-amber-500 text-black hover:bg-amber-400"
                >
                  <FileDown className="w-4 h-4 mr-1" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`/report/${row.id}/ask`, "_blank")}>
                  <MessageSquare className="w-4 h-4 mr-1" /> Ask this report
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-6">
            <section>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">Executive Summary</div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{report.executive_summary}</div>
            </section>

            {!!(report.top_leaks?.length) && (
              <section>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">Top Leaks</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {report.top_leaks!.map((l) => (
                    <div key={l.rank} className="border border-border rounded p-3 bg-muted/20">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs text-amber-500">#{l.rank}</span>
                        {l.dollars_low != null && l.dollars_high != null && (
                          <span className="text-xs font-mono text-red-400">
                            ${l.dollars_low.toLocaleString()}-${l.dollars_high.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-1">{l.name}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">Chapters · {chapters.length}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOpen(Object.fromEntries(chapters.map((c) => [c.no, true])))}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-amber-500 px-2 py-1"
                  >Expand all</button>
                  <button
                    onClick={() => setOpen({})}
                    className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-amber-500 px-2 py-1"
                  >Collapse all</button>
                </div>
              </div>

              <div className="space-y-2">
                {chapters.map((c) => {
                  const isOpen = !!open[c.no];
                  const chapterMd = () => {
                    const lines: string[] = [];
                    lines.push(`# CH${String(c.no).padStart(2, "0")} — ${c.title}`);
                    lines.push("");
                    if (c.verdict) { lines.push(`> ${c.verdict}`); lines.push(""); }
                    if (c.what_we_found) { lines.push(`## What we found\n\n${c.what_we_found}\n`); }
                    if (c.why_its_leaking) { lines.push(`## Why it's leaking\n\n${c.why_its_leaking}\n`); }
                    if (c.what_its_costing) { lines.push(`## Cost (USD)\n\n${c.what_its_costing}\n`); }
                    if (c.what_to_do) {
                      lines.push(`## What to do\n`);
                      (["this_week","this_month","this_quarter"] as const).forEach(k => {
                        if (c.what_to_do?.[k]?.length) {
                          lines.push(`### ${k.replace("_"," ")}`);
                          for (const a of c.what_to_do![k]!) lines.push(`- ${a}`);
                          lines.push("");
                        }
                      });
                    }
                    if (c.evidence?.length) {
                      lines.push(`## Evidence`);
                      for (const e of c.evidence) lines.push(`- **${e.label}:** ${e.value}`);
                    }
                    return lines.join("\n");
                  };
                  const downloadChapter = () => {
                    const md = chapterMd();
                    const stamp = new Date().toISOString().slice(0, 10);
                    const safe = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `chapter-${c.no}`;
                    const blob = new Blob([md], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `golden-ch${String(c.no).padStart(2, "0")}-${safe}-${stamp}.md`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  };
                  return (
                    <div key={c.no} className="border border-border rounded-md bg-muted/10 overflow-hidden">
                      <div className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <button
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          onClick={() => setOpen((p) => ({ ...p, [c.no]: !isOpen }))}
                        >
                          <span className="font-mono text-amber-500 text-[10px] shrink-0">CH{String(c.no).padStart(2, "0")}</span>
                          <span className="font-serif font-semibold truncate">{c.title}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadChapter(); }}
                            title="Download this chapter"
                            className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="px-4 py-3 border-t border-border text-sm space-y-3 bg-background/40">
                          {c.verdict && (
                            <div className="border-l-2 border-red-500/60 pl-3 py-1 text-red-400 italic text-sm">{c.verdict}</div>
                          )}
                          {c.what_we_found && (
                            <div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-widest mb-1">WHAT WE FOUND</div>
                              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">{c.what_we_found}</div>
                            </div>
                          )}
                          {c.why_its_leaking && (
                            <div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-widest mb-1">WHY IT'S LEAKING</div>
                              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">{c.why_its_leaking}</div>
                            </div>
                          )}
                          {c.what_its_costing && (
                            <div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-widest mb-1">COST (USD)</div>
                              <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">{c.what_its_costing}</div>
                            </div>
                          )}
                          {c.what_to_do && (
                            <div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-widest mb-1">WHAT TO DO</div>
                              <div className="grid sm:grid-cols-3 gap-3">
                                {(["this_week","this_month","this_quarter"] as const).map((k) => (
                                  c.what_to_do?.[k]?.length ? (
                                    <div key={k} className="border border-border rounded p-2 bg-muted/20">
                                      <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">{k.replace("_"," ")}</div>
                                      <ul className="list-disc ml-4 space-y-0.5 text-sm">
                                        {c.what_to_do![k]!.map((a, i) => <li key={i}>{a}</li>)}
                                      </ul>
                                    </div>
                                  ) : null
                                ))}
                              </div>
                            </div>
                          )}
                          {c.evidence?.length ? (
                            <div>
                              <div className="text-[10px] font-mono font-bold text-amber-500 tracking-widest mb-1">EVIDENCE</div>
                              <ul className="font-mono text-xs space-y-0.5 bg-black/30 border border-border rounded p-2">
                                {c.evidence.map((e, i) => (
                                  <li key={i}><span className="text-muted-foreground">{e.label}:</span> {e.value}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </Card>
      )}
    </div>
  );
}

export default ForensicScanAllPanel;

