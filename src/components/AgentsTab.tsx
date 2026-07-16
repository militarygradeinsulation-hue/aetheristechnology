import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, Search, Sparkles, Briefcase, Code2, Bot,
  CheckCircle2, ArrowRight, Copy, ShieldCheck, History, Zap, Trash2, X,
} from "lucide-react";

type AgentKey = "detective" | "marketer" | "consultant" | "programmer";

const AGENTS: { key: AgentKey; label: string; tag: string; icon: any; tone: string }[] = [
  { key: "detective",  label: "Detective",  tag: "Audit + leak inventory",   icon: Search,    tone: "border-destructive/50 bg-destructive/5 text-destructive" },
  { key: "marketer",   label: "Marketer",   tag: "Posts, emails, hooks",     icon: Sparkles,  tone: "border-amber/50 bg-amber/5 text-amber" },
  { key: "consultant", label: "Consultant", tag: "90-day operator plan",     icon: Briefcase, tone: "border-blue-500/40 bg-blue-500/5 text-blue-300" },
  { key: "programmer", label: "Programmer", tag: "Copy fixes ready to push", icon: Code2,     tone: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" },
];

type AgentState = {
  plan: any | null;
  saved: any | null;
  status: "idle" | "loading" | "ready" | "saved" | "error";
  error?: string;
};

type HistoryEntry = {
  id: string;
  ts: number;
  url: string;
  brief: string;
  results: Record<AgentKey, AgentState>;
  active: AgentKey;
};

const EMPTY: AgentState = { plan: null, saved: null, status: "idle" };
const initStates = (): Record<AgentKey, AgentState> => ({
  detective: { ...EMPTY }, marketer: { ...EMPTY }, consultant: { ...EMPTY }, programmer: { ...EMPTY },
});

const HISTORY_KEY = "aetheris.agents.history.v1";

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-sm border border-amber/25 bg-card/60 backdrop-blur p-4 ${className}`}>{children}</div>;
}
function Lab({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber/90 mb-1.5">{children}</div>;
}

export default function AgentsTab() {
  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [useHubspot, setUseHubspot] = useState(false);
  const [active, setActive] = useState<AgentKey>("detective");
  const [states, setStates] = useState<Record<AgentKey, AgentState>>(initStates);
  const [scanAllBusy, setScanAllBusy] = useState(false);
  const [savingExec, setSavingExec] = useState(false);
  const [pushingFix, setPushingFix] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const persistHistory = (list: HistoryEntry[]) => {
    setHistory(list);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20))); } catch {}
  };

  const snapshotToHistory = (next: Record<AgentKey, AgentState>, activeKey: AgentKey) => {
    const anyData = (Object.keys(next) as AgentKey[]).some((k) => next[k].plan || next[k].saved);
    if (!anyData) return;
    const label = url.trim() || brief.trim().slice(0, 60) || "Untitled run";
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      ts: Date.now(),
      url, brief,
      results: next,
      active: activeKey,
    };
    const filtered = history.filter((h) => !(h.url === url && h.brief === brief));
    persistHistory([entry, ...filtered].slice(0, 20));
    void label;
  };

  const updateAgent = (key: AgentKey, patch: Partial<AgentState>) => {
    setStates((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  };

  const runPlan = async (agent: AgentKey) => {
    if (!url.trim() && !brief.trim()) { toast.error("Add a URL or a brief first"); return; }
    setActive(agent);
    updateAgent(agent, { status: "loading", plan: null, saved: null, error: undefined });
    try {
      const { data, error } = await supabase.functions.invoke("agents-run", {
        body: { agent, url: url.trim(), brief: brief.trim(), includeHubspot: useHubspot, mode: "plan" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateAgent(agent, { plan: data, status: "ready" });
      setStates((s) => {
        const next = { ...s, [agent]: { ...s[agent], plan: data, status: "ready" as const } };
        snapshotToHistory(next, agent);
        return next;
      });
    } catch (e: any) {
      updateAgent(agent, { status: "error", error: e?.message || "Agent failed" });
      toast.error(e?.message || "Agent failed");
    }
  };

  const scanAll = async () => {
    if (!url.trim() && !brief.trim()) { toast.error("Add a URL or a brief first"); return; }
    setScanAllBusy(true);
    const fresh = initStates();
    (Object.keys(fresh) as AgentKey[]).forEach((k) => (fresh[k].status = "loading"));
    setStates(fresh);
    const keys: AgentKey[] = ["detective", "marketer", "consultant", "programmer"];
    const results = await Promise.allSettled(
      keys.map((k) =>
        supabase.functions.invoke("agents-run", {
          body: { agent: k, url: url.trim(), brief: brief.trim(), includeHubspot: useHubspot, mode: "plan" },
        })
      )
    );
    const next = initStates();
    results.forEach((r, i) => {
      const k = keys[i];
      if (r.status === "fulfilled" && !r.value.error && !r.value.data?.error) {
        next[k] = { plan: r.value.data, saved: null, status: "ready" };
      } else {
        const msg = r.status === "fulfilled" ? (r.value.error?.message || r.value.data?.error) : r.reason?.message;
        next[k] = { plan: null, saved: null, status: "error", error: msg || "failed" };
      }
    });
    setStates(next);
    setScanAllBusy(false);
    const ok = keys.filter((k) => next[k].status === "ready").length;
    toast.success(`Scan All complete — ${ok}/4 agents returned`);
    snapshotToHistory(next, active);
  };

  const confirmExecute = async () => {
    const current = states[active];
    if (!current.plan) return;
    setSavingExec(true);
    try {
      const { data, error } = await supabase.functions.invoke("agents-run", {
        body: { agent: active, url: url.trim(), brief: brief.trim(), includeHubspot: useHubspot, mode: "execute", plan: current.plan.plan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateAgent(active, { saved: data, status: "saved" });
      toast.success("Saved to Library");
      setStates((s) => {
        const next = { ...s, [active]: { ...s[active], saved: data, status: "saved" as const } };
        snapshotToHistory(next, active);
        return next;
      });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally { setSavingExec(false); }
  };

  const pushFixesLive = async () => {
    const saved = states[active].saved;
    if (!saved?.cmsFixes?.length || !url.trim()) { toast.error("Need a URL and fixes"); return; }
    setPushingFix(true);
    try {
      const { data, error } = await supabase.functions.invoke("extension-cms-apply", {
        body: { url: url.trim(), changes: saved.cmsFixes, mode: "preview" },
      });
      if (error) throw error;
      toast.success("Preview generated — review in Fix tab to push live");
      console.log("cms preview", data);
    } catch (e: any) {
      toast.error(e?.message || "Preview failed");
    } finally { setPushingFix(false); }
  };

  const restoreHistory = (h: HistoryEntry) => {
    setUrl(h.url); setBrief(h.brief);
    setStates(h.results);
    setActive(h.active);
    setShowHistory(false);
    toast.success("Restored from history");
  };

  const deleteHistory = (id: string) => {
    persistHistory(history.filter((h) => h.id !== id));
  };

  const clearAll = () => {
    setStates(initStates());
    toast.success("Cleared current run");
  };

  const current = states[active];

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Tile>
        <Lab>Target URL</Lab>
        <Input
          value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://acme.com/pricing"
          inputMode="url" autoCapitalize="off" autoCorrect="off"
          className="bg-background/60 border-amber/20 mb-3"
        />
        <Lab>Brief (optional)</Lab>
        <Textarea
          value={brief} onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. focus on enterprise buyers, ignore SMB messaging"
          className="bg-background/60 border-amber/20 min-h-[60px]"
        />
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={useHubspot} onChange={(e) => setUseHubspot(e.target.checked)} className="accent-amber" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Pull HubSpot context
          </span>
        </label>
      </Tile>

      {/* Scan All + History controls */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Button
          onClick={scanAll}
          disabled={scanAllBusy}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase tracking-wider"
        >
          {scanAllBusy
            ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Scanning all agents…</>
            : <><Zap className="w-4 h-4 mr-1.5" />Scan All</>}
        </Button>
        <Button
          onClick={() => setShowHistory((v) => !v)}
          variant="outline"
          className="border-amber/40 text-amber hover:bg-amber/10"
          title="History"
        >
          <History className="w-4 h-4" />
          {history.length > 0 && <span className="ml-1 font-mono text-[10px]">{history.length}</span>}
        </Button>
        <Button
          onClick={clearAll}
          variant="outline"
          className="border-muted text-muted-foreground"
          title="Clear current"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* History drawer */}
      {showHistory && (
        <Tile className="border-amber/50">
          <div className="flex items-center justify-between mb-2">
            <Lab>Recent runs</Lab>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No history yet.</div>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-auto">
              {history.map((h) => {
                const ready = (Object.keys(h.results) as AgentKey[]).filter((k) => h.results[k].plan).length;
                return (
                  <li key={h.id} className="flex items-center gap-2 rounded-sm border border-amber/20 bg-background/40 p-2">
                    <button onClick={() => restoreHistory(h)} className="flex-1 text-left min-w-0">
                      <div className="text-xs truncate font-mono text-amber">{h.url || h.brief.slice(0, 50) || "Untitled"}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {new Date(h.ts).toLocaleString()} · {ready}/4 agents
                      </div>
                    </button>
                    <button
                      onClick={() => deleteHistory(h.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Tile>
      )}

      {/* Agent buttons / tabs */}
      <div className="grid grid-cols-2 gap-2.5">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          const s = states[a.key];
          const isActive = active === a.key;
          const busy = s.status === "loading";
          return (
            <button
              key={a.key}
              onClick={() => {
                setActive(a.key);
                if (s.status === "idle") runPlan(a.key);
              }}
              disabled={scanAllBusy}
              className={`relative text-left p-3.5 rounded-sm border-2 ${a.tone} bg-card/70 hover:bg-card transition disabled:opacity-50 active:scale-[0.98] ${isActive ? "ring-2 ring-amber" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {!busy && s.status === "ready" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {!busy && s.status === "saved" && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                {!busy && s.status === "error" && <span className="font-mono text-[9px] text-destructive">ERR</span>}
              </div>
              <div className="font-display text-base font-bold leading-tight text-foreground">{a.label}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{a.tag}</div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); runPlan(a.key); }}
                  disabled={scanAllBusy || busy}
                  className="font-mono text-[9px] uppercase tracking-widest text-amber/80 hover:text-amber"
                >
                  {s.plan ? "↻ Re-run" : "▸ Run"}
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active agent panel */}
      {current.status === "loading" && (
        <Tile className="text-center">
          <Bot className="w-6 h-6 text-amber mx-auto mb-2 animate-pulse" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
            {AGENTS.find((a) => a.key === active)?.label} agent at work…
          </div>
        </Tile>
      )}

      {current.status === "error" && (
        <Tile className="border-destructive/50">
          <Lab>Error</Lab>
          <div className="text-sm text-destructive">{current.error}</div>
          <Button onClick={() => runPlan(active)} variant="outline" className="mt-3 border-amber/40 text-amber">Retry</Button>
        </Tile>
      )}

      {current.plan?.plan && current.status === "ready" && (
        <Tile className="border-amber/60">
          <div className="flex items-center justify-between mb-2">
            <Lab>{current.plan.label} · Proposed plan</Lab>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">awaiting confirm</span>
          </div>
          {current.plan.plan.summary && (
            <p className="text-sm italic border-l-2 border-amber pl-3 py-1 bg-black/30 mb-3">
              {current.plan.plan.summary}
            </p>
          )}
          <PlanRender agent={active} plan={current.plan.plan} />

          <div className="flex gap-2 mt-4">
            <Button
              onClick={confirmExecute}
              disabled={savingExec}
              className="flex-1 bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider"
            >
              {savingExec
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Confirm + Save</>}
            </Button>
            <Button
              onClick={() => updateAgent(active, { plan: null, saved: null, status: "idle" })}
              variant="outline" className="border-muted text-muted-foreground"
            >
              Discard
            </Button>
          </div>
        </Tile>
      )}

      {current.saved?.saved && (
        <Tile className="border-emerald-500/50">
          <div className="flex items-center gap-2 mb-2 text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Saved · admin library</span>
          </div>
          <div className="text-sm mb-3">
            <span className="text-muted-foreground">Title:</span> {current.saved.item?.title}
          </div>
          {current.saved.cmsFixes?.length > 0 && (
            <Button
              onClick={pushFixesLive}
              disabled={pushingFix}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase tracking-wider"
            >
              {pushingFix
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><ArrowRight className="w-4 h-4 mr-1.5" />Preview Fixes in CMS</>}
            </Button>
          )}
        </Tile>
      )}
    </div>
  );
}

