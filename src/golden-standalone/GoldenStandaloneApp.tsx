import { useMemo, useState, type FormEvent } from "react";
import { FileSearch2, KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/adminAuth";
import { supabase } from "@/integrations/supabase/client";

function getParams() {
  const query = new URLSearchParams(window.location.search);
  const scan = query.get("scan")?.trim() || "";
  const url = query.get("url")?.trim() || "";
  const company = query.get("company")?.trim() || "";
  const initialScanId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scan) ? scan : null;
  let initialUrl = "";
  try {
    if (url) {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      if (["http:", "https:"].includes(parsed.protocol)) initialUrl = parsed.toString();
    }
  } catch { /* A typed URL can be entered below instead. */ }
  return { initialScanId, initialUrl, initialCompany: company.slice(0, 160), embed: query.get("embed") === "1" };
}

/** Separate application mount: intentionally does not render any Aetheris site shell or routes. */
export function GoldenStandaloneApp() {
  const params = useMemo(getParams, []);
  const [authorized, setAuthorized] = useState(Boolean(getAdminToken()));
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function unlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checking || !pin.trim()) return;
    setChecking(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.functions.invoke("admin-pin-login", { body: { pin: pin.trim() } });
      if (authError || !data?.ok || typeof data.token !== "string") throw new Error("The supplied code was not accepted.");
      setAdminToken(data.token);
      setPin("");
      setAuthorized(true);
    } catch {
      setError("The code was not accepted. Use an authorized Golden Report runner code.");
    } finally { setChecking(false); }
  }

  const hasBackend = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const canShowReport = authorized || Boolean(params.initialScanId);
  return (
    <main className={`min-h-screen bg-background text-foreground ${params.embed ? "p-3 sm:p-5" : "px-4 py-8 sm:py-14"}`}>
      <div className="mx-auto max-w-6xl">
        {!params.embed && (
          <header className="mb-7 border-b border-amber-500/20 pb-7">
            <div className="flex items-center gap-2 text-amber-500">
              <FileSearch2 className="h-5 w-5" aria-hidden />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.21em]">Business forensics</span>
            </div>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight sm:text-6xl">
              Golden <span className="text-amber-500">Report</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              One website. One forensic case file. Review the evidence, financial exposure, operational friction,
              and a practical plan to correct it.
            </p>
          </header>
        )}

        {!hasBackend ? (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
            The scan service is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
            for the authorized Golden Report backend before publishing this build.
          </div>
        ) : (
          <>
            {!canShowReport && (
              <section className="mx-auto max-w-lg rounded-lg border border-amber-500/25 bg-card/80 p-5 sm:p-7" aria-labelledby="runner-heading">
                <div className="flex items-center gap-2 text-amber-500">
                  <LockKeyhole className="h-5 w-5" aria-hidden />
                  <h2 id="runner-heading" className="text-lg font-semibold">Authorized report access</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Enter your authorized runner code to generate a new Golden Report.
                  A previously issued report link may be opened without starting a scan.
                </p>
                <form onSubmit={unlock} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="golden-code">Runner code</label>
                  <input id="golden-code" type="password" autoComplete="off" inputMode="numeric"
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                    placeholder="Authorized runner code" value={pin}
                    onChange={(e) => setPin(e.target.value)} required />
                  <button type="submit" disabled={checking || !pin.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50">
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Unlock
                  </button>
                </form>
                {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" /> Runs require server-authorized access.
                </p>
              </section>
            )}
            {canShowReport && (
              <>
                {authorized && !params.embed && (
                  <div className="mb-4 flex justify-end">
                    <button type="button" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-amber-500"
                      onClick={() => { clearAdminToken(); setAuthorized(false); }}>
                      Lock report runner
                    </button>
                  </div>
                )}
                <ForensicScanAllPanel initialScanId={params.initialScanId} initialUrl={params.initialUrl}
                  initialCompany={params.initialCompany} standalone canStartScan={authorized} />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
