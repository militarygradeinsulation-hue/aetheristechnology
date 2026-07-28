import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { SEOHead } from "@/components/SEOHead";
import { trackGoldenReportEvent } from "@/lib/goldenReportTracking";

const SCAN_STORAGE_KEY = "golden-report:active-scan";

/**
 * Embeddable Golden Report entry point.
 *
 * External sites can send a visitor here with a URL (or link to an uploaded
 * document) and the scan will auto-start.
 *
 *   /golden-report/run?url=https://acme.com&company=Acme%20Inc
 *   /golden-report/run?document=https://cdn.example.com/deck.pdf&company=Acme
 *   /golden-report/run?scan=<existing-scan-id>   (deep link to a finished scan)
 *
 * When embedded via <iframe src="...&embed=1">, chrome is stripped so the
 * report fills the frame.
 */
const GoldenReportEmbedPage: React.FC = () => {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const targetUrl = (params.get("url") || params.get("document") || "").trim();
  const company = (params.get("company") || "").trim();
  const existingScan = params.get("scan");
  const embed = params.get("embed") === "1";

  const [status, setStatus] = useState<"idle" | "starting" | "ready" | "error">(existingScan ? "ready" : "idle");
  const [activeScanId, setActiveScanId] = useState<string | null>(existingScan);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);


  useEffect(() => {
    if (startedRef.current) return;
    if (existingScan) {
      try { sessionStorage.setItem(SCAN_STORAGE_KEY, existingScan); } catch { /* ignore */ }
      trackGoldenReportEvent(existingScan, "page_view");
      return;
    }
    if (!targetUrl) return;
    startedRef.current = true;
    setStatus("starting");
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("forensic-scan-all", {
          body: { url: targetUrl, company: company || undefined },
        });
        if (error) throw error;
        const scanId = data?.scan_id;
        if (!scanId) throw new Error("No scan id returned");
        try { sessionStorage.setItem(SCAN_STORAGE_KEY, scanId); } catch { /* ignore */ }
        // Rewrite the URL so a refresh / share keeps the scan, and hand the id
        // straight to the panel (it cannot observe history.replaceState).
        const next = new URL(window.location.href);
        next.searchParams.set("scan", scanId);
        next.searchParams.delete("url");
        next.searchParams.delete("document");
        window.history.replaceState({}, "", next.toString());
        setActiveScanId(scanId);
        trackGoldenReportEvent(scanId, "page_view");
        setStatus("ready");

      } catch (e) {
        setErrorMsg((e as Error)?.message || "Failed to start scan");
        setStatus("error");
      }
    })();
  }, [targetUrl, company, existingScan]);

  const body = (
    <div className={embed ? "p-4" : "pt-24 px-4 pb-16"}>
      <div className="max-w-6xl mx-auto">
        {!embed && (
          <div className="text-center mb-8">
            <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-[1.1]">
              The <span className="text-amber italic">Golden</span> Report
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Forensic scan in progress. Your 14-chapter case file will render below as chapters complete.
            </p>
          </div>
        )}

        {status === "starting" && (
          <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 mb-4 font-mono text-xs uppercase tracking-[0.18em] text-amber">
            Booting forensic scan for {targetUrl}…
          </div>
        )}
        {status === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 mb-4 text-sm text-destructive">
            Could not start scan: {errorMsg}
          </div>
        )}
        {status === "idle" && !targetUrl && (
          <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-6 mb-4 text-sm text-muted-foreground">
            Pass a target with <code className="font-mono text-amber">?url=https://…</code> or{" "}
            <code className="font-mono text-amber">?document=https://…</code> to auto-run.
          </div>
        )}

        <ForensicScanAllPanel initialScanId={activeScanId} />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead
        title="Golden Report Scan | Aetheris"
        description="Run a Golden Report forensic scan on any URL — one URL in, a 14-chapter case file out."
        path="/golden-report/run"
      />
      {body}
    </div>
  );
};

export default GoldenReportEmbedPage;
