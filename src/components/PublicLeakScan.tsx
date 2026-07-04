import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Globe, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, Search, Brain, FileSearch, Download, Bookmark, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LeakChart, type LeakChartGap } from "@/components/LeakChart";
import { generateLeakAuditPdf, type LeakAuditCategoryResult } from "@/lib/generateLeakAuditPdf";

const SAVED_KEY = "aetheris.publicScans.v1";
const LAST_EMAIL_KEY = "aetheris.publicScans.lastEmail";

type SavedScan = { url: string; ts: number; teaser: Teaser };
type SavedStore = Record<string, SavedScan[]>;

function loadStore(): SavedStore {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedStore) : {};
  } catch { return {}; }
}
function persistStore(s: SavedStore) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
function emailKey(e: string) { return e.trim().toLowerCase(); }

type TopIssue = { category: string; severity: string; title: string; hint: string; annualCost?: string };
type ReportCategory = LeakAuditCategoryResult;
type Report = {
  estimatedAnnualLeak: number;
  severity: 'CRITICAL' | 'ACTIVE' | 'MINOR';
  executiveSummary?: string;
  categories: ReportCategory[];
};
type Teaser = {
  score: number | null;
  grade: string | null;
  companyName: string;
  executiveSummary: string;
  gapCount: number;
  criticalCount: number;
  warningCount: number;
  topIssues: TopIssue[];
  chartGaps: LeakChartGap[];
  nextSteps: string[];
  report?: Report;
};

const SEV_STYLE: Record<string, { icon: any; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: "text-destructive border-destructive/40 bg-destructive/5", label: "Critical" },
  warning: { icon: AlertCircle, cls: "text-amber border-amber/40 bg-amber/5", label: "Warning" },
  info: { icon: CheckCircle2, cls: "text-muted-foreground border-border bg-muted/30", label: "Note" },
};

type PrepKey = 'fetch' | 'meta' | 'capture' | 'funnel' | 'followup' | 'reputation' | 'local' | 'brand' | 'leaks';
type Prep = { key: PrepKey; label: string; status: 'pending' | 'running' | 'done' };

const PREP_INIT: Prep[] = [
  { key: 'fetch',      label: 'Pulling homepage + sitemap',                  status: 'pending' },
  { key: 'meta',       label: 'Auditing website & SEO surface',              status: 'pending' },
  { key: 'capture',    label: 'Probing lead capture + conversion path',      status: 'pending' },
  { key: 'funnel',     label: 'Mapping sales process + qualification',       status: 'pending' },
  { key: 'followup',   label: 'Timing speed-to-lead + nurture sequences',    status: 'pending' },
  { key: 'reputation', label: 'Reading reputation + trust signals',          status: 'pending' },
  { key: 'local',      label: 'Checking local visibility + discoverability', status: 'pending' },
  { key: 'brand',      label: 'Stress-testing brand messaging',              status: 'pending' },
  { key: 'leaks',      label: 'Stacking evidence + pricing the bleed',       status: 'pending' },
];

const THOUGHTS = [
  "Okay — who is this company actually talking to?",
  "Above the fold: one dominant promise, or three competing ones?",
  "The CTA says 'Learn More.' That's not an ask. That's a shrug.",
  "Form has 7 fields. Each one past three bleeds conversions.",
  "No pricing anywhere. Buyers ghost when they have to ask.",
  "Contact form but no automated first-touch. Leads will rot.",
  "Title tag doesn't mention the buyer or the outcome. SEO is leaking.",
  "Industry says under 5 min response wins. Bet they're at hours.",
  "Reviews count, rating, case studies — what's visible to a cold buyer?",
  "Local pack — are they on the map for their own category?",
  "Brand promise is generic. Could be any competitor.",
  "Stacking it all. Putting a dollar number on the bleed.",
];

