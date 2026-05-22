import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Globe, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type TopIssue = { category: string; severity: string; title: string; hint: string };
type Teaser = {
  score: number | null;
  grade: string | null;
  companyName: string;
  executiveSummary: string;
  gapCount: number;
  criticalCount: number;
  warningCount: number;
  topIssues: TopIssue[];
  contradictions: TopIssue[];
  friction: TopIssue[];
  nextSteps: string[];
};

const SEV_STYLE: Record<string, { icon: any; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: "text-destructive border-destructive/40 bg-destructive/5", label: "Critical" },
  warning: { icon: AlertCircle, cls: "text-amber border-amber/40 bg-amber/5", label: "Warning" },
  info: { icon: CheckCircle2, cls: "text-muted-foreground border-border bg-muted/30", label: "Note" },
};

export const RepCodeFreeScan = () => {
  const [repCode, setRepCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);
  const [operator, setOperator] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repCode.trim()) return toast.error("Enter your operator's code.");
    if (!email.trim()) return toast.error("Enter your email so we can send the full report.");
    if (!url.trim()) return toast.error("Enter the website URL to scan.");
    setLoading(true);
    setTeaser(null);
    try {
      const endpoint = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/rep-code-scan`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rep_code: repCode.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          url: url.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Scan failed");
      setTeaser(data.teaser);
      setOperator(data.operator || null);
      toast.success("Scan complete. Your operator has your details.");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTeaser(null);
    setOperator(null);
  };

  return (
    <section id="free-scan" className="relative px-4 py-16 scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" /> Operator code required
          </div>
          <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground">
            Free <span className="text-amber">website leak scan.</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
            Got a code from one of our operators? Paste it in and we'll surface the biggest leaks, contradictions, and friction points on your site. You'll see enough to know it's real. Your operator will follow up with the rest.
          </p>
        </div>

        <div className="forensic-tile rounded-sm border border-amber/30 p-5 md:p-8 bg-background/40 backdrop-blur">
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
                  <div className="md:col-span-2">
                    <label className="font-case text-[10px] uppercase tracking-widest text-amber block mb-1">
                      Operator Code
                    </label>
                    <Input
                      value={repCode}
                      onChange={(e) => setRepCode(e.target.value.toUpperCase())}
                      placeholder="e.g. OP-J7K2"
                      className="font-mono uppercase tracking-wider"
                      maxLength={32}
                      required
                    />
                  </div>
                  <div>
                    <label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Your Name
                    </label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" maxLength={120} />
                  </div>
                  <div>
                    <label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Company
                    </label>
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Co." maxLength={200} />
                  </div>
                  <div>
                    <label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Email
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
                    <label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Phone (optional)
                    </label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" maxLength={40} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
                      Website to Scan
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

                <Button type="submit" disabled={loading} className="w-full md:w-auto bg-amber text-background hover:bg-amber/90 font-semibold">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…</>
                  ) : (
                    <>Run Free Leak Scan</>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" />
                  Your details go directly to the operator whose code you entered. No public list. No spam.
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
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                  <div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Scan Snapshot</div>
                    <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground">
                      {teaser.companyName || "Your site"}
                    </h3>
                    {operator && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Routed to operator: <span className="text-amber font-semibold">{operator}</span>
                      </p>
                    )}
                  </div>
                  {typeof teaser.score === "number" && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-forensic text-5xl font-bold text-foreground">{teaser.score}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                      {teaser.grade && <span className="text-amber font-semibold ml-1">{teaser.grade}</span>}
                    </div>
                  )}
                </div>

                {teaser.executiveSummary && (
                  <p className="text-sm md:text-base text-foreground/90 leading-relaxed border-l-2 border-amber/50 pl-4">
                    {teaser.executiveSummary}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3">
                    <div className="font-forensic text-2xl font-bold text-destructive">{teaser.criticalCount}</div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Critical</div>
                  </div>
                  <div className="rounded-sm border border-amber/30 bg-amber/5 p-3">
                    <div className="font-forensic text-2xl font-bold text-amber">{teaser.warningCount}</div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Warnings</div>
                  </div>
                  <div className="rounded-sm border border-border bg-muted/20 p-3">
                    <div className="font-forensic text-2xl font-bold text-foreground">{teaser.gapCount}</div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Total Findings</div>
                  </div>
                </div>

                {teaser.topIssues.length > 0 && (
                  <div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Top Findings (preview)</div>
                    <ul className="space-y-2">
                      {teaser.topIssues.map((g, i) => {
                        const cfg = SEV_STYLE[g.severity] || SEV_STYLE.info;
                        const Icon = cfg.icon;
                        return (
                          <li key={i} className={`rounded-sm border p-3 ${cfg.cls}`}>
                            <div className="flex items-start gap-2">
                              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-foreground">
                                  {g.title}
                                </div>
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

                <div className="rounded-sm border border-amber/40 bg-amber/5 p-4">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">What you're not seeing</div>
                  <p className="text-sm text-foreground/90">
                    Full revenue-leak math, the contradiction map, friction-point teardown, prioritized 90-day roadmap, and ROI table.
                    Your operator{operator ? <> <span className="text-amber font-semibold">({operator})</span></> : ""} has the complete report and will reach out with the next move.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={reset} variant="outline" className="border-amber/40 text-amber hover:bg-amber/10">
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
