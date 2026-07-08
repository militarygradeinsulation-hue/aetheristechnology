import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, ShoppingCart, RefreshCw, Printer, ShieldCheck, Copy, Rocket } from "lucide-react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { findTool } from "@/lib/tool-shop-catalog";
import { toast } from "sonner";
import { CreationStudioSandbox } from "@/components/CreationStudioSandbox";

/**
 * Public sandbox runner for any Chaos Ecosystem tool.
 * - No auth, no rep code, no portal data, no client secrets.
 * - Nothing is persisted (no localStorage, no supabase writes).
 * - State clears on unmount and on manual "Reset".
 */

type ToolMeta = {
  title: string;
  inputLabel: string;
  inputHint: string;
  /** One-sentence, plain-English "what this tool does". */
  summary: string;
  /** 3-step how-to-use, plain-English. */
  howTo: [string, string, string];
  /** What you'll see in the PDF-style report. */
  delivers: string[];
};

const TRY_META: Record<string, ToolMeta> = {
  "website-scanner": {
    title: "Website Leak Scanner", inputLabel: "Website URL", inputHint: "https://example.com",
    summary: "Scans any live URL and returns the top revenue leaks costing you deals — with dollar impact and a fix for each.",
    howTo: ["Paste any public website URL", "Click Run — no signup", "Get a 1-page PDF-style leak audit"],
    delivers: ["Snapshot diagnosis", "Top 5 revenue leaks (table)", "30-day fix priority"],
  },
  "brand-contradictions": {
    title: "Brand Contradictions", inputLabel: "Brand or URL", inputHint: "brand.com or a tagline",
    summary: "Finds where your brand says one thing but does another — the gaps buyers notice and lose trust over.",
    howTo: ["Enter a brand name, URL, or tagline", "Run the scan", "Get a contradiction table + fix-first move"],
    delivers: ["Diagnosis", "5 contradictions with cost bands", "Which one to fix first"],
  },
  "friction-audit": {
    title: "Friction Audit", inputLabel: "Funnel or URL", inputHint: "Describe the buyer path or drop a URL",
    summary: "Maps every step a buyer takes and quantifies where you're leaking ready-to-buy traffic.",
    howTo: ["Describe your funnel or paste a URL", "Run the audit", "Get a stage-by-stage friction log"],
    delivers: ["Buyer path", "Friction log with drop-off %", "7-day repair plan"],
  },
  "strategic-questions": {
    title: "Strategic Questions", inputLabel: "Company / role", inputHint: "e.g. 'Series A SaaS CEO'",
    summary: "Generates the hard boardroom questions your leadership is quietly avoiding.",
    howTo: ["Type your company + role", "Run", "Get 15 blunt questions across 5 truth categories"],
    delivers: ["15 questions in 5 groups", "The 3 to open your next meeting with"],
  },
  "detective-mode": {
    title: "Detective Mode", inputLabel: "Business + URL", inputHint: "e.g. 'Acme Co · acme.com'",
    summary: "Opens a forensic case file on a business — suspects, evidence, motive, and next 72-hour moves.",
    howTo: ["Enter business name + URL", "Run", "Get a case file with suspects and moves"],
    delivers: ["Case opener", "5 suspected leaks (table)", "First 72-hour moves"],
  },
  "forensic-scan-all": {
    title: "Forensic Scan (All)", inputLabel: "Website URL", inputHint: "https://example.com",
    summary: "Runs every diagnostic layer on one URL — positioning, offer, proof, funnel, SEO, and ops.",
    howTo: ["Paste your website URL", "Run the full sweep", "Get a graded layer report"],
    delivers: ["Executive diagnosis", "Layer grades A–F", "Biggest unlock + 30-day repair"],
  },
  "all-in-one": {
    title: "All-In-One Content", inputLabel: "Topic", inputHint: "e.g. 'AI-powered onboarding'",
    summary: "Turns one topic into a ready-to-ship content set: post, email, thread, and hooks.",
    howTo: ["Type any topic", "Run", "Copy the pack straight into your channels"],
    delivers: ["Angle", "LinkedIn + Email + X thread", "3 hook variants"],
  },
  "content-calendar": {
    title: "Content Calendar Builder", inputLabel: "Niche", inputHint: "e.g. 'B2B fintech'",
    summary: "Builds a 14-day content calendar with hooks and CTAs, aligned to your niche.",
    howTo: ["Enter your niche", "Run", "Get a table calendar + weekly themes"],
    delivers: ["14-day table calendar", "Weekly themes", "2 flagship pieces"],
  },
  "playbook-generator": {
    title: "Playbook Generator", inputLabel: "Function or goal", inputHint: "e.g. 'Outbound SDR playbook'",
    summary: "Writes a compact operating playbook a new hire can run on day one.",
    howTo: ["Describe the function or goal", "Run", "Get steps + KPIs + failure modes"],
    delivers: ["Purpose & trigger", "7 steps (table)", "KPIs + kill-switches"],
  },
  "social-content": {
    title: "Social Content Studio", inputLabel: "Topic", inputHint: "Punchy topic",
    summary: "Punchy operator-voice social posts — no fluff, no corporate.",
    howTo: ["Type a sharp topic", "Run", "Copy posts + thread + hooks"],
    delivers: ["3 LinkedIn posts", "1 X thread", "5 hooks"],
  },
  "content-engine": {
    title: "Content Engine", inputLabel: "Core idea", inputHint: "The one insight to expand",
    summary: "Takes one insight and expands it into a compact content week.",
    howTo: ["Enter the one insight", "Run", "Get an article + spinoffs + reuse map"],
    delivers: ["Article outline + lead section", "4 spinoffs", "Repurposing map"],
  },
  "image-studio": {
    title: "Image Studio", inputLabel: "Scene", inputHint: "e.g. 'operator at forensic desk'",
    summary: "Turns a scene description into a production-grade image brief with a ready-to-paste generator prompt.",
    howTo: ["Describe the scene", "Run", "Copy the brief or the ready prompt"],
    delivers: ["Concept", "Spec table (palette, lens, wardrobe…)", "Ready generator prompt"],
  },
  "creation-studio": {
    title: "Creation Studio", inputLabel: "Your website URL", inputHint: "https://yourbrand.com",
    summary: "Paste your website — we scan your palette, fonts, and logo, then let you spin up on-brand marketing images, PDFs, social posts, and emails from a plain-English brief.",
    howTo: ["Paste your website URL and click Scan", "Pick what to make (image / PDF / social / email) and describe it", "Download the on-brand result"],
    delivers: ["Auto-extracted brand kit (colors + fonts + logo)", "On-brand marketing image (Nano Banana render)", "PDF one-pagers, social packs, emails in your voice"],
  },
  "easy-mode": {
    title: "Easy Mode", inputLabel: "One-line goal", inputHint: "e.g. 'get 10 booked calls this month'",
    summary: "The simplest tool: type one goal, get the shortest actionable path a solo operator can start today.",
    howTo: ["Type one goal", "Run", "Follow the 7-day plan"],
    delivers: ["Strategy in one sentence", "7-day table plan", "Daily scorecard + kill-switch"],
  },
  "tool-generator": {
    title: "Tool Generator", inputLabel: "Tool brief", inputHint: "e.g. 'calculator for pipeline leak $'",
    summary: "Scopes a micro-tool spec from a plain-English brief — ready to hand to a builder.",
    howTo: ["Describe the tool you want", "Run", "Get spec + UI copy + growth loops"],
    delivers: ["Concept", "Spec table + UI copy", "Growth loops"],
  },
};

