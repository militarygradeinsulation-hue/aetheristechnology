import { useMemo, useState, type FormEvent } from "react";
import {
  Building2, Fingerprint, KeyRound, Loader2, LockKeyhole, Search,
  ShieldCheck, ScanSearch, Network, ArrowRight,
} from "lucide-react";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/adminAuth";
import { supabase } from "@/integrations/supabase/client";
import { describeGoldenEdgeFailure } from "@/lib/goldenEdgeFailure";

type Mode = "company" | "person";
const MINDPRINT_RUNNER = "https://mindsteal.lovable.app/mindprint/run";

function normalizeCompanyUrl(input: string): string {
  const u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password) throw new Error("Use a public website URL.");
  if (!u.hostname.includes(".") || /^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new Error("Enter a public company website.");
  return u.toString();
}
function normalizePersonUrl(input: string): string {
  const u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (u.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(u.hostname.toLowerCase())
      || !/^\/in\/[a-z0-9_-]+\/?$/i.test(u.pathname) || u.username || u.password) {
    throw new Error("Enter a public LinkedIn profile URL, such as linkedin.com/in/username.");
  }
  u.search = "";
  u.hash = "";
  return u.toString();
}
function initialQuery() {
  const q = new URLSearchParams(window.location.search);
  const rawId = q.get("scan") || "";
  const initialScanId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId) ? rawId : null;
  let initialUrl = "";
  let person = "";
  try { if (q.get("url")) initialUrl = normalizeCompanyUrl(q.get("url")!); } catch { /* use form */ }
  try { if (q.get("person")) person = normalizePersonUrl(q.get("person")!); } catch { /* use form */ }
  return {
    initialScanId, initialUrl, person, initialCompany: (q.get("company") || "").slice(0, 160),
    embed: q.get("embed") === "1", mode: q.get("mode") === "person" ? "person" as const : "company" as const,
  };
}

