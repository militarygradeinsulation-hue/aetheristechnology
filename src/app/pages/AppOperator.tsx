import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "../AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Radar, Bot, ScanLine, MessageSquare, Wrench, Sparkles,
  FileText, Zap, AlertTriangle, ArrowUpRight, Loader2, Send, Users,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";

// Tools that auto-fire the moment a valid URL lands in the target bar.
const AUTO_JOBS: { key: string; label: string; fn: string; tab: TabKey }[] = [
  { key: "scan",       label: "Forensic Leak Scan",   fn: "extension-leak-scan",         tab: "scan" },
  { key: "golden",     label: "Golden Report",        fn: "forensic-scan-all",           tab: "golden" },
  { key: "contra",     label: "Brand Contradictions", fn: "generate-brand-contradictions", tab: "contradictions" },
  { key: "friction",   label: "Friction Audit",       fn: "generate-friction-audit",     tab: "friction" },
  { key: "contacts",   label: "Contacts",             fn: "extension-contacts",          tab: "contacts" },
];

type JobStatus = "idle" | "running" | "done" | "error";
type JobState = { status: JobStatus; data?: unknown; error?: string; startedAt?: number; finishedAt?: number };

type TabKey =
  | "instruments" | "agents" | "scan" | "operator"
  | "growth" | "golden" | "contradictions" | "friction" | "contacts";

const TABS: { key: TabKey; label: string; icon: typeof Radar }[] = [
  { key: "instruments",    label: "Instruments",     icon: Radar },
  { key: "agents",         label: "Agents",          icon: Bot },
  { key: "scan",           label: "Scan",            icon: ScanLine },
  { key: "operator",       label: "Operator",        icon: MessageSquare },
  { key: "golden",         label: "Golden Report",   icon: FileText },
  { key: "contradictions", label: "Contradictions",  icon: AlertTriangle },
  { key: "friction",       label: "Friction",        icon: Zap },
  { key: "contacts",       label: "Contacts",        icon: Users },
  { key: "growth",         label: "Growth",          icon: Sparkles },
];

const INSTRUMENTS = [
  { title: "Chaos Scan",          tag: "Feed a URL. Watch the leaks connect.",  href: "/chaos-scan",           node: "NODE 01", color: "crimson" as const },
  { title: "Head-to-Head",        tag: "Your site vs. theirs. Every difference.", href: "/head-to-head",         node: "NODE 02", color: "amber"   as const },
  { title: "Reciprocation Engine",tag: "The gifts that make prospects owe you.", href: "/reciprocation",        node: "NODE 03", color: "crimson" as const },
  { title: "Golden Report",       tag: "Full forensic scan. 14 chapters.",       href: "/golden-report",        node: "NODE 04", color: "amber"   as const },
  { title: "Aetheris IQ",         tag: "The forensic AI operator.",              href: "/aetheris-iq",          node: "NODE 05", color: "crimson" as const },
  { title: "Brand Contradictions",tag: "Where the brand says vs shows.",         href: "/brand-contradictions", node: "NODE 06", color: "amber"   as const },
  { title: "Friction Audit",      tag: "Every word that costs you conversions.", href: "/friction-audit",       node: "NODE 07", color: "crimson" as const },
];

const OP_CHIPS = [
  "What is the single biggest leak on this page right now? Name it and the fix.",
  "Rewrite the hero headline + subhead. Give me 3 sharp options under 12 words.",
  "Rewrite the primary CTA. 3 outcome-based options.",
  "Audit the proof on this page. What's missing above the fold?",
  "Find the contradictions on this page.",
  "Estimate annual revenue this page is leaking (USD). 3 lines of reasoning.",
  "If I had 1 week and 1 developer, what 3 changes would compound?",
  "Score this page 1-10 on clarity, proof, friction, capture, urgency.",
];

const AGENTS = [
  { key: "detective",  label: "Detective",  desc: "Deep dossier on the target." },
  { key: "marketer",   label: "Marketer",   desc: "Positioning, hooks, campaigns." },
  { key: "consultant", label: "Consultant", desc: "Strategy + 90-day plan." },
  { key: "programmer", label: "Programmer", desc: "In-page fixes as CMS diffs." },
];