// ─── per-agent render ───
function PlanRender({ agent, plan }: { agent: AgentKey; plan: any }) {
  if (agent === "detective") {
    return (
      <div className="space-y-3">
        {plan.verdict && (
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Grade" value={plan.verdict.grade || "—"} tone="crimson" />
            <Mini label="Score" value={`${plan.verdict.score ?? "—"}/100`} />
            <Mini label="Leak" value={plan.verdict.annualLeakUSD || "—"} tone="crimson" />
          </div>
        )}
        {!!plan.evidence?.length && (
          <Section title="Evidence">
            <ul className="space-y-1.5">
              {plan.evidence.map((e: string, i: number) => (
                <li key={i} className="text-sm flex gap-2"><span className="text-amber font-mono">·</span><span>{e}</span></li>
              ))}
            </ul>
          </Section>
        )}
        {!!plan.fixes?.length && (
          <Section title="Recommended fixes">
            <div className="space-y-2">
              {plan.fixes.map((f: any, i: number) => (
                <div key={i} className="rounded-sm border border-amber/25 bg-amber/5 p-2.5">
                  <div className="font-bold text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.why}</div>
                  <div className="text-sm mt-1">→ {f.action}</div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }
  if (agent === "marketer") {
    return (
      <div className="space-y-3">
        {!!plan.linkedinPosts?.length && (
          <Section title="LinkedIn posts">
            {plan.linkedinPosts.map((p: any, i: number) => (
              <Draft key={i} title={p.hook} body={p.body} />
            ))}
          </Section>
        )}
        {!!plan.coldEmails?.length && (
          <Section title="Cold emails">
            {plan.coldEmails.map((e: any, i: number) => (
              <Draft key={i} title={`Subject: ${e.subject}`} body={e.body} />
            ))}
          </Section>
        )}
        {!!plan.replies?.length && (
          <Section title="Reply variants">
            {plan.replies.map((r: string, i: number) => <Draft key={i} body={r} />)}
          </Section>
        )}
      </div>
    );
  }
  if (agent === "consultant") {
    return (
      <div className="space-y-3">
        {!!plan.diagnosis?.length && (
          <Section title="Diagnosis">
            <ul className="space-y-1.5">{plan.diagnosis.map((d: string, i: number) => <li key={i} className="text-sm">· {d}</li>)}</ul>
          </Section>
        )}
        {!!plan.ninetyDayPlan?.length && (
          <Section title="90-day plan">
            {plan.ninetyDayPlan.map((p: any, i: number) => (
              <div key={i} className="rounded-sm border border-amber/25 bg-amber/5 p-2.5 mb-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">{p.phase}</div>
                <div className="font-bold text-sm mb-1">{p.focus}</div>
                <ul className="space-y-1">{p.moves?.map((m: string, j: number) => <li key={j} className="text-xs">→ {m}</li>)}</ul>
              </div>
            ))}
          </Section>
        )}
        {!!plan.kpis?.length && <Section title="KPIs"><ul className="space-y-1">{plan.kpis.map((k: string, i: number) => <li key={i} className="text-sm">· {k}</li>)}</ul></Section>}
        {!!plan.risks?.length && <Section title="Risks"><ul className="space-y-1">{plan.risks.map((k: string, i: number) => <li key={i} className="text-sm">· {k}</li>)}</ul></Section>}
      </div>
    );
  }
  // programmer
  return (
    <div className="space-y-3">
      {!!plan.fixes?.length && (
        <Section title="Proposed fixes">
          <div className="space-y-2">
            {plan.fixes.map((f: any, i: number) => (
              <div key={i} className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-300 mb-1">
                  {f.field || f.selector}
                </div>
                {f.before && <div className="text-xs text-muted-foreground line-through mb-1">{f.before}</div>}
                <div className="text-sm font-bold">{f.after}</div>
                {f.why && <div className="text-xs text-muted-foreground mt-1">— {f.why}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {plan.safety && (
        <Tile className="border-destructive/40">
          <Lab>Safety</Lab>
          <div className="text-sm">{plan.safety}</div>
        </Tile>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Lab>{title}</Lab>
      {children}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "crimson" }) {
  const c = tone === "crimson"
    ? "border-destructive/40 text-destructive bg-destructive/5"
    : "border-amber/40 text-amber bg-amber/5";
  return (
    <div className={`rounded-sm border ${c} px-2 py-1.5`}>
      <div className="font-mono text-[9px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function Draft({ title, body }: { title?: string; body: string }) {
  return (
    <div className="rounded-sm border border-amber/25 bg-amber/5 p-2.5 mb-2">
      {title && <div className="font-bold text-sm mb-1">{title}</div>}
      <div className="text-sm whitespace-pre-wrap">{body}</div>
      <Button
        size="sm" variant="outline"
        onClick={() => { navigator.clipboard.writeText(`${title ? title + "\n\n" : ""}${body}`); toast.success("Copied"); }}
        className="mt-2 h-7 border-amber/40 text-amber hover:bg-amber/10"
      >
        <Copy className="w-3 h-3 mr-1" />Copy
      </Button>
    </div>
  );
}
