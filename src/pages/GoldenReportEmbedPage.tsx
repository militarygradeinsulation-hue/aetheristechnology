import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { SEOHead } from "@/components/SEOHead";
import { trackGoldenReportEvent } from "@/lib/goldenReportTracking";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/adminAuth";
import { describeGoldenEdgeFailure } from "@/lib/goldenEdgeFailure";

const SCAN_STORAGE_KEY = "golden-report:active-scan";

/**
 * Embeddable Golden Report runner.
 *
 * An embedded page does NOT inherit an Aetheris runner login from the host
 * website. Start scans only when an authorized server-issued runner token is
 * available. Existing non-private scan links can still be viewed without it.
 */
const GoldenReportEmbedPage: React.FC = () => {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const targetUrl = (params.get("url") || params.get("document") || "").trim();
  const company = (params.get("company") || "").trim();
  const existingScan = params.get("scan");
  const embed = params.get("embed") === "1";

  const [runnerToken, setRunnerToken] = useState<string | null>(() => getAdminToken());
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [status, setStatus] = useState<"idle" | "starting" | "ready" | "error">(existingScan ? "ready" : "idle");
  const [activeScanId, setActiveScanId] = useState<string | null>(existingScan);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);
  const navigate = useNavigate();

  const resetAuthorization = () => {
    setRunnerToken(null);
    try { clearAdminToken(); } catch { /* cross-site storage can be blocked */ }
    startedRef.current = false;
    setStatus(existingScan ? "ready" : "idle");
    setAccessError("Your runner session was rejected or expired. Enter your authorized code again.");
  };

  const unlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checking || !pin.trim()) return;
    setChecking(true);
    setAccessError("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-pin-login", {
        body: { pin: pin.trim() },
      });
      if (error) throw error;
      if (!data?.ok || typeof data.token !== "string") throw new Error("No runner token returned");
      // Keep the token in React memory for browsers that block third-party
      // iframe storage. Persist only when storage is supported.
      setRunnerToken(data.token);
      try { setAdminToken(data.token); } catch { /* memory token is sufficient */ }
      setPin("");
      setErrorMsg(null);
    } catch (error) {
      const detail = await describeGoldenEdgeFailure(error, "runner-login");
      setAccessError(detail.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    if (existingScan) {
      startedRef.current = true;
      try { sessionStorage.setItem(SCAN_STORAGE_KEY, existingScan); } catch { /* optional */ }
      trackGoldenReportEvent(existingScan, "page_view");
      return;
    }
    // Never invoke the privileged scan before a verified runner login.
    if (!targetUrl || !runnerToken) return;
    startedRef.current = true;
    setStatus("starting");
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("forensic-scan-all", {
          body: { url: targetUrl, company: company || undefined },
          headers: { "x-admin-token": runnerToken },
        });
        if (error) throw error;
        if (!data?.scan_id) throw new Error("No scan id returned");
        const scanId = String(data.scan_id);
        try { sessionStorage.setItem(SCAN_STORAGE_KEY, scanId); } catch { /* optional */ }
        const next = new URL(window.location.href);
        next.searchParams.set("scan", scanId);
        next.searchParams.delete("url");
        next.searchParams.delete("document");
        window.history.replaceState({}, "", next.toString());
        setActiveScanId(scanId);
        trackGoldenReportEvent(scanId, "page_view");
        setStatus("ready");
      } catch (error) {
        const detail = await describeGoldenEdgeFailure(error, "scan-start");
        setErrorMsg(detail.message);
        setStatus("error");
        if (detail.authorizationRequired) resetAuthorization();
      }
    })();
  }, [targetUrl, company, existingScan, runnerToken]);

  const backButton = (
    <button type="button"
      onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
      className="inline-flex items-center gap-2 rounded-lg border border-amber/40 bg-amber/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-amber transition-colors hover:bg-amber/20">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead title="Golden Report Scan | Aetheris"
        description="Run an authorized Golden Report forensic scan and review the resulting case file."
        path="/golden-report/run" />
      <div className={embed ? "p-4" : "pt-24 px-4 pb-16"}>
        <div className="mx-auto max-w-6xl">
          {!embed && (
            <div className="mb-8 text-center">
              <h1 className="font-forensic text-3xl font-bold md:text-5xl">
                The <span className="italic text-amber">Golden</span> Report
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
                Enter a website and generate an authorized 14-chapter forensic case file.
              </p>
            </div>
          )}
          {!runnerToken && !existingScan && (
            <section className="mx-auto max-w-lg rounded-lg border border-amber/30 bg-card p-5 sm:p-7"
              aria-labelledby="golden-runner-heading">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-amber" aria-hidden="true" />
                <h2 id="golden-runner-heading" className="text-lg font-semibold">Authorized report access</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Full Golden Reports require an authorized Aetheris runner code.
                Enter your code to scan a website within this page.
              </p>
              <form onSubmit={unlock} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="embedded-golden-runner-code">Runner code</label>
                <input id="embedded-golden-runner-code" type="password" inputMode="numeric" autoComplete="off"
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-base"
                  value={pin} onChange={(event) => setPin(event.target.value)} required
                  placeholder="Authorized runner code" />
                <button type="submit" disabled={checking || !pin.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-amber px-5 py-2.5 font-semibold text-black disabled:opacity-50">
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Unlock
                </button>
              </form>
              {accessError && <p className="mt-3 text-sm text-red-400" role="alert">{accessError}</p>}
              {errorMsg && <p className="mt-3 text-sm text-red-400" role="alert">{errorMsg}</p>}
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" /> An existing public report link can be viewed without generating a new scan.
              </p>
            </section>
          )}
          {runnerToken && !embed && (
            <div className="mb-4 flex justify-end">
              <button className="text-xs text-muted-foreground underline" onClick={resetAuthorization}>
                Lock report runner
              </button>
            </div>
          )}
          {status === "starting" && (
            <p role="status" className="mb-4 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-sm text-amber">
              Starting the forensic scan for {targetUrl}…
            </p>
          )}
          {status === "error" && runnerToken && errorMsg && (
            <p role="alert" className="mb-4 rounded-lg border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </p>
          )}
          {(runnerToken || existingScan) && (
            <>
              {!embed && status === "ready" && <div className="mb-4">{backButton}</div>}
              <ForensicScanAllPanel initialScanId={activeScanId} initialUrl={targetUrl}
                initialCompany={company} standalone={embed} canStartScan={Boolean(runnerToken)}
                runnerToken={runnerToken} onRunnerUnauthorized={resetAuthorization} />
              {!embed && status === "ready" && <div className="mt-8 flex justify-center">{backButton}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoldenReportEmbedPage;
