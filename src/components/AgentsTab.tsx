import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, Search, Sparkles, Briefcase, Code2, Bot,
  CheckCircle2, ArrowRight, Copy, ShieldCheck, FileText,
} from "lucide-react";

type AgentKey = "detective" | "marketer" | "consultant" | "programmer";

const AGENTS: { key: AgentKey; label: string; tag: string; icon: any; tone: string }[] = [
  { key: "detective",  label: "Detective",  tag: "Audit + leak inventory",        icon: Search,    tone: "border-destructive/50 bg-destructive/5 text-destructive" },
  { key: "marketer",   label: "Marketer",   tag: "Posts, emails, hooks",          icon: Sparkles,  tone: "border-amber/50 bg-amber/5 text-amber" },
  { key: "consultant", label: "Consultant", tag: "90-day operator plan",          icon: Briefcase, tone: "border-blue-500/40 bg-blue-500/5 text-blue-300" },
  { key: "programmer", label: "Programmer", tag: "Copy fixes ready to push",      icon: Code2,     tone: "border-emerald-500/40 bg-emerald-500/5 text-emerald-300" },
];

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
  const [active, setActive] = useState<AgentKey | null>(null);
  const [loading, setLoading] = useState<"plan" | "execute" | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);

  const reset = () => { setPlan(null); setSaved(null); };

  const runPlan = async (agent: AgentKey) => {
    if (!url.trim() && !brief.trim()) { toast.error("Add a URL or a brief first"); return; }
    setActive(agent); reset(); setLoading("plan");
    try {
      const { data, error } = await supabase.functions.invoke("agents-run", {
        body: { agent, url: url.trim(), brief: brief.trim(), includeHubspot: useHubspot, mode: "plan" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlan(data);
    } catch (e: any) {
      toast.error(e?.message || "Agent failed");
    } finally { setLoading(null); }
  };

  const confirmExecute = async () => {
    if (!plan || !active) return;
    setLoading("execute");
    try {
      const { data, error } = await supabase.functions.invoke("agents-run", {
        body: { agent: active, url: url.trim(), brief: brief.trim(), includeHubspot: useHubspot, mode: "execute", plan: plan.plan },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSaved(data);
      toast.success("Saved to Library");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally { setLoading(null); }
  };

  const pushFixesLive = async () => {
    if (!saved?.cmsFixes?.length || !url.trim()) { toast.error("Need a URL and fixes"); return; }
    setLoading("execute");
    try {
      const { data, error } = await supabase.functions.invoke("extension-cms-apply", {
        body: { url: url.trim(), changes: saved.cmsFixes, mode: "preview" },
      });
      if (error) throw error;
      toast.success("Preview generated — review in Fix tab to push live");
      console.log("cms preview", data);
    } catch (e: any) {
      toast.error(e?.message || "Preview failed");
    } finally { setLoading(null); }
  };

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

      {/* Agent buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          const busy = loading === "plan" && active === a.key;
          return (
            <button
              key={a.key}
              onClick={() => runPlan(a.key)}
              disabled={!!loading}
              className={`text-left p-3.5 rounded-sm border-2 ${a.tone} bg-card/70 hover:bg-card transition disabled:opacity-50 active:scale-[0.98]`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
              <div className="font-display text-base font-bold leading-tight text-foreground">{a.label}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{a.tag}</div>
            </button>
          );
        })}
      </div>

      {loading === "plan" && (
        <Tile className="text-center">
          <Bot className="w-6 h-6 text-amber mx-auto mb-2 animate-pulse" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber">
            {AGENTS.find((a) => a.key === active)?.label} agent at work…
          </div>
        </Tile>
      )}

      {/* Plan preview */}
      {plan?.plan && !saved && (
        <Tile className="border-amber/60">
          <div className="flex items-center justify-between mb-2">
            <Lab>{plan.label} · Proposed plan</Lab>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">awaiting confirm</span>
          </div>
          {plan.plan.summary && (
            <p className="text-sm italic border-l-2 border-amber pl-3 py-1 bg-black/30 mb-3">
              {plan.plan.summary}
            </p>
          )}
          <PlanRender agent={active!} plan={plan.plan} />

          <div className="flex gap-2 mt-4">
            <Button
              onClick={confirmExecute}
              disabled={loading === "execute"}
              className="flex-1 bg-amber text-charcoal hover:bg-amber/90 font-bold uppercase tracking-wider"
            >
              {loading === "execute"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><CheckCircle2 className="w-4 h-4 mr-1.5" />Confirm + Save</>}
            </Button>
            <Button onClick={reset} variant="outline" className="border-muted text-muted-foreground">Discard</Button>
          </div>
        </Tile>
      )}

      {/* Saved confirmation */}
      {saved?.saved && (
        <Tile className="border-emerald-500/50">
          <div className="flex items-center gap-2 mb-2 text-emerald-300">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Saved · admin library</span>
          </div>
          <div className="text-sm mb-3">
            <span className="text-muted-foreground">Title:</span> {saved.item?.title}
          </div>
          {saved.cmsFixes?.length > 0 && (
            <Button
              onClick={pushFixesLive}
              disabled={loading === "execute"}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold uppercase tracking-wider"
            >
              {loading === "execute"
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
