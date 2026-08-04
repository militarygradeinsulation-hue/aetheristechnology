import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, X, Wrench } from "lucide-react";

export type FixPanelChapter = {
  no?: number;
  slug?: string;
  title?: string;
  verdict?: string | null;
  what_we_found?: string | null;
  why_its_leaking?: string | null;
  what_its_costing?: string | null;
};

export type FixPanelReport = {
  executive_summary?: string | null;
  top_leaks?: Array<{ name?: string | null; chapter_slug?: string | null }> | null;
  chapters?: FixPanelChapter[] | null;
  deliverables?: unknown;
};

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Builds the quick-action buttons from what is actually on screen, so the
 * prompts name this company's real leaks instead of generic questions.
 */
export function buildFixPrompts(report: FixPanelReport | null | undefined, company: string): string[] {
  const out: string[] = [
    "What are the top 5 leaks in this report?",
    "Write out a plan to start fixing these.",
  ];
  const leaks = (report?.top_leaks || []).map((l) => String(l?.name || "").trim()).filter(Boolean);
  if (leaks[0]) out.push(`How do I fix "${leaks[0]}" first?`);
  if (leaks[1]) out.push(`What does fixing "${leaks[1]}" actually cost me?`);
  out.push("What can I fix myself this week for free?");
  out.push(`Who should own each fix inside ${company || "my company"}?`);
  const chapters = (report?.chapters || []).filter((c) => c?.title);
  const costly = chapters.find((c) => /pipeline|lead/i.test(String(c.title)));
  if (costly) out.push(`Give me a 30 day plan for ${costly.title}.`);
  out.push("Where am I losing the most money right now and why?");
  if (report?.deliverables) out.push("Turn the growth assets into a 30 day launch plan.");
  out.push("What would you do first if this were your business?");
  return out.slice(0, 10);
}

export function chapterFixPrompt(c: FixPanelChapter, company: string): string {
  return [
    `Fix this chapter for ${company || "my company"}.`,
    "",
    `CHAPTER ${c.no ?? ""} — ${c.title ?? ""}`,
    c.verdict ? `Verdict: ${c.verdict}` : "",
    c.what_we_found ? `What we found: ${c.what_we_found}` : "",
    c.why_its_leaking ? `Why it is leaking: ${c.why_its_leaking}` : "",
    c.what_its_costing ? `What it is costing: ${c.what_its_costing}` : "",
    "",
    "Give me the real fix: the exact steps, who does them, what tools or vendors, how long it takes, what it costs, and how I will know it worked. Advise me like an operator, not like a report summary.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function GoldenFixPanel({
  scanId,
  report,
  company,
  seed,
  onClose,
  variant = "docked",
}: {
  scanId: string;
  report?: FixPanelReport | null;
  company: string;
  /** A prompt to send automatically when the panel opens or the seed changes. */
  seed?: string | null;
  onClose?: () => void;
  variant?: "docked" | "page";
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sentSeed = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompts = useMemo(() => buildFixPrompts(report, company), [report, company]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !scanId || busy) return;
    setInput("");
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("forensic-report-chat", {
        body: { scan_id: scanId, question: q, history, mode: "advisor" },
      });
      if (error) throw error;
      setMessages((m) => [...m, { role: "assistant", content: data?.answer || "(no answer)" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!seed || sentSeed.current === seed) return;
    sentSeed.current = seed;
    void ask(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const shell =
    variant === "docked"
      ? "fixed z-50 right-0 bottom-0 top-0 w-full sm:w-[420px] border-l border-amber-500/30 bg-background shadow-2xl flex flex-col"
      : "flex flex-col rounded-lg border border-border bg-card min-h-[520px]";

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-gradient-to-b from-amber-500/10 to-transparent">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-amber-500">Aetheris Operator · Live</div>
          <div className="font-serif font-bold truncate">Fix this for me</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask anything about {company || "this report"} — or hit a button below. I will give you real strategy, not
            just what the report says.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[92%] rounded px-3 py-2 text-sm whitespace-pre-wrap text-left ${
                m.role === "user" ? "bg-amber-500 text-black" : "bg-muted"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-widest">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working the case file…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5 max-h-[104px] overflow-y-auto">
          {prompts.map((p) => (
            <button
              key={p}
              disabled={busy}
              onClick={() => ask(p)}
              className="text-[11px] leading-tight px-2 py-1 rounded border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 disabled:opacity-50 text-left"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Ask for the fix…"
            disabled={busy}
          />
          <Button onClick={() => ask(input)} disabled={busy || !input.trim()} className="bg-amber-500 text-black hover:bg-amber-400">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FixThisForMeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Wrench className="w-4 h-4 mr-1" /> Fix this for me
    </Button>
  );
}

export default GoldenFixPanel;
