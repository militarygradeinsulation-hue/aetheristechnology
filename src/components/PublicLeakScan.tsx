import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Globe, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, Search, Brain, FileSearch, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LeakChart, type LeakChartGap } from "@/components/LeakChart";
import { generateLeakAuditPdf, type LeakAuditCategoryResult } from "@/lib/generateLeakAuditPdf";

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
  const talkRef = useRef<HTMLDivElement>(null);

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
    }, 2200);

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
      toast.success("Scan complete. We've logged your leaks.");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const activeLabel = prep.find((p) => p.status === 'running')?.label || 'Cross-referencing signals…';
  const thoughtWords = ['scan', 'leaks', 'gaps', 'CTAs', 'forms', 'meta', 'bleed', 'angle', 'verdict'];

  return (
    <section id="public-leak-scan" className="relative px-4 py-16 scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
            Free · No operator code required
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
            Scan your site. <span className="text-crimson italic">See your leaks.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
            Drop your email and company URL. Watch the AI detective work the case in real time — then see exactly where your leads are leaking out.
          </p>
        </div>

        <div className="rounded-md border border-amber/30 p-5 md:p-8 bg-background/40 backdrop-blur">
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
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      maxLength={255}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Company Website
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="pl-9"
                        maxLength={500}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto bg-amber text-background hover:bg-amber/90 font-semibold"
                >
                  <Search className="w-4 h-4 mr-2" /> Show me my leaks
                </Button>

                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" />
                  No spam. Your scan is logged so we can follow up only if you want help fixing it.
                </p>
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => { setTeaser(null); setUrl(""); }}
                    variant="outline"
                    className="border-amber/40 text-amber hover:bg-amber/10"
                  >
                    Scan another site
                  </Button>
                  <Button asChild className="bg-amber text-background hover:bg-amber/90 font-semibold">
                    <a href="#book">Book the operator to plug these leaks</a>
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
