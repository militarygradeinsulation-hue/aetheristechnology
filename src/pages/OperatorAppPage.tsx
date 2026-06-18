import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Search, MessageSquare, Sparkles, Database, Wrench,
  AlertTriangle, TrendingDown, Target, CheckCircle2, Copy, Send,
  Building2, Users, ArrowRight, FileWarning, Activity, Bot,
} from "lucide-react";
import { toast } from "sonner";
import AgentsTab from "@/components/AgentsTab";
import { MatrixRain } from "@/components/MatrixRain";

// ─────────────────────────── shared bits ───────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/90 mb-1.5">
      {children}
    </div>
  );
}

function CaseTile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-sm border border-amber/25 bg-card/60 backdrop-blur p-4 ${className}`}>
      {children}
    </div>
  );
}

function StatChip({ label, value, tone = "amber" }: { label: string; value: string; tone?: "amber" | "crimson" | "muted" }) {
  const colors =
    tone === "crimson" ? "border-destructive/40 text-destructive bg-destructive/5"
    : tone === "muted" ? "border-border text-muted-foreground bg-muted/20"
    : "border-amber/40 text-amber bg-amber/5";
  return (
    <div className={`rounded-sm border px-2.5 py-1.5 ${colors}`}>
      <div className="font-mono text-[9px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}
      className="h-8 border-amber/30 text-amber hover:bg-amber/10"
    >
      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
    </Button>
  );
}

// ─────────────────────────── SCAN ───────────────────────────
function ScanTab() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [r, setR] = useState<any>(null);

  const run = async () => {
    if (!url.trim()) return;
    setLoading(true); setR(null);
    try {
      const { data, error } = await supabase.functions.invoke("extension-leak-scan", { body: { url: url.trim() } });
      if (error) throw error;
      setR(data);
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <CaseTile>
        <Label>Target URL</Label>
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" inputMode="url" autoCapitalize="off" autoCorrect="off" className="bg-background/60 border-amber/20" />
          <Button onClick={run} disabled={loading} className="bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-1.5" />Scan</>}
          </Button>
        </div>
      </CaseTile>

      {loading && (
        <CaseTile className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber mx-auto mb-2" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber">Running forensic scan…</div>
        </CaseTile>
      )}

      {r && !r.error && (
        <>
          {/* Verdict card */}
          <div className="relative rounded-sm border-2 border-destructive/60 bg-gradient-to-b from-destructive/10 to-card p-4 shadow-[0_0_30px_-15px_hsl(var(--destructive))] overflow-hidden">
            <div className="absolute top-3 right-3 rotate-6 border-2 border-destructive/70 text-destructive font-mono text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 opacity-90 pointer-events-none">
              ACTIVE
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive font-bold flex items-center gap-1.5 mb-2">
              <FileWarning className="w-3.5 h-3.5" /> Case File · {r.host}
            </div>
            <div className="font-display text-xl font-bold leading-tight mb-1">{r.companyName}</div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-amber mb-3">
              Annual leak · <span className="text-base font-bold">{r.totalAnnualLeak}</span>
            </div>
            <p className="text-sm italic text-foreground/90 border-l-2 border-amber pl-3 py-1 bg-black/30">{r.executiveSummary}</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <StatChip label="Grade" value={String(r.grade || "—")} tone={r.grade === 'F' || r.grade === 'D' ? "crimson" : "amber"} />
              <StatChip label="Score" value={`${r.score}/100`} tone="amber" />
              <StatChip label="Gaps" value={String(r.gaps?.length || 0)} tone="crimson" />
            </div>
          </div>

          {/* FORENSIC NARRATIVE — root causes + clue trail */}
          {r.forensics?.rootCauses?.length > 0 && (
            <CaseTile className="border-amber/40">
              <Label>Root Causes · Why It's Leaking</Label>
              <ul className="space-y-1.5">
                {r.forensics.rootCauses.map((c: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className="font-mono text-[10px] text-amber font-bold mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </CaseTile>
          )}

          {r.forensics?.clueTrail?.length > 0 && (
            <CaseTile>
              <Label>Clue Trail · Evidence Log</Label>
              <div className="space-y-2">
                {r.forensics.clueTrail.map((c: any, i: number) => (
                  <div key={i} className="rounded-sm border border-amber/25 bg-black/30 p-3 relative">
                    <div className="absolute -left-px top-0 bottom-0 w-[3px] bg-amber/60" />
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[9px] text-amber/90 font-bold border border-amber/40 rounded-sm px-1.5 py-0.5">
                        EVIDENCE-{String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-bold text-sm">{c.clue}</span>
                    </div>
                    {c.evidence && (
                      <div className="text-xs italic text-foreground/80 border-l border-muted pl-2 py-0.5 mb-1.5">
                        "{c.evidence}"
                      </div>
                    )}
                    {c.implication && (
                      <div className="text-xs text-muted-foreground">
                        <span className="text-amber/80 font-mono uppercase tracking-wider text-[9px]">→ Implication </span>
                        {c.implication}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CaseTile>
          )}

          {r.forensics?.deepLeaks?.length > 0 && (
            <CaseTile className="border-destructive/40">
              <Label>Deep Leaks · Mechanism + Trigger</Label>
              <div className="space-y-2">
                {r.forensics.deepLeaks.map((l: any, i: number) => (
                  <div key={i} className="rounded-sm border border-destructive/30 bg-destructive/5 p-3">
                    <div className="font-bold text-sm flex items-center gap-1.5 mb-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                      {l.title}
                    </div>
                    {l.mechanism && (
                      <div className="text-xs mb-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-destructive">Mechanism · </span>
                        {l.mechanism}
                      </div>
                    )}
                    {l.trigger && (
                      <div className="text-xs mb-1">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-amber">Trigger · </span>
                        {l.trigger}
                      </div>
                    )}
                    {l.fix && (
                      <div className="text-xs">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">Fix · </span>
                        {l.fix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CaseTile>
          )}

          {r.forensics?.buyerJourneyBreakpoints?.length > 0 && (
            <CaseTile>
              <Label>Buyer Bail Points</Label>
              <ul className="space-y-1.5">
                {r.forensics.buyerJourneyBreakpoints.map((b: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2 items-start">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-1" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </CaseTile>
          )}

          {/* Surface-level gap inventory */}
          {!!r.gaps?.length && (
            <CaseTile>
              <Label>Leak Inventory · Surface Scan</Label>
              <div className="space-y-2">
                {r.gaps.map((g: any, i: number) => (
                  <div key={i} className="rounded-sm border border-destructive/25 bg-destructive/5 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-bold text-sm flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                        {g.title || g.name || `Gap ${i + 1}`}
                      </div>
                      {g.annualCost && <div className="font-mono text-[11px] text-amber whitespace-nowrap font-bold">{g.annualCost}</div>}
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground leading-relaxed">{g.description}</p>}
                  </div>
                ))}
              </div>
            </CaseTile>
          )}

          {/* Roadmap */}
          {!!r.roadmap?.length && (
            <CaseTile>
              <Label>Recovery Roadmap</Label>
              <ol className="space-y-2">
                {r.roadmap.map((s: any, i: number) => (
                  <li key={i} className="flex gap-3 items-start">
                    <div className="font-mono text-[10px] font-bold text-amber border border-amber/40 rounded-sm px-1.5 py-0.5 mt-0.5">{String(i + 1).padStart(2, '0')}</div>
                    <div className="flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-amber">{s.month}</div>
                      <div className="text-sm">{s.action}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CaseTile>
          )}

          {/* Next steps */}
          {!!r.nextSteps?.length && (
            <CaseTile>
              <Label>Ship This Week</Label>
              <ul className="space-y-1.5">
                {r.nextSteps.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CaseTile>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────── OPERATOR ───────────────────────────
type Msg = { role: "user" | "ai"; text: string };
function OperatorTab() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);

  const chips = [
    { short: "Biggest leak", full: "What's the single biggest leak on this page? Name it and the fix." },
    { short: "Rewrite hero", full: "Rewrite the hero headline. 3 options under 12 words." },
    { short: "$ estimate", full: "Estimate annual revenue this page is leaking in USD." },
    { short: "5-axis score", full: "Score 1-10: clarity, proof, friction, capture, urgency." },
  ];

  const send = async (text?: string) => {
    const msg = (text ?? prompt).trim();
    if (!msg) return;
    setLog(l => [...l, { role: "user", text: msg }]);
    setPrompt(""); setLoading(true);
    try {
      const history = log.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const { data, error } = await supabase.functions.invoke("extension-operator-chat", {
        body: { pageUrl: url.trim() || undefined, userText: msg, history },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const reply = data?.reply || data?.text || "(no reply)";
      setLog(l => [...l, { role: "ai", text: reply }]);
    } catch (e: any) {
      toast.error(e?.message || "Operator failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <CaseTile>
        <Label>Page context (optional)</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://prospect.com" inputMode="url" autoCapitalize="off" autoCorrect="off" className="bg-background/60 border-amber/20" />
      </CaseTile>

      <div className="flex flex-wrap gap-1.5">
        {chips.map(c => (
          <button key={c.short} onClick={() => send(c.full)}
            className="text-[10px] font-mono uppercase tracking-wider border border-amber/30 text-amber/90 px-2.5 py-1 rounded-sm hover:bg-amber/10 transition-colors">
            {c.short}
          </button>
        ))}
      </div>

      {log.length > 0 && (
        <div className="space-y-2">
          {log.map((m, i) => (
            <div key={i} className={m.role === "user"
              ? "rounded-sm border border-amber/30 bg-amber/5 p-3 ml-6"
              : "rounded-sm border border-border bg-card/60 p-3 mr-6"
            }>
              <div className={`font-mono text-[9px] uppercase tracking-widest mb-1 ${m.role === "user" ? "text-amber" : "text-muted-foreground"}`}>
                {m.role === "user" ? "You" : "Operator"}
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</div>
              {m.role === "ai" && <div className="mt-2 flex justify-end"><CopyBtn text={m.text} /></div>}
            </div>
          ))}
          {loading && (
            <div className="rounded-sm border border-border bg-card/60 p-3 mr-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-amber" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Operator thinking…</span>
            </div>
          )}
        </div>
      )}

      <CaseTile>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Ask the operator…" className="bg-background/60 border-amber/20 resize-none" />
        <Button onClick={() => send()} disabled={loading || !prompt.trim()} className="w-full mt-2 bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider">
          <Send className="w-4 h-4 mr-1.5" /> Send
        </Button>
      </CaseTile>
    </div>
  );
}

// ─────────────────────────── GROWTH ───────────────────────────
function GrowthTab() {
  const [mode, setMode] = useState<"reply" | "post" | "cold" | "hooks">("reply");
  const [post, setPost] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [length, setLength] = useState("brief");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");

  const labels: Record<typeof mode, { title: string; sub: string }> = {
    reply: { title: "LinkedIn Reply", sub: "Draft a forensic reply to a post" },
    post:  { title: "LinkedIn Post",  sub: "Generate a post from a URL" },
    cold:  { title: "Cold Email",     sub: "Forensic outreach from a prospect URL" },
    hooks: { title: "Hook Pack",      sub: "5 hook lines from a URL" },
  };

  const run = async () => {
    setLoading(true); setOut("");
    try {
      let res;
      if (mode === "reply") res = await supabase.functions.invoke("linkedin-post-respond", { body: { post, length, source: "text" } });
      else if (mode === "post") res = await supabase.functions.invoke("linkedin-post-from-url", { body: { url, tone: "forensic" } });
      else if (mode === "cold") res = await supabase.functions.invoke("outreach-email-creator", { body: { url, recipientFirstName: name } });
      else res = await supabase.functions.invoke("linkedin-post-from-url", { body: { url, tone: "hooks" } });
      if (res.error) throw res.error;
      setOut(res.data?.reply || res.data?.post || res.data?.text || res.data?.email || JSON.stringify(res.data, null, 2));
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1.5">
        {(["reply", "post", "cold", "hooks"] as const).map((m) => (
          <button key={m} onClick={() => { setMode(m); setOut(""); }}
            className={`text-[10px] font-mono uppercase tracking-wider py-2 rounded-sm border transition-all ${
              mode === m ? "bg-amber text-charcoal border-amber font-bold shadow-[0_0_20px_-8px_hsl(var(--amber))]"
                         : "border-amber/25 text-amber/70 hover:border-amber/50"
            }`}>{m}</button>
        ))}
      </div>

      <CaseTile>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="font-display text-base font-bold">{labels[mode].title}</div>
            <div className="text-xs text-muted-foreground">{labels[mode].sub}</div>
          </div>
          <Sparkles className="w-4 h-4 text-amber" />
        </div>

        {mode === "reply" && (
          <div className="space-y-3">
            <div>
              <Label>Post you're replying to</Label>
              <Textarea value={post} onChange={(e) => setPost(e.target.value)} rows={5} placeholder="Paste the LinkedIn post…" className="bg-background/60 border-amber/20 resize-none" />
            </div>
            <div>
              <Label>Reply length</Label>
              <select value={length} onChange={(e) => setLength(e.target.value)}
                className="w-full bg-background/60 border border-amber/20 rounded-sm p-2 text-sm font-mono">
                <option value="micro">Micro · 35-65 words</option>
                <option value="brief">Brief · 70-120 words</option>
                <option value="medium">Medium · 130-190 words</option>
                <option value="long">Long · 200-280 words</option>
              </select>
            </div>
          </div>
        )}

        {(mode === "post" || mode === "hooks") && (
          <div>
            <Label>Source URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/post" inputMode="url" className="bg-background/60 border-amber/20" />
          </div>
        )}

        {mode === "cold" && (
          <div className="space-y-3">
            <div>
              <Label>Prospect URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://prospect.com" inputMode="url" className="bg-background/60 border-amber/20" />
            </div>
            <div>
              <Label>Recipient first name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Joseph" className="bg-background/60 border-amber/20" />
            </div>
          </div>
        )}

        <Button onClick={run} disabled={loading} className="w-full mt-4 bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1.5" /> Draft</>}
        </Button>
      </CaseTile>

      {out && (
        <CaseTile className="border-amber/40">
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber font-bold">Draft Ready</div>
            <CopyBtn text={out} />
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed bg-background/40 rounded-sm p-3 border border-border max-h-[55vh] overflow-auto">{out}</div>
        </CaseTile>
      )}
    </div>
  );
}

// ─────────────────────────── CRM ───────────────────────────
function CrmTab() {
  const [loading, setLoading] = useState<"deals" | "contacts" | null>(null);
  const [out, setOut] = useState<any>(null);
  const [kind, setKind] = useState<"deals" | "contacts" | null>(null);

  const pull = async (k: "deals" | "contacts") => {
    setLoading(k); setOut(null); setKind(k);
    try {
      const { data, error } = await supabase.functions.invoke("extension-hubspot-bridge", {
        body: { action: k === "deals" ? "pull-deals" : "pull-contacts" },
      });
      if (error) throw error;
      setOut(data);
    } catch (e: any) { toast.error(e?.message || "HubSpot pull failed. Connect HubSpot from admin."); }
    finally { setLoading(null); }
  };

  const rows: any[] = Array.isArray(out) ? out : (out?.deals || out?.contacts || out?.results || []);

  return (
    <div className="space-y-4">
      <CaseTile>
        <Label>HubSpot Autopsy</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Pulls live HubSpot data and runs the desktop leak detectors. Connect HubSpot from Admin → CRM first.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => pull("deals")} disabled={!!loading} className="bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider">
            {loading === "deals" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Building2 className="w-4 h-4 mr-1.5" /> Deals</>}
          </Button>
          <Button onClick={() => pull("contacts")} disabled={!!loading} variant="outline" className="border-amber/40 text-amber hover:bg-amber/10 font-bold uppercase tracking-wider">
            {loading === "contacts" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Users className="w-4 h-4 mr-1.5" /> Contacts</>}
          </Button>
        </div>
      </CaseTile>

      {rows.length > 0 && (
        <CaseTile>
          <div className="flex items-center justify-between mb-2">
            <Label>{kind === "deals" ? "Pipeline" : "Contacts"} · {rows.length}</Label>
            <Activity className="w-3.5 h-3.5 text-amber" />
          </div>
          <div className="space-y-1.5 max-h-[60vh] overflow-auto">
            {rows.slice(0, 50).map((row: any, i: number) => {
              const title = row.name || row.dealname || row.firstname || row.email || row.title || `Record ${i+1}`;
              const sub = row.amount ? `$${Number(row.amount).toLocaleString()}` : row.email || row.company || row.dealstage || "";
              return (
                <div key={row.id || i} className="rounded-sm border border-border bg-background/40 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{title}</div>
                    {sub && <div className="text-[11px] font-mono text-muted-foreground truncate">{sub}</div>}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber/60 shrink-0" />
                </div>
              );
            })}
          </div>
        </CaseTile>
      )}
    </div>
  );
}

// ─────────────────────────── AUTOFIX ───────────────────────────
function AutofixTab() {
  const [site, setSite] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [out, setOut] = useState<any>(null);

  const run = async (action: "preview" | "apply") => {
    if (!site || !user || !pass || !pageUrl) { toast.error("Fill all fields"); return; }
    setLoading(action); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("extension-cms-apply", {
        body: { site, username: user, password: pass, pageUrl, mode: action },
      });
      if (error) throw error;
      setOut(data);
    } catch (e: any) { toast.error(e?.message || "Auto-fix failed"); }
    finally { setLoading(null); }
  };

  const changes: any[] = out?.changes || out?.fixes || (Array.isArray(out) ? out : []);

  return (
    <div className="space-y-4">
      <CaseTile>
        <Label>WordPress Auto-Fix</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Pushes scan-recommended copy fixes via Application Password. Credentials stay on this device.
        </p>
        <div className="space-y-2">
          <div>
            <Label>Site URL</Label>
            <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://yoursite.com" inputMode="url" className="bg-background/60 border-amber/20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Username</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="wp-admin user" autoCapitalize="off" className="bg-background/60 border-amber/20" />
            </div>
            <div>
              <Label>App Password</Label>
              <Input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="xxxx xxxx xxxx" type="password" className="bg-background/60 border-amber/20" />
            </div>
          </div>
          <div>
            <Label>Page to patch</Label>
            <Input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="https://yoursite.com/home" inputMode="url" className="bg-background/60 border-amber/20" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button onClick={() => run("preview")} disabled={!!loading} variant="outline" className="border-amber/40 text-amber hover:bg-amber/10 font-bold uppercase tracking-wider">
            {loading === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview"}
          </Button>
          <Button onClick={() => run("apply")} disabled={!!loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase tracking-wider">
            {loading === "apply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><AlertTriangle className="w-4 h-4 mr-1.5" /> Push LIVE</>}
          </Button>
        </div>
      </CaseTile>

      {out && (
        <CaseTile>
          <Label>Result</Label>
          {changes.length > 0 ? (
            <div className="space-y-2">
              {changes.map((c: any, i: number) => (
                <div key={i} className="rounded-sm border border-amber/25 bg-amber/5 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">{c.field || c.selector || `Change ${i+1}`}</div>
                  {c.before && <div className="text-xs text-muted-foreground line-through mb-1">{c.before}</div>}
                  <div className="text-sm">{c.after || c.value || c.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="text-[11px] bg-background/40 border border-border rounded-sm p-3 overflow-auto max-h-[50vh] whitespace-pre-wrap font-mono">{typeof out === "string" ? out : JSON.stringify(out, null, 2)}</pre>
          )}
        </CaseTile>
      )}
    </div>
  );
}

// ─────────────────────────── SHELL ───────────────────────────
export default function OperatorAppPage() {
  return (
    <>
      <SEOHead
        path="/operator-app"
        title="Aetheris Operator · Mobile Cockpit"
        description="Forensic scan, AI operator chat, growth drafting, HubSpot autopsy, and WordPress auto-fix — from your phone."
      />
      <main className="relative min-h-screen bg-background text-foreground pb-24 overflow-hidden">
        {/* Forensic backdrop — moving mathematics + radial glow */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 18% -10%, hsl(var(--amber)/0.10), transparent 55%), radial-gradient(circle at 82% 110%, hsl(var(--destructive)/0.08), transparent 55%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)/0.92) 100%)" }} />
          <div className="absolute inset-0 opacity-[0.32]">
            <MatrixRain color="hsl(36 90% 55%)" fontSize={13} speed={0.28} density={0.85} />
          </div>
          {/* faint scanline grid */}
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(0deg, hsl(var(--amber)) 0 1px, transparent 1px 4px)" }} />
          {/* vignette */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 35%, hsl(var(--background)) 100%)" }} />
        </div>

        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-amber/25 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Aetheris · Operator
              </div>
              <div className="font-display text-lg font-bold leading-tight">Forensic Cockpit</div>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground border border-amber/25 rounded-sm px-2 py-1 bg-background/60">
              <span className="text-amber animate-pulse">●</span> LIVE
            </div>
          </div>
        </header>

        <div className="relative z-10 px-3 py-4">
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid grid-cols-6 w-full mb-4 h-auto bg-card/40 border border-amber/20 rounded-sm p-1">
              <TabsTrigger value="agents" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <Bot className="w-3 h-3 mr-1" />Agents
              </TabsTrigger>
              <TabsTrigger value="scan" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <Search className="w-3 h-3 mr-1" />Scan
              </TabsTrigger>
              <TabsTrigger value="op" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <MessageSquare className="w-3 h-3 mr-1" />Op
              </TabsTrigger>
              <TabsTrigger value="grow" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <Sparkles className="w-3 h-3 mr-1" />Grow
              </TabsTrigger>
              <TabsTrigger value="crm" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <Database className="w-3 h-3 mr-1" />CRM
              </TabsTrigger>
              <TabsTrigger value="fix" className="text-[10px] py-2 font-mono uppercase tracking-wider data-[state=active]:bg-amber data-[state=active]:text-charcoal data-[state=active]:font-bold">
                <Wrench className="w-3 h-3 mr-1" />Fix
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents"><AgentsTab /></TabsContent>
            <TabsContent value="scan"><ScanTab /></TabsContent>
            <TabsContent value="op"><OperatorTab /></TabsContent>
            <TabsContent value="grow"><GrowthTab /></TabsContent>
            <TabsContent value="crm"><CrmTab /></TabsContent>
            <TabsContent value="fix"><AutofixTab /></TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
