import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Globe, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LeakChart, type LeakChartGap } from "@/components/LeakChart";

type TopIssue = { category: string; severity: string; title: string; hint: string; annualCost?: string };
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
};

const SEV_STYLE: Record<string, { icon: any; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: "text-destructive border-destructive/40 bg-destructive/5", label: "Critical" },
  warning: { icon: AlertCircle, cls: "text-amber border-amber/40 bg-amber/5", label: "Warning" },
  info: { icon: CheckCircle2, cls: "text-muted-foreground border-border bg-muted/30", label: "Note" },
};

export const PublicLeakScan = () => {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);

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
      setTeaser(data.teaser);
      toast.success("Scan complete. We've logged your leaks.");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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
            Drop your email and company URL. In about 30 seconds you'll see how many leads are slipping past your funnel and exactly where the holes are — with a graph, not a sales pitch.
          </p>
        </div>

        <div className="rounded-md border border-amber/30 p-5 md:p-8 bg-background/40 backdrop-blur">
          <AnimatePresence mode="wait">
            {!teaser ? (
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
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning your site…</>
                  ) : (
                    <><Search className="w-4 h-4 mr-2" /> Show me my leaks</>
                  )}
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

                {/* LOST LEADS + $ LEAK FIRST, THEN CHART. ROI deliberately not shown here. */}
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