function normalizeUrl(u: string) {
  const s = u.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

const AppOperator = () => {
  const [tab, setTab] = useState<TabKey>("instruments");
  const [targetUrl, setTargetUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const lastAutoUrl = useRef<string>("");

  // Operator chat
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Agents
  const [agentBrief, setAgentBrief] = useState("");

  // Growth
  const [growthPost, setGrowthPost] = useState("");

  async function invoke(fn: string, body: Record<string, unknown>, key: string) {
    setBusy(key); setError(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      setResult(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runAgent(agent: string) {
    const url = normalizeUrl(targetUrl);
    await invoke("agents-run", { agent, url, brief: agentBrief, mode: "plan" }, `agent-${agent}`);
  }

  async function sendChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    const next = [...chat, { role: "user" as const, content: msg }];
    setChat(next); setChatInput(""); setBusy("chat");
    try {
      const { data, error } = await supabase.functions.invoke("extension-operator-chat", {
        body: { userText: msg, pageUrl: normalizeUrl(targetUrl), history: chat.slice(-6) },
      });
      if (error) throw error;
      const reply = (data as { reply?: string; text?: string })?.reply ??
                    (data as { text?: string })?.text ?? "…";
      setChat([...next, { role: "assistant", content: String(reply) }]);
    } catch (e) {
      setChat([...next, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setBusy(null);
    }
  }

  const urlBar = (
    <div className="forensic-tile rounded-sm border border-amber/30 p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <label className="font-case text-[10px] uppercase tracking-widest text-amber shrink-0">
        Target URL
      </label>
      <input
        value={targetUrl}
        onChange={(e) => setTargetUrl(e.target.value)}
        placeholder="https://example.com"
        className="flex-1 bg-background/60 border border-border rounded-sm px-3 py-1.5 text-sm font-mono"
      />
      <span className="font-case text-[9px] uppercase tracking-widest text-crimson">
        Case №2026-CT-{new Date().getMonth() + 1}{new Date().getDate()}
      </span>
    </div>
  );

  return (
    <AppLayout>
      <div className="mb-5">
        <div className="font-case text-[10px] uppercase tracking-[0.3em] text-crimson mb-1">
          Operator Console · Full Arsenal
        </div>
        <h1 className="font-forensic text-2xl md:text-3xl font-bold">
          Every instrument the extension has — inside the app.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Same edge functions. Same power. Point at any URL and run.
        </p>
      </div>

      {urlBar}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border mb-5">
        {TABS.map((t) => {
          const Active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setResult(null); setError(null); }}
              className={`px-3 py-2 text-xs font-case uppercase tracking-widest border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                Active ? "border-amber text-amber" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {tab === "instruments" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INSTRUMENTS.map((i) => (
            <Link
              key={i.title}
              to={i.href}
              className={`forensic-tile rounded-sm border p-4 hover:bg-background/60 transition-colors ${
                i.color === "crimson" ? "border-crimson/40" : "border-amber/40"
              }`}
            >
              <div className={`font-case text-[9px] uppercase tracking-widest mb-1 ${
                i.color === "crimson" ? "text-crimson" : "text-amber"
              }`}>{i.node} · FREE</div>
              <div className="font-forensic text-lg font-bold">{i.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{i.tag}</div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mt-3 flex items-center gap-1">
                Open instrument <ArrowUpRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "agents" && (
        <div className="forensic-tile rounded-sm border border-amber/30 p-4">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">One-click AI agents</div>
          <textarea
            value={agentBrief}
            onChange={(e) => setAgentBrief(e.target.value)}
            rows={2}
            placeholder="Optional brief — e.g. focus on enterprise buyers, ignore SMB"
            className="w-full bg-background/60 border border-border rounded-sm p-2 text-sm mb-3"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AGENTS.map((a) => (
              <button
                key={a.key}
                disabled={!!busy}
                onClick={() => runAgent(a.key)}
                className="rounded-sm border border-amber/40 bg-amber/10 hover:bg-amber/20 text-amber p-3 text-left disabled:opacity-50"
              >
                <div className="font-forensic font-bold text-sm">{a.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</div>
                {busy === `agent-${a.key}` && <Loader2 className="h-3 w-3 mt-1 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "scan" && (
        <ScanRunner
          title="Forensic Leak Scan"
          desc="Runs the same engine as the Chrome extension's Scan tab against your target URL."
          buttonLabel="Run Forensic Scan"
          onRun={() => invoke("extension-leak-scan", { url: normalizeUrl(targetUrl) }, "scan")}
          busyKey="scan"
          busy={busy}
        />
      )}

      {tab === "golden" && (
        <ScanRunner
          title="Golden Report — Full Forensic Scan All"
          desc="Every chapter, every page. Kicks off the full multi-stage forensic-scan-all pipeline."
          buttonLabel="Start Golden Report"
          onRun={() => invoke("forensic-scan-all", { url: normalizeUrl(targetUrl) }, "golden")}
          busyKey="golden"
          busy={busy}
        />
      )}

      {tab === "contradictions" && (
        <ScanRunner
          title="Brand Contradictions"
          desc="Finds every place the brand says one thing and shows another."
          buttonLabel="Detect Contradictions"
          onRun={() => invoke("generate-brand-contradictions", { url: normalizeUrl(targetUrl) }, "contra")}
          busyKey="contra"
          busy={busy}
        />
      )}

      {tab === "friction" && (
        <ScanRunner
          title="Friction Audit"
          desc="Every word, layout choice, or step that costs conversions."
          buttonLabel="Run Friction Audit"
          onRun={() => invoke("generate-friction-audit", { url: normalizeUrl(targetUrl) }, "friction")}
          busyKey="friction"
          busy={busy}
        />
      )}

      {tab === "contacts" && (
        <ScanRunner
          title="Find Contacts"
          desc="Scrape the site + RocketReach for decision-makers, emails, phones."
          buttonLabel="Find Contacts"
          onRun={() => invoke("extension-contacts", { url: normalizeUrl(targetUrl) }, "contacts")}
          busyKey="contacts"
          busy={busy}
        />
      )}

      {tab === "operator" && (
        <div className="forensic-tile rounded-sm border border-amber/30 p-4">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Operator chat · Vision-aware
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {OP_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setChatInput(c)}
                className="text-[10px] px-2 py-1 rounded-sm border border-border hover:border-amber/40 hover:text-amber transition-colors"
              >
                {c.split(".")[0].slice(0, 42)}…
              </button>
            ))}
          </div>
          <div className="h-64 overflow-y-auto rounded-sm border border-border bg-background/40 p-3 mb-2 text-sm space-y-3">
            {chat.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">
                Ask the Operator about the target URL. Same engine as the extension.
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-foreground" : "text-amber/90"}>
                <div className="font-case text-[9px] uppercase tracking-widest mb-0.5 opacity-60">
                  {m.role}
                </div>
                <div className="whitespace-pre-wrap leading-snug">{m.content}</div>
              </div>
            ))}
            {busy === "chat" && <Loader2 className="h-4 w-4 animate-spin text-amber" />}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              rows={2}
              placeholder="Ask the Operator…"
              className="flex-1 bg-background/60 border border-border rounded-sm p-2 text-sm"
            />
            <button
              onClick={sendChat}
              disabled={busy === "chat" || !chatInput.trim()}
              className="px-4 rounded-sm bg-amber text-background font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      )}

      {tab === "growth" && (
        <div className="space-y-4">
          <div className="forensic-tile rounded-sm border border-amber/30 p-4">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              LinkedIn reply drafter
            </div>
            <textarea
              value={growthPost}
              onChange={(e) => setGrowthPost(e.target.value)}
              rows={4}
              placeholder="Paste the LinkedIn post to reply to…"
              className="w-full bg-background/60 border border-border rounded-sm p-2 text-sm mb-2"
            />
            <button
              disabled={!growthPost.trim() || !!busy}
              onClick={() => invoke("linkedin-comment-generate", { post: growthPost }, "li")}
              className="px-4 py-2 rounded-sm bg-amber text-background font-semibold disabled:opacity-50 text-sm"
            >
              {busy === "li" ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : "Draft 3 replies"}
            </button>
          </div>
          <Link
            to="/app/composer"
            className="block forensic-tile rounded-sm border border-border p-4 hover:border-amber/40 transition-colors"
          >
            <div className="font-forensic font-bold">Full Content Studio →</div>
            <div className="text-xs text-muted-foreground">Post from URL, cold openers, hook library.</div>
          </Link>
        </div>
      )}

      {/* Result panel */}
      {(result || error) && (
        <div className="mt-6 forensic-tile rounded-sm border border-border p-4">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">Result</div>
          {error && <div className="text-crimson text-xs mb-2">Error: {error}</div>}
          {result && (
            <pre className="text-[11px] font-mono whitespace-pre-wrap max-h-96 overflow-auto text-foreground/90">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </AppLayout>
  );
};

function ScanRunner({
  title, desc, buttonLabel, onRun, busy, busyKey,
}: {
  title: string; desc: string; buttonLabel: string;
  onRun: () => void; busy: string | null; busyKey: string;
}) {
  return (
    <div className="forensic-tile rounded-sm border border-amber/30 p-4">
      <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">Instrument</div>
      <div className="font-forensic text-xl font-bold mb-1">{title}</div>
      <p className="text-sm text-muted-foreground mb-3">{desc}</p>
      <button
        onClick={onRun}
        disabled={busy === busyKey}
        className="px-4 py-2 rounded-sm bg-amber text-background font-semibold disabled:opacity-50 text-sm flex items-center gap-2"
      >
        {busy === busyKey && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <Wrench className="h-3.5 w-3.5" /> {buttonLabel}
      </button>
    </div>
  );
}

export default AppOperator;
