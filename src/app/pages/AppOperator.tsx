import { useState } from "react";
import { AppLayout } from "../AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wrench, FileText } from "lucide-react";
import { PortalSyncCard } from "../components/PortalSyncCard";
import { syncToPortal, getPortalSyncCode } from "../lib/portalSync";

function normalizeUrl(u: string) {
  const s = u.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

const AppOperator = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runGolden() {
    const url = normalizeUrl(targetUrl);
    if (!url) { setError("Enter a target URL first."); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("forensic-scan-all", { body: { url } });
      if (error) throw error;
      setResult(data as Record<string, unknown>);
      // Fire-and-forget: sync to the linked portal if a code is attached.
      if (getPortalSyncCode()) {
        syncToPortal({
          tool_type: "golden_report",
          title: `Golden Report · ${url}`,
          input_data: { url },
          output_data: (data ?? {}) as Record<string, unknown>,
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLayout>
      <div className="mb-5">
        <div className="font-case text-[10px] uppercase tracking-[0.3em] text-crimson mb-1">
          Operator Command Deck
        </div>
        <h1 className="font-forensic text-2xl md:text-3xl font-bold">
          One instrument. <span className="text-amber">The Golden Report.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a URL. Fire the full 14-chapter forensic scan.
        </p>
      </div>

      <PortalSyncCard />

      <div className="forensic-tile rounded-sm border border-amber/30 p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">

        <label className="font-case text-[10px] uppercase tracking-widest text-amber shrink-0">
          Target URL
        </label>
        <input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runGolden(); }}
          placeholder="https://example.com"
          className="flex-1 bg-background/60 border border-border rounded-sm px-3 py-1.5 text-sm font-mono"
        />
        <span className="font-case text-[9px] uppercase tracking-widest text-crimson">
          Case №2026-CT-{new Date().getMonth() + 1}{new Date().getDate()}
        </span>
      </div>

      <div className="forensic-tile rounded-sm border border-amber/30 p-4">
        <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1 flex items-center gap-1.5">
          <FileText className="h-3 w-3" /> Instrument
        </div>
        <div className="font-forensic text-xl font-bold mb-1">
          Golden Report — Full Forensic Scan All
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Every chapter, every page. Kicks off the full multi-stage forensic-scan-all pipeline.
        </p>
        <button
          onClick={runGolden}
          disabled={busy}
          className="px-4 py-2 rounded-sm bg-amber text-background font-semibold disabled:opacity-50 text-sm flex items-center gap-2"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
          Start Golden Report
        </button>
      </div>

      {(result || error) && (
        <div className="mt-6 forensic-tile rounded-sm border border-border p-4">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Result</div>
          {error && <div className="text-crimson text-xs mb-2">Error: {error}</div>}
          {result && (
            <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-96 overflow-auto text-foreground/90">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default AppOperator;