export const PublicLeakScan = () => {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [prep, setPrep] = useState<Prep[]>(PREP_INIT);
  const [selfTalk, setSelfTalk] = useState<string[]>([]);
  const [store, setStore] = useState<SavedStore>(() => loadStore());
  const [showHistory, setShowHistory] = useState(false);
  const talkRef = useRef<HTMLDivElement>(null);

  // Restore last-used email so returning visitors see their saved scans immediately.
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_EMAIL_KEY);
      if (last) setEmail(last);
    } catch { /* ignore */ }
  }, []);

  const savedForEmail = useMemo<SavedScan[]>(() => {
    if (!email.trim()) return [];
    return store[emailKey(email)] || [];
  }, [email, store]);

  // Step + monologue progression while loading
  useEffect(() => {
    if (!loading) return;
    setPrep(PREP_INIT.map((p, i) => ({ ...p, status: i === 0 ? 'running' : 'pending' })));
    setSelfTalk([THOUGHTS[0]]);

    let stepIdx = 0;
    let thoughtIdx = 1;

    const stepTimer = setInterval(() => {
      stepIdx++;
      setPrep((prev) =>
        prev.map((p, i) => {
          if (i < stepIdx) return { ...p, status: 'done' };
          if (i === stepIdx) return { ...p, status: 'running' };
          return p;
        }),
      );
      if (stepIdx >= PREP_INIT.length - 1) clearInterval(stepTimer);
    }, 1600);

    const talkTimer = setInterval(() => {
      const next = THOUGHTS[thoughtIdx % THOUGHTS.length];
      thoughtIdx++;
      setSelfTalk((prev) => [...prev, next]);
    }, 1400);

    return () => {
      clearInterval(stepTimer);
      clearInterval(talkTimer);
    };
  }, [loading]);

  useEffect(() => {
    talkRef.current?.scrollTo({ top: talkRef.current.scrollHeight, behavior: 'smooth' });
  }, [selfTalk]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your email.");
    if (!url.trim()) return toast.error("Enter your company website URL.");
    setLoading(true);
    setTeaser(null);
    try {
      const endpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-leak-scan`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), url: url.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Scan failed");
      setPrep((prev) => prev.map((p) => ({ ...p, status: 'done' })));
      setTeaser(data.teaser);
      // Save the scan locally so the visitor can pull it back up next time.
      try {
        const key = emailKey(email);
        const next: SavedStore = { ...loadStore() };
        const list = next[key] ? [...next[key]] : [];
        list.unshift({ url: url.trim(), ts: Date.now(), teaser: data.teaser });
        // Keep last 10 per email, drop duplicates of same URL
        const seen = new Set<string>();
        next[key] = list.filter((s) => {
          const k = s.url.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 10);
        persistStore(next);
        setStore(next);
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      } catch { /* ignore */ }
      toast.success("Scan saved to your email. Come back anytime to pull it up.");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const activeLabel = prep.find((p) => p.status === 'running')?.label || 'Cross-referencing signals…';
  const thoughtWords = ['scan', 'leaks', 'gaps', 'CTAs', 'forms', 'meta', 'bleed', 'angle', 'verdict'];

  return (
    <section id="public-leak-scan" className="relative px-4 py-10 scroll-mt-24">
      {/* Ambient spotlight to pull the eye */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
        <div className="w-[560px] h-[560px] max-w-full rounded-full bg-amber/10 blur-3xl" />
      </div>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crimson opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-crimson" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber">
              Live Forensic Scan · Free · No Code Required
            </span>
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.05]">
            Scan your business.<br /><span className="text-crimson italic">See every leak.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
            The AI detective audits <span className="text-foreground font-semibold">seven operational surfaces</span> — website, lead capture, sales process, follow-up speed, reputation, local visibility, and brand messaging — then hands you a downloadable forensic PDF.
          </p>
        </div>

        {savedForEmail.length > 0 && !loading && !teaser && (
          <div className="mb-4 rounded-md border border-amber/30 bg-amber/5 p-3">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-amber flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                {savedForEmail.length} saved scan{savedForEmail.length === 1 ? '' : 's'} for {email}
              </span>
              <span className="text-[11px] text-amber/80 underline">{showHistory ? 'Hide' : 'Show'}</span>
            </button>
            {showHistory && (
              <ul className="mt-3 space-y-2">
                {savedForEmail.map((s) => (
                  <li
                    key={`${s.url}-${s.ts}`}
                    className="flex items-center justify-between gap-3 rounded border border-amber/20 bg-background/50 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setUrl(s.url);
                        setTeaser(s.teaser);
                        toast.success("Loaded your saved scan.");
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm text-foreground font-display">{s.url}</div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        Saved {new Date(s.ts).toLocaleDateString()} · tap to reopen
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Remove saved scan"
                      onClick={() => {
                        const key = emailKey(email);
                        const next = { ...loadStore() };
                        next[key] = (next[key] || []).filter((x) => !(x.url === s.url && x.ts === s.ts));
                        if (next[key].length === 0) delete next[key];
                        persistStore(next);
                        setStore(next);
                      }}
                      className="text-muted-foreground hover:text-crimson transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}


        <div className="relative rounded-2xl border-2 border-amber/50 p-4 md:p-6 bg-gradient-to-br from-background/90 via-background/70 to-amber/5 backdrop-blur-xl shadow-[0_0_60px_-15px_hsl(var(--amber)/0.35)]">
          {/* Corner brackets — case-file styling */}
          <div className="pointer-events-none absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-amber rounded-tl-2xl" />
          <div className="pointer-events-none absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-amber rounded-tr-2xl" />
          <div className="pointer-events-none absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-amber rounded-bl-2xl" />
          <div className="pointer-events-none absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-amber rounded-br-2xl" />

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="detective"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-lg border-2 border-amber/40 bg-gradient-to-br from-amber/10 to-transparent p-4 space-y-3 overflow-hidden"
              >
                {/* Animated brain visualization */}
                <div className="relative h-32 rounded-md bg-background/40 border border-amber/20 overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-amber/60 shadow-[0_0_8px_hsl(var(--amber))] animate-[detective-scan_2.4s_linear_infinite]" />
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, hsl(var(--amber)/0.25) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--amber)/0.25) 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full">
                    <defs>
                      <radialGradient id="leakBrainGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="hsl(var(--amber))" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <circle cx="100" cy="60" r="48" fill="url(#leakBrainGlow)">
                      <animate attributeName="r" values="40;52;40" dur="2.2s" repeatCount="indefinite" />
                    </circle>
                    <g
                      fill="none"
                      stroke="hsl(var(--amber))"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px hsl(var(--amber)/0.6))' }}
                    >
                      <path d="M100 22 C 70 22, 52 40, 52 60 C 52 82, 72 98, 100 98 L 100 22 Z" opacity="0.85" />
                      <path d="M100 22 C 130 22, 148 40, 148 60 C 148 82, 128 98, 100 98 L 100 22 Z" opacity="0.85" />
                      <path d="M60 48 C 70 44, 80 50, 88 46" opacity="0.7" />
                      <path d="M58 62 C 70 58, 82 66, 92 60" opacity="0.7" />
                      <path d="M62 78 C 72 74, 84 82, 94 76" opacity="0.7" />
                      <path d="M112 46 C 120 50, 130 44, 140 48" opacity="0.7" />
                      <path d="M108 60 C 118 66, 130 58, 142 62" opacity="0.7" />
                      <path d="M106 76 C 116 82, 128 74, 138 78" opacity="0.7" />
                    </g>
                    {[
                      { cx: 70, cy: 48, d: '0s' },
                      { cx: 88, cy: 62, d: '0.4s' },
                      { cx: 110, cy: 50, d: '0.8s' },
                      { cx: 130, cy: 70, d: '1.2s' },
                      { cx: 96, cy: 82, d: '1.6s' },
                      { cx: 76, cy: 76, d: '2s' },
                    ].map((n, i) => (
                      <circle key={i} cx={n.cx} cy={n.cy} r="2" fill="hsl(var(--amber))">
                        <animate attributeName="r" values="1.5;4;1.5" dur="1.6s" begin={n.d} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin={n.d} repeatCount="indefinite" />
                      </circle>
                    ))}
                  </svg>
                  <div className="absolute inset-0 pointer-events-none">
                    {thoughtWords.map((w, i) => (
                      <span
                        key={w}
                        className="absolute text-[9px] font-mono uppercase tracking-wider text-amber/70"
                        style={{
                          left: `${8 + ((i * 11) % 80)}%`,
                          top: `${10 + ((i * 19) % 75)}%`,
                          animation: `detective-float 3.2s ease-in-out ${i * 0.25}s infinite`,
                        }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber bg-background/70 backdrop-blur-sm rounded px-2 py-1 border border-amber/30">
                    <Brain className="w-3 h-3 animate-pulse" />
                    <span className="truncate">{activeLabel}</span>
                    <span className="ml-auto inline-flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_0.2s_infinite]" />
                      <span className="w-1 h-1 rounded-full bg-amber animate-[detective-dot_1.2s_ease-in-out_0.4s_infinite]" />
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileSearch className="w-4 h-4 text-amber flex-shrink-0" />
                  <div>
                    <p className="text-sm font-display font-semibold text-foreground">Working the case on {(() => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch { return url; } })()}…</p>
                    <p className="text-[11px] text-muted-foreground">Detective is muttering to itself while it works.</p>
                  </div>
                </div>

                {/* Live self-talk */}
                <div className="rounded-md border border-amber/25 bg-background/60 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-amber/80 flex items-center gap-1">
                      <Brain className="w-3 h-3" /> internal monologue · live
                    </p>
                    <span className="text-[9px] font-mono text-muted-foreground">{selfTalk.length} thoughts</span>
                  </div>
                  <div ref={talkRef} className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {selfTalk.map((line, i) => {
                      const isLast = i === selfTalk.length - 1;
                      return (
                        <p
                          key={`${i}-${line.slice(0, 8)}`}
                          className={`text-[11.5px] leading-snug font-case italic animate-fade-in ${
                            isLast ? 'text-amber' : 'text-muted-foreground'
                          }`}
                        >
                          <span className="text-amber/50 mr-1.5 not-italic">›</span>
                          {line}
                          {isLast && <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber/80 align-middle animate-pulse" />}
                        </p>
                      );
                    })}
                  </div>
                </div>

                <ul className="space-y-1.5 pl-1">
                  {prep.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-[11px]">
                      {s.status === 'running' && <Loader2 className="w-3 h-3 text-amber animate-spin flex-shrink-0" />}
                      {s.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                      {s.status === 'pending' && <span className="w-3 h-3 rounded-full border border-muted-foreground/40 flex-shrink-0" />}
                      <span className={s.status === 'done' ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : !teaser ? (
              <motion.form
                key="form"
                onSubmit={submit}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-4">
                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber block mb-2">
                      Your Email
                    </label>
                    <div className="relative group">
                      <Bookmark className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber/70 group-focus-within:text-amber transition-colors" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        maxLength={255}
                        required
                        className="pl-11 h-14 text-base bg-background/80 border-amber/30 focus-visible:border-amber focus-visible:ring-2 focus-visible:ring-amber/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber block mb-2">
                      Company Website
                    </label>
                    <div className="relative group">
                      <Globe className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-amber/70 group-focus-within:text-amber transition-colors" />
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="pl-11 h-14 text-base bg-background/80 border-amber/30 focus-visible:border-amber focus-visible:ring-2 focus-visible:ring-amber/40"
                        maxLength={500}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 md:h-16 text-base md:text-lg bg-gradient-to-r from-amber via-amber to-orange-500 text-background hover:from-amber/90 hover:to-orange-500/90 font-bold tracking-wide shadow-[0_10px_30px_-10px_hsl(var(--amber)/0.6)] hover:shadow-[0_15px_40px_-10px_hsl(var(--amber)/0.8)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Search className="w-5 h-5 mr-2" /> Show Me My Leaks
                  <span className="ml-2 opacity-70">→</span>
                </Button>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="flex flex-col items-center text-center gap-1 rounded-lg border border-amber/20 bg-background/40 p-3">
                    <ShieldCheck className="w-4 h-4 text-amber" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">No spam</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 rounded-lg border border-amber/20 bg-background/40 p-3">
                    <FileSearch className="w-4 h-4 text-amber" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">PDF report</span>
                  </div>
                  <div className="flex flex-col items-center text-center gap-1 rounded-lg border border-amber/20 bg-background/40 p-3">
                    <History className="w-4 h-4 text-amber" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Auto-saved</span>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">Leak Snapshot</div>
                  <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground">
                    {teaser.companyName || url}
                  </h3>
                </div>

                <LeakChart gaps={teaser.chartGaps || []} />

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <div className="font-forensic text-2xl font-bold text-destructive">{teaser.criticalCount}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Critical</div>
                  </div>
                  <div className="rounded-md border border-amber/30 bg-amber/5 p-3">
                    <div className="font-forensic text-2xl font-bold text-amber">{teaser.warningCount}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Warnings</div>
                  </div>
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="font-forensic text-2xl font-bold text-foreground">{teaser.gapCount}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total Findings</div>
                  </div>
                </div>

                {teaser.executiveSummary && (
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed border-l-2 border-amber/50 pl-4">
                    {teaser.executiveSummary}
                  </p>
                )}

                {teaser.topIssues.length > 0 && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2">Top Leaks</div>
                    <ul className="space-y-2">
                      {teaser.topIssues.map((g, i) => {
                        const cfg = SEV_STYLE[g.severity] || SEV_STYLE.info;
                        const Icon = cfg.icon;
                        return (
                          <li key={i} className={`rounded-md border p-3 ${cfg.cls}`}>
                            <div className="flex items-start gap-2">
                              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-foreground">{g.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{g.category} · {cfg.label}</div>
                                {g.hint && <p className="text-xs text-foreground/80 mt-1">{g.hint}</p>}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {teaser.report && teaser.report.categories.length > 0 && (
                  <div className="space-y-4">
                    {/* Total bleed banner */}
                    <div className="rounded-md border-2 border-crimson/50 bg-crimson/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-crimson mb-1">
                          Estimated Annual Leak · 7-Surface Forensic Total
                        </div>
                        <div className="font-forensic text-3xl md:text-4xl font-bold text-crimson">
                          ${teaser.report.estimatedAnnualLeak.toLocaleString('en-US')} <span className="text-sm font-mono text-crimson/70">/ yr</span>
                        </div>
                      </div>
                      <div className="rotate-[-2deg] border-2 border-crimson px-3 py-1 font-mono text-xs uppercase tracking-widest text-crimson bg-background/60">
                        Severity · {teaser.report.severity}
                      </div>
                    </div>

                    <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
                      Forensic Read · 7 Operational Surfaces
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teaser.report.categories.map((c) => {
                        const tone =
                          c.pct < 50 ? 'border-crimson/50 bg-crimson/5'
                          : c.pct < 70 ? 'border-amber/40 bg-amber/5'
                          : 'border-emerald-500/30 bg-emerald-500/5';
                        const barColor =
                          c.pct < 50 ? 'bg-crimson'
                          : c.pct < 70 ? 'bg-amber'
                          : 'bg-emerald-500';
                        return (
                          <div key={c.key} className={`rounded-md border p-4 ${tone} space-y-2`}>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="font-display font-semibold text-sm text-foreground leading-tight">{c.label}</div>
                              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                {c.score}/{c.max}
                              </div>
                            </div>
                            <div className="h-1 w-full bg-background/60 rounded-full overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{ width: `${c.pct}%` }} />
                            </div>
                            {c.diagnosis && (
                              <p className="text-xs text-foreground/80 leading-relaxed">{c.diagnosis}</p>
                            )}
                            {c.topLeaks.length > 0 && (
                              <ul className="space-y-1 pt-1">
                                {c.topLeaks.slice(0, 3).map((leak, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/75">
                                    <span className="text-crimson mt-1 shrink-0">›</span>
                                    <span>{leak}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {teaser.report && (
                    <Button
                      onClick={() => {
                        try {
                          generateLeakAuditPdf({
                            email,
                            company: teaser.companyName || url,
                            revenueBand: 'Self-reported · Public Scan',
                            estimatedAnnualLeak: teaser.report!.estimatedAnnualLeak,
                            severity: teaser.report!.severity,
                            totalScore: teaser.report!.categories.reduce((a, c) => a + c.score, 0),
                            maxScore: teaser.report!.categories.reduce((a, c) => a + c.max, 0),
                            categories: teaser.report!.categories,
                          });
                          toast.success("Report downloaded.");
                        } catch (err) {
                          toast.error("Couldn't generate PDF.");
                        }
                      }}
                      className="bg-crimson hover:bg-crimson/90 text-white font-semibold"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Forensic Report (PDF)
                    </Button>
                  )}
                  <Button asChild className="bg-amber text-background hover:bg-amber/90 font-semibold">
                    <a href="#book">Book the operator to plug these leaks</a>
                  </Button>
                  <Button
                    onClick={() => { setTeaser(null); setUrl(""); }}
                    variant="outline"
                    className="border-amber/40 text-amber hover:bg-amber/10"
                  >
                    Scan another site
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default PublicLeakScan;