/** Portable two-engine research workspace; no original Aetheris navigation or marketing shell. */
export function GoldenStandaloneApp() {
  const params = useMemo(initialQuery, []);
  const [mode, setMode] = useState<Mode>(params.mode);
  const [companyInput, setCompanyInput] = useState(params.initialUrl);
  const [personInput, setPersonInput] = useState(params.person);
  const [runnerToken, setRunnerToken] = useState<string | null>(() => getAdminToken());
  const authorized = Boolean(runnerToken);
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [personError, setPersonError] = useState("");
  const [pendingCompanyUrl, setPendingCompanyUrl] = useState<string | null>(null);
  const [companyTarget, setCompanyTarget] = useState<string | null>(null);
  const [companyRunId, setCompanyRunId] = useState(0);
  const [personTarget, setPersonTarget] = useState<string | null>(null);
  const [personRunId, setPersonRunId] = useState(0);
  const backendReady = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  function startCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode("company");
    setCompanyError("");
    let target: string;
    try { target = normalizeCompanyUrl(companyInput); }
    catch (cause) { setCompanyError(cause instanceof Error ? cause.message : "Invalid website."); return; }
    if (!backendReady) { setCompanyError("The company scan service has not been configured on this host."); return; }
    if (!authorized) { setPendingCompanyUrl(target); return; }
    setPendingCompanyUrl(null);
    setCompanyTarget(target);
    setCompanyRunId(n => n + 1);
  }

  function startPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMode("person");
    setPersonError("");
    try {
      const url = normalizePersonUrl(personInput);
      setPersonTarget(url);
      setPersonRunId(n => n + 1);
    } catch (cause) {
      setPersonError(cause instanceof Error ? cause.message : "Invalid public LinkedIn profile.");
    }
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checking || !pin.trim()) return;
    setChecking(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.functions.invoke("admin-pin-login", {
        body: { pin: pin.trim() },
      });
      if (authError) throw authError;
      if (!data?.ok || typeof data.token !== "string") throw new Error("No runner token returned.");
      setRunnerToken(data.token);
      try { setAdminToken(data.token); } catch { /* third-party storage may be blocked */ }
      setPin("");
      if (pendingCompanyUrl) {
        setCompanyTarget(pendingCompanyUrl);
        setCompanyRunId(n => n + 1);
        setPendingCompanyUrl(null);
      }
    } catch (failure) {
      const detail = await describeGoldenEdgeFailure(failure, "runner-login");
      setError(detail.message);
    } finally { setChecking(false); }
  }

  const personSrc = useMemo(() => {
    if (!personTarget) return null;
    const params = new URLSearchParams({ embed: "1", mode: "url", url: personTarget });
    return `${MINDPRINT_RUNNER}?${params.toString()}`;
  }, [personTarget]);
  const hasCompanyResult = Boolean(params.initialScanId || companyTarget);
  const hasPersonResult = Boolean(personTarget);
  const showResults = hasCompanyResult || hasPersonResult;

  return (
    <main className={`min-h-screen bg-[#0c0d10] text-foreground ${params.embed ? "px-3 py-5 sm:px-5" : "px-4 py-9 sm:py-14"}`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-amber-500/20 pb-7">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.19em] text-amber-500">
            <Network className="h-4 w-4" /> Research Intelligence
          </div>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
            Understand the <span className="text-amber-500">company.</span><br className="hidden sm:block" />
            {" "}Understand the <span className="text-amber-500">person.</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Two links. Two evidence-driven investigations. Scan a business for operational and financial friction,
            or examine a professional profile for observable communication and decision patterns.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="min-w-0 rounded-lg border border-amber-500/30 bg-card/70 p-5 sm:p-6" aria-labelledby="company-heading">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <Building2 size={22} aria-hidden />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500">01 / Golden Report engine</div>
                <h2 id="company-heading" className="mt-1 font-serif text-2xl font-semibold">Company URL</h2>
              </div>
            </div>
            <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">
              Website evidence, positioning gaps, conversion friction, prioritized financial exposure, and the complete 14-chapter case file.
            </p>
            <form onSubmit={startCompany} className="mt-5 space-y-3">
              <label htmlFor="company-url" className="block text-xs font-semibold uppercase tracking-wider">Company website</label>
              <input id="company-url" type="text" inputMode="url" autoComplete="url" value={companyInput}
                onChange={event => setCompanyInput(event.target.value)} required
                placeholder="https://company.com"
                className="w-full min-w-0 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-amber-500" />
              <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 font-semibold text-black hover:bg-amber-400">
                <ScanSearch size={17} /> Scan company <ArrowRight size={16} />
              </button>
              {companyError && <p role="alert" className="text-sm text-red-400">{companyError}</p>}
            </form>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} /> Full forensic scans require authorized runner access.
            </p>
          </section>

          <section className="min-w-0 rounded-lg border border-amber-500/30 bg-card/70 p-5 sm:p-6" aria-labelledby="person-heading">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <Fingerprint size={22} aria-hidden />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500">02 / Mindprint engine</div>
                <h2 id="person-heading" className="mt-1 font-serif text-2xl font-semibold">Person URL</h2>
              </div>
            </div>
            <p className="mt-4 min-h-12 text-sm leading-6 text-muted-foreground">
              Evidence-backed professional patterns across communication, thinking, decisions, trust, priorities, and leadership.
            </p>
            <form onSubmit={startPerson} className="mt-5 space-y-3">
              <label htmlFor="person-url" className="block text-xs font-semibold uppercase tracking-wider">LinkedIn profile</label>
              <input id="person-url" type="text" inputMode="url" autoComplete="url" value={personInput}
                onChange={event => setPersonInput(event.target.value)} required
                placeholder="https://linkedin.com/in/person"
                className="w-full min-w-0 rounded-md border border-border bg-background p-3 text-sm outline-none focus:border-amber-500" />
              <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-amber-500/70 bg-amber-500/10 px-4 font-semibold text-amber-400 hover:bg-amber-500/20">
                <Search size={17} /> Scan person <ArrowRight size={16} />
              </button>
              {personError && <p role="alert" className="text-sm text-red-400">{personError}</p>}
            </form>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} /> Permission confirmation and source limits apply inside Mindprint.
            </p>
          </section>
        </div>

        {pendingCompanyUrl && !authorized && (
          <section aria-labelledby="unlock-heading" className="mx-auto mt-5 max-w-lg rounded-lg border border-amber-500/40 bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-amber-500">
              <LockKeyhole size={18} />
              <h2 id="unlock-heading" className="text-lg font-semibold">Authorize the Golden Report engine</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your company URL is ready. Enter an authorized runner code once to launch the full scan.
            </p>
            <form onSubmit={unlock} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="golden-runner-pin">Runner code</label>
              <input id="golden-runner-pin" type="password" autoComplete="off" inputMode="numeric" value={pin}
                onChange={event => setPin(event.target.value)} required placeholder="Authorized runner code"
                className="min-w-0 flex-1 rounded border border-border bg-background p-3 text-sm outline-none focus:border-amber-500" />
              <button type="submit" disabled={checking || !pin.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-amber-500 px-4 font-semibold text-black disabled:opacity-50">
                {checking ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} Unlock & scan
              </button>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
          </section>
        )}

        {showResults && (
          <section className="mt-7 min-w-0" aria-label="Research results">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-2xl font-semibold">Investigation results</h2>
              {authorized && (
                <button type="button" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-amber-500"
                  onClick={() => { try { clearAdminToken(); } catch { /* third-party storage */ } setRunnerToken(null); }}>
                  Lock company scanner
                </button>
              )}
            </div>
            <div className="mb-4 flex gap-2" role="tablist" aria-label="Investigations">
              {hasCompanyResult && (
                <button role="tab" type="button" aria-selected={mode === "company"} onClick={() => setMode("company")}
                  className={`rounded border px-4 py-2.5 text-sm font-semibold ${mode === "company" ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-border text-muted-foreground"}`}>Company report</button>
              )}
              {hasPersonResult && (
                <button role="tab" type="button" aria-selected={mode === "person"} onClick={() => setMode("person")}
                  className={`rounded border px-4 py-2.5 text-sm font-semibold ${mode === "person" ? "border-amber-500 bg-amber-500/15 text-amber-400" : "border-border text-muted-foreground"}`}>Person Mindprint</button>
              )}
            </div>

            {hasCompanyResult && (
              <div className={mode === "company" ? "min-w-0" : "hidden"} role="tabpanel" aria-label="Company Golden Report">
                {params.initialScanId && !companyTarget ? (
                  <ForensicScanAllPanel key={params.initialScanId} initialScanId={params.initialScanId}
                    standalone canStartScan={false} showScanForm={false} runnerToken={runnerToken} />
                ) : companyTarget ? (
                  <ForensicScanAllPanel key={companyRunId} initialUrl={companyTarget} initialCompany={params.initialCompany}
                    standalone canStartScan={authorized} autoStart showScanForm={false} runnerToken={runnerToken}
                    onRunnerUnauthorized={() => {
                      try { clearAdminToken(); } catch { /* storage restricted */ }
                      setRunnerToken(null);
                      setPendingCompanyUrl(companyTarget);
                    }} />
                ) : null}
              </div>
            )}
            {personSrc && (
              <div className={mode === "person" ? "min-w-0" : "hidden"} role="tabpanel" aria-label="Person Mindprint report">
                <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                  Mindprint uses its own source-backed analysis service. Confirm permission inside the scanner to analyze this profile.
                  Profiles with limited public writing may require pasted professional text.
                </div>
                <iframe key={personRunId} title="Mindprint professional profile scanner" src={personSrc}
                  className="w-full rounded-lg border border-amber-500/30 bg-[#0b0a09]"
                  style={{ minHeight: "1650px" }}
                  loading="eager" referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
                  allow="clipboard-write" />
              </div>
            )}
          </section>
        )}

        <p className="mt-8 border-t border-border/50 pt-5 text-[11px] leading-5 text-muted-foreground">
          Both scans distinguish observed evidence from interpretation. Company financial exposure is an estimate unless verified.
          Professional content cannot prove private thoughts, personality diagnoses, or future behavior.
        </p>
      </div>
    </main>
  );
}