export default function TryToolPage() {
  const { toolId = "" } = useParams();
  const tool = useMemo(() => findTool(toolId), [toolId]);
  const meta = TRY_META[toolId];

  const [url, setUrl] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [runAt, setRunAt] = useState<Date | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Clear everything when leaving the page — nothing persists.
  useEffect(() => () => { setUrl(""); setContext(""); setOutput(""); setRunAt(null); }, [toolId]);

  const reset = () => { setUrl(""); setContext(""); setOutput(""); setRunAt(null); };

  // Deterministic-ish case id from tool + timestamp for the case-file header.
  const caseId = useMemo(() => {
    if (!runAt) return "";
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `AE-${toolId.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)}-${rand}`;
  }, [runAt, toolId]);

  // Split markdown into H2 sections so long outputs read as a structured case
  // file instead of one wall of prose. Anything before the first H2 becomes an
  // "Executive Summary" card.
  const sections = useMemo(() => {
    if (!output) return [] as { title: string; body: string }[];
    const lines = output.split("\n");
    const out: { title: string; body: string }[] = [];
    let current: { title: string; body: string } = { title: "Executive Summary", body: "" };
    for (const line of lines) {
      const m = line.match(/^##\s+(.+)$/);
      if (m) {
        if (current.body.trim() || current.title !== "Executive Summary") out.push(current);
        current = { title: m[1].trim(), body: "" };
      } else {
        current.body += line + "\n";
      }
    }
    if (current.body.trim()) out.push(current);
    return out.filter(s => s.body.trim());
  }, [output]);

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success("Report copied to clipboard");
  };
  const printReport = () => window.print();

  const run = async () => {
    const cleanUrl = url.trim();
    const cleanCtx = context.trim();
    if (!cleanUrl) { toast.error("Enter your website URL"); return; }
    if (!/^https?:\/\//i.test(cleanUrl)) { toast.error("URL must start with https://"); return; }
    setLoading(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("try-tool-sandbox", {
        body: { toolId, url: cleanUrl, context: cleanCtx },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.output || "";
      if (!text) throw new Error("Empty response");
      setOutput(text);
      setRunAt(new Date());
    } catch (e: any) {
      toast.error(e?.message || "Tool run failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!tool || !meta) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <div className="relative z-10">
          <Navbar onContactClick={() => {}} />
          <main className="max-w-3xl mx-auto px-4 py-32 text-center">
            <h1 className="font-forensic text-3xl font-bold mb-4">Tool not found</h1>
            <Link to="/" className="text-amber underline">Back to the ecosystem</Link>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={`Try ${meta.title} free · Aetheris Chaos Ecosystem`}
        description={`Sandbox run of the ${meta.title} tool. No signup, nothing saved, each run independent.`}
        path={`/try/${toolId}`}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => {}} />
        <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-amber/80 hover:text-amber mb-4">
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>

          <div className="forensic-tile rounded-sm border border-amber/40 p-6 md:p-8">
            <h1 className="font-forensic text-3xl md:text-4xl font-bold leading-tight mb-2">
              {meta.title}
            </h1>
            <p className="text-sm text-foreground/70 mb-5">
              {tool.tagline}
            </p>

            {/* Plain-English summary + how-to — always visible above the input */}
            <div className="rounded-sm border border-amber/30 bg-background/50 p-4 mb-5 grid md:grid-cols-2 gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1.5">// What it does</div>
                <p className="text-sm text-foreground/90 leading-relaxed">{meta.summary}</p>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mt-3 mb-1.5">// You'll get</div>
                <ul className="text-xs text-foreground/80 space-y-0.5 list-disc list-inside marker:text-amber">
                  {meta.delivers.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1.5">// How to use it</div>
                <ol className="text-sm text-foreground/90 space-y-1.5">
                  {meta.howTo.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-[11px] text-amber shrink-0 w-5">0{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {toolId === "creation-studio" ? (
              <CreationStudioSandbox />
            ) : (
              <>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
                  Your website URL <span className="text-crimson">*</span>
                </label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="bg-background/70 border-amber/30 font-mono text-sm"
                  maxLength={500}
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  We scan your site to give every tool a baseline read of your company.
                </p>

                <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2 mt-4">
                  Extra context <span className="text-muted-foreground normal-case tracking-normal">(optional — {meta.inputLabel.toLowerCase()}, goal, or focus)</span>
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={meta.inputHint}
                  className="bg-background/70 border-amber/30 font-mono text-sm min-h-[70px]"
                  maxLength={1500}
                  disabled={loading}
                />

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    onClick={run}
                    disabled={loading || !url.trim()}
                    className="bg-amber text-background hover:bg-amber/90 font-semibold flex-1"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning + running…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Scan my site & run</>}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={reset}
                    disabled={loading}
                    className="border-amber/40 text-amber hover:bg-amber/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Reset
                  </Button>
                </div>
              </>
            )}

            {output && (
              <div ref={printRef} className="mt-8 print:mt-0">
                {/* Case-file header */}
                <div className="relative rounded-sm border border-amber/40 bg-background/60 overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none opacity-[0.08]"
                       style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,191,0,0.25) 0 1px, transparent 1px 3px)" }} />
                  <div className="relative flex items-start justify-between gap-3 p-4 border-b border-amber/30">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80">
                        // case_file · {caseId}
                      </div>
                      <div className="font-forensic text-xl md:text-2xl font-bold text-foreground mt-1">
                        {meta.title} — Forensic Report
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                        Subject: <span className="text-foreground/90 normal-case tracking-normal">{url}{context ? ` · ${context.slice(0, 60)}${context.length > 60 ? "…" : ""}` : ""}</span>
                      </div>
                      {runAt && (
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                          Filed: {runAt.toISOString().slice(0, 19).replace("T", " ")}Z
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 border-2 border-crimson text-crimson font-mono text-[10px] tracking-[0.3em] uppercase px-2 py-1 rotate-3 select-none">
                      Active
                    </div>
                  </div>

                  {/* Section cards */}
                  <div className="p-4 md:p-5 space-y-4">
                    {sections.map((s, i) => (
                      <section key={i} className="rounded-sm border border-amber/25 bg-background/40 p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/80 mb-2">
                          § {String(i + 1).padStart(2, "0")} · Section
                        </div>
                        <h2 className="font-forensic text-lg md:text-xl font-bold text-amber leading-tight mb-3">
                          {s.title}
                        </h2>
                        <article className="prose prose-invert prose-sm max-w-none prose-headings:font-forensic prose-headings:text-amber prose-h3:mt-4 prose-h3:mb-1 prose-strong:text-amber prose-table:text-xs prose-td:border prose-td:border-amber/20 prose-td:px-2 prose-td:py-1 prose-th:border prose-th:border-amber/30 prose-th:text-amber prose-th:px-2 prose-th:py-1 prose-a:text-amber">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.body.trim()}</ReactMarkdown>
                        </article>
                      </section>
                    ))}
                  </div>

                  <div className="relative flex flex-wrap items-center gap-2 justify-end p-3 border-t border-amber/20 print:hidden">
                    <Button variant="outline" size="sm" onClick={copyOutput} className="border-amber/40 text-amber hover:bg-amber/10">
                      <Copy className="w-3 h-3 mr-1.5" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={printReport} className="border-amber/40 text-amber hover:bg-amber/10">
                      <Printer className="w-3 h-3 mr-1.5" /> Print / PDF
                    </Button>
                  </div>
                </div>

                {/* Sticky action bar — buy the tool or become a licensed rep */}
                <div className="mt-4 sticky bottom-3 z-20 rounded-sm border border-amber/40 bg-background/95 backdrop-blur p-3 flex flex-col sm:flex-row gap-2 items-center justify-between shadow-lg print:hidden">
                  <div className="text-xs text-foreground/80 font-mono uppercase tracking-widest">
                    Like the output? Own the tool — or sell it.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/tools-shop?tool=${encodeURIComponent(toolId)}`}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-amber text-background px-3 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-amber/90"
                    >
                      <ShoppingCart className="w-3 h-3" /> Buy tool · $40
                    </Link>
                    <Link
                      to="/careers/license"
                      className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-500 text-background px-3 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-emerald-500/90"
                    >
                      <Rocket className="w-3 h-3" /> Become a rep · $100
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {!output && (
              <div className="mt-8 rounded-sm border border-amber/30 bg-background/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-foreground/70 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber" />
                  Same engine the operators run. Nothing saved. Nothing logged to your account.
                </div>
                <Link
                  to={`/tools-shop?tool=${encodeURIComponent(toolId)}`}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-amber text-background px-3 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-amber/90 whitespace-nowrap"
                >
                  <ShoppingCart className="w-3 h-3" /> Buy this tool — $40
                </Link>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
