import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, ShoppingCart, RefreshCw } from "lucide-react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { findTool } from "@/lib/tool-shop-catalog";
import { toast } from "sonner";

/**
 * Public sandbox runner for any Chaos Ecosystem tool.
 * - No auth, no rep code, no portal data, no client secrets.
 * - Nothing is persisted (no localStorage, no supabase writes).
 * - State clears on unmount and on manual "Reset".
 */

const TRY_META: Record<string, { title: string; inputLabel: string; inputHint: string }> = {
  "website-scanner":      { title: "Website Leak Scanner",      inputLabel: "Website URL",      inputHint: "https://example.com" },
  "brand-contradictions": { title: "Brand Contradictions",      inputLabel: "Brand or URL",     inputHint: "brand.com or a tagline" },
  "friction-audit":       { title: "Friction Audit",            inputLabel: "Funnel or URL",    inputHint: "Describe the buyer path or drop a URL" },
  "strategic-questions":  { title: "Strategic Questions",       inputLabel: "Company / role",   inputHint: "e.g. 'Series A SaaS CEO'" },
  "detective-mode":       { title: "Detective Mode",            inputLabel: "Business + URL",   inputHint: "e.g. 'Acme Co · acme.com'" },
  "forensic-scan-all":    { title: "Forensic Scan (All)",       inputLabel: "Website URL",      inputHint: "https://example.com" },
  "all-in-one":           { title: "All-In-One Content",        inputLabel: "Topic",            inputHint: "e.g. 'AI-powered onboarding'" },
  "content-calendar":     { title: "Content Calendar Builder",  inputLabel: "Niche",            inputHint: "e.g. 'B2B fintech'" },
  "playbook-generator":   { title: "Playbook Generator",        inputLabel: "Function or goal", inputHint: "e.g. 'Outbound SDR playbook'" },
  "social-content":       { title: "Social Content Studio",     inputLabel: "Topic",            inputHint: "Punchy topic" },
  "content-engine":       { title: "Content Engine",            inputLabel: "Core idea",        inputHint: "The one insight to expand" },
  "image-studio":         { title: "Image Studio",              inputLabel: "Scene",            inputHint: "e.g. 'operator at forensic desk'" },
  "creation-studio":      { title: "Creation Studio",           inputLabel: "Asset request",    inputHint: "e.g. 'launch kit for Q4'" },
  "easy-mode":            { title: "Easy Mode",                 inputLabel: "One-line goal",    inputHint: "e.g. 'get 10 booked calls this month'" },
  "tool-generator":       { title: "Tool Generator",            inputLabel: "Tool brief",       inputHint: "e.g. 'calculator for pipeline leak $'" },
};

export default function TryToolPage() {
  const { toolId = "" } = useParams();
  const tool = useMemo(() => findTool(toolId), [toolId]);
  const meta = TRY_META[toolId];

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear everything when leaving the page — nothing persists.
  useEffect(() => () => { setInput(""); setOutput(""); }, [toolId]);

  const reset = () => { setInput(""); setOutput(""); };

  const run = async () => {
    const trimmed = input.trim();
    if (!trimmed) { toast.error(`${meta?.inputLabel || "Input"} is required`); return; }
    setLoading(true);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("try-tool-sandbox", {
        body: { toolId, input: trimmed },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.output || "";
      if (!text) throw new Error("Empty response");
      setOutput(text);
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

            <label className="block font-mono text-[10px] uppercase tracking-widest text-amber mb-2">
              {meta.inputLabel}
            </label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={meta.inputHint}
              className="bg-background/70 border-amber/30 font-mono text-sm"
              maxLength={800}
              disabled={loading}
            />

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                onClick={run}
                disabled={loading || !input.trim()}
                className="bg-amber text-background hover:bg-amber/90 font-semibold flex-1"
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Running sandbox…</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Run demo</>}
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

            {output && (
              <div className="mt-6 border-t border-amber/20 pt-5">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber/80 mb-3">
                  Output
                </div>
                <article className="prose prose-invert prose-sm max-w-none prose-headings:font-forensic prose-headings:text-amber prose-h2:mt-6 prose-h2:mb-2 prose-h3:mt-4 prose-h3:mb-1 prose-strong:text-amber prose-table:text-xs prose-td:border prose-td:border-amber/20 prose-th:border prose-th:border-amber/30 prose-th:text-amber prose-a:text-amber">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </article>
              </div>
            )}

            <div className="mt-8 rounded-sm border border-amber/30 bg-background/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-foreground/70">
                Like it? Buy it once — <span className="text-amber">$40 lifetime</span>, unlimited runs, persistent memory.
              </div>
              <Link
                to={`/tools-shop?tool=${encodeURIComponent(toolId)}`}
                className="inline-flex items-center gap-1.5 rounded-sm bg-amber text-background px-3 py-2 text-xs font-mono uppercase tracking-widest font-bold hover:bg-amber/90 whitespace-nowrap"
              >
                <ShoppingCart className="w-3 h-3" /> Buy this tool
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
