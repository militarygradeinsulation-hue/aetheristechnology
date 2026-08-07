import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Loader2, Download, Copy, Check, ShieldCheck, ShieldAlert, BookOpen,
  Scale, FileDown, ListChecks, Handshake, ChevronDown, ChevronUp,
} from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import { toast } from "@/hooks/use-toast";
import { saveToAdminLibrary } from "@/lib/adminLibrary";

type Tactic = {
  id: string;
  concept: string;
  citation_keys: string[];
  tactic: string;
  script_line: string;
  ethical_use: string;
  manipulator_abuse: string;
  defense_signal: string;
};

type Result = {
  scenario_summary: string;
  tactics: Tactic[];
};

// -------- Static citations panel (Mauss / Regan / Mexico-Ethiopia) --------
const CITATIONS: Record<string, { label: string; body: string }> = {
  Mauss: {
    label: "Mauss · The Gift (1925)",
    body:
      "Marcel Mauss showed reciprocation is a tripartite obligation running through every known culture: the obligation to GIVE, the obligation to RECEIVE (refusing a real gift carries a social cost), and the obligation to REPAY. 'Much obliged' literally means 'I am now in debt.' Every operator surface should complete all three loops before asking for anything.",
  },
  Regan: {
    label: "Regan · Cornell Coke Study (1971)",
    body:
      "Regan's confederate 'Joe' handed subjects an unsolicited 10¢ Coca-Cola, then later asked them to buy raffle tickets. Subjects who received the Coke bought roughly 500% more raffle tickets AND the effect held even for subjects who disliked Joe. The gift neutralized liking. Warmth is a bonus. The gift is the primary weapon.",
  },
  "Mexico-Ethiopia": {
    label: "Mexico ↔ Ethiopia · 1935 → 1985",
    body:
      "In 1985, at the peak of its own famine, the Ethiopian Red Cross sent aid to earthquake victims in Mexico — repaying a debt Mexico had incurred in 1935 during the Italian invasion of Ethiopia. Reciprocation survived 50 years, acute deprivation, and cultural distance. Operator translation: a real diagnostic delivered today creates a debt that survives long silences. Follow-up cadence should assume the debt still compounds.",
  },
};

const CITATION_ORDER: Array<keyof typeof CITATIONS> = ["Mauss", "Regan", "Mexico-Ethiopia"];

// -------- Defense checklist (Reciprocation Doctrine → step-by-step reader guide) --------
const DEFENSE_CHECKLIST: { step: string; check: string; why: string }[] = [
  {
    step: "1. Name the gift out loud.",
    check: "Say it: 'They gave me X.' If you can't name it, the gift was a compliance prop, not a real value transfer.",
    why: "Reciprocation runs automatically (Cialdini's 'click-whirr'). Naming the gift breaks the tape.",
  },
  {
    step: "2. Ask: was it unsolicited?",
    check: "Did you request it? If not, treat the pressure to reciprocate as EXTERNALLY induced, not a moral duty.",
    why: "Regan's Coke worked precisely because subjects didn't ask for it. Unsolicited = trigger armed.",
  },
  {
    step: "3. Score the asymmetry.",
    check: "Estimate the value of the 'gift' vs. the value of what they're asking back. If the return is 3-10× the gift, you're in a Hare Krishna / DAV pattern.",
    why: "Compliance professionals bank on tiny gifts producing massive returns (address labels: 18% → 35%).",
  },
  {
    step: "4. Apply Redefinition.",
    check: "Relabel the gift as a SALES DEVICE, not a favor. Cialdini's defense: 'trick, not gift → no debt owed.'",
    why: "Once you name it a tactic, the click-whirr circuit will not fire on it.",
  },
  {
    step: "5. Keep the gift, decline the ask.",
    check: "If the value is real, take it. If the ask is manipulative, walk. You owe nothing to a manipulator's setup.",
    why: "The rule requires favors for favors, not favors for tricks. Exploit the exploiter.",
  },
  {
    step: "6. Watch for the retreat.",
    check: "If the first ask is refused and immediately replaced by a smaller one, you're inside rejection-then-retreat. Anchor + retreat = engineered concession.",
    why: "Boy Scout: $5 ticket refused → $1 chocolate accepted. The retreat is the weapon, not the small ask.",
  },
  {
    step: "7. Watch for the compounding-debt play.",
    check: "If a stranger references a favor from months/years ago to justify a new ask, remember Mexico → Ethiopia. The rule transcends time and famine — but only if the original gift was real.",
    why: "Long-silence follow-ups exploit the same nerve. Legitimate operators still ship value on every touch.",
  },
  {
    step: "8. Demand a non-needy exit.",
    check: "A legitimate giver signals 'keep this, act or don't, either way you have the number.' A manipulator signals 'and therefore you should…'",
    why: "Neediness collapses the gift into a bribe. The exit line is the tell.",
  },
];

// -------- Utility: markdown export --------
function toMarkdown(scenario: string, company: string, url: string, result: Result | null, tactics: Tactic[]): string {
  const lines: string[] = [];
  lines.push(`# Reciprocation Tactics — Aetheris Doctrine Engine`);
  lines.push(``);
  lines.push(`**Company:** ${company || "(unspecified)"}`);
  if (url) lines.push(`**URL:** ${url}`);
  lines.push(`**Scenario:** ${scenario || "(inferred)"}`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(``);
  if (result?.scenario_summary) {
    lines.push(`## Scenario Summary`);
    lines.push(result.scenario_summary);
    lines.push(``);
  }
  lines.push(`## Citations`);
  for (const key of CITATION_ORDER) {
    const c = CITATIONS[key];
    lines.push(`### ${c.label}`);
    lines.push(c.body);
    lines.push(``);
  }
  lines.push(`## Tactics`);
  tactics.forEach((t, i) => {
    lines.push(`### ${i + 1}. ${t.concept}`);
    lines.push(`*Citations:* ${t.citation_keys.join(", ")}`);
    lines.push(``);
    lines.push(`**Tactic:** ${t.tactic}`);
    lines.push(``);
    lines.push(`**Script line:** "${t.script_line}"`);
    lines.push(``);
    lines.push(`**Ethical use:** ${t.ethical_use}`);
    lines.push(``);
    lines.push(`**Manipulator abuse:** ${t.manipulator_abuse}`);
    lines.push(``);
    lines.push(`**Defense signal:** ${t.defense_signal}`);
    lines.push(``);
  });
  lines.push(`## Reader Defense Checklist — Reciprocation Doctrine`);
  DEFENSE_CHECKLIST.forEach((d) => {
    lines.push(`- **${d.step}** ${d.check}`);
    lines.push(`  - *Why:* ${d.why}`);
  });
  return lines.join("\n");
}

function downloadFile(name: string, mime: string, content: string | Blob) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReciprocationDoctrineTool() {
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [tactics, setTactics] = useState<Tactic[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [citationsOpen, setCitationsOpen] = useState(false);

  const isAdmin = !!getAdminToken();
  const headers: Record<string, string> = isAdmin
    ? { "x-admin-token": getAdminToken() || "" }
    : { "x-portal-token": getPortalToken() || "" };

  const generate = async () => {
    if (!scenario.trim() && !url.trim()) {
      toast({ title: "Add a scenario or a URL", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reciprocation-tactics", {
        body: { scenario: scenario.trim(), company: company.trim(), url: url.trim() },
        headers,
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const r = data as Result;
      setResult(r);
      setTactics(Array.isArray(r?.tactics) ? r.tactics : []);
      toast({ title: "6 tactics ready" });

      // Auto-save to Library so it shows up in Recent Runs immediately.
      if (isAdmin) {
        try {
          await saveToAdminLibrary({
            tool_type: "reciprocation_tactics",
            title: `Reciprocation Tactics · ${company.trim() || url.trim() || "Untitled"}`,
            input_data: { scenario, company, url },
            output_data: r,
          });
        } catch { /* ignore save failure */ }
      }
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const editTactic = (id: string, patch: Partial<Tactic>) => {
    setTactics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const downloadMarkdown = () => {
    const md = toMarkdown(scenario, company, url, result, tactics);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`reciprocation-tactics-${stamp}.md`, "text/markdown", md);
  };

  const downloadJson = () => {
    const payload = { scenario, company, url, result, tactics, defense_checklist: DEFENSE_CHECKLIST };
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`reciprocation-tactics-${stamp}.json`, "application/json", JSON.stringify(payload, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Handshake className="w-6 h-6 text-amber shrink-0 mt-0.5" />
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display">Reciprocation Doctrine Engine</h2>
          <p className="text-sm text-muted-foreground">
            Convert Cialdini's Rule of Reciprocation into six concrete, editable operator tactics — each shipped with
            citations, ethical-use guardrails, manipulator-abuse warnings, and a reader defense checklist.
          </p>
        </div>
      </div>

      {/* Intake */}
      <Card className="p-4 bg-card border-border space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <Input placeholder="Company / operator (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Input placeholder="URL (optional — anchors the scenario)" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <Textarea
          rows={3}
          placeholder="Scenario: who you're contacting, the leak you're naming, the outcome you want. e.g. 'Cold-DM a $12M HVAC operator whose ServiceTitan shows $340k/yr follow-up leak; push toward a $7,500 Signal Pack.'"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        />
        <Button onClick={generate} disabled={loading} className="bg-amber-500 text-black hover:bg-amber-400">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Handshake className="w-4 h-4 mr-2" />}
          Generate 6 Tactics
        </Button>
      </Card>

      {/* Inline Citations panel — collapsed by default */}
      <Card className="bg-card border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setCitationsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber" />
            <h3 className="font-semibold tracking-wide text-sm">Inline Citations Panel</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">
              referenced by every tactic below
            </span>
            {citationsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {citationsOpen && (
          <div className="px-3 pb-3 grid md:grid-cols-3 gap-3">
            {CITATION_ORDER.map((key) => {
              const c = CITATIONS[key];
              return (
                <div key={key} className="border border-border rounded-md p-3 bg-muted/20">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">{key}</div>
                  <div className="font-serif font-semibold text-sm mb-2">{c.label}</div>
                  <p className="text-xs leading-relaxed text-foreground/85">{c.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-0 bg-card border-border overflow-hidden">
          <div className="p-5 border-b border-border bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
                  Case File · Reciprocation Tactics
                </div>
                <h4 className="font-serif text-lg font-bold">
                  {company || url || "Untitled scenario"}
                </h4>
                {result.scenario_summary && (
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{result.scenario_summary}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={downloadMarkdown} className="bg-amber-500 text-black hover:bg-amber-400">
                  <FileDown className="w-4 h-4 mr-1" /> Markdown
                </Button>
                <Button size="sm" variant="outline" onClick={downloadJson}>
                  <Download className="w-4 h-4 mr-1" /> JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(toMarkdown(scenario, company, url, result, tactics), "all-md")}
                >
                  {copiedId === "all-md" ? <Check className="w-4 h-4 mr-1 text-amber" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy all
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {tactics.map((t, idx) => (
              <div key={t.id || idx} className="border border-border rounded-md bg-muted/10 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-amber text-[10px] shrink-0">T{String(idx + 1).padStart(2, "0")}</span>
                    <Input
                      value={t.concept}
                      onChange={(e) => editTactic(t.id, { concept: e.target.value })}
                      className="h-7 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-serif font-semibold text-sm px-0"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {t.citation_keys?.map((k) => (
                      <span key={k} className="text-[9px] font-mono uppercase tracking-widest bg-amber/10 border border-amber/30 text-amber px-1.5 py-0.5 rounded-sm">
                        {k}
                      </span>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        copy(
                          `Tactic ${idx + 1}: ${t.concept}\n\n${t.tactic}\n\nScript: "${t.script_line}"\n\nEthical: ${t.ethical_use}\n\nAbuse: ${t.manipulator_abuse}\n\nDefense: ${t.defense_signal}`,
                          `t-${idx}`,
                        )
                      }
                    >
                      {copiedId === `t-${idx}` ? <Check className="w-3.5 h-3.5 text-amber" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">Tactic (edit freely)</div>
                    <Textarea
                      value={t.tactic}
                      onChange={(e) => editTactic(t.id, { tactic: e.target.value })}
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">Script line</div>
                    <Textarea
                      value={t.script_line}
                      onChange={(e) => editTactic(t.id, { script_line: e.target.value })}
                      rows={2}
                      className="text-sm font-mono"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="border border-emerald-500/30 bg-emerald-500/5 rounded p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Ethical use</div>
                      </div>
                      <Textarea
                        value={t.ethical_use}
                        onChange={(e) => editTactic(t.id, { ethical_use: e.target.value })}
                        rows={3}
                        className="text-xs bg-background/60"
                      />
                    </div>
                    <div className="border border-crimson/40 bg-crimson/5 rounded p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-crimson" />
                        <div className="text-[10px] font-mono uppercase tracking-widest text-crimson">Manipulator abuse</div>
                      </div>
                      <Textarea
                        value={t.manipulator_abuse}
                        onChange={(e) => editTactic(t.id, { manipulator_abuse: e.target.value })}
                        rows={3}
                        className="text-xs bg-background/60"
                      />
                    </div>
                  </div>

                  <div className="border-l-2 border-amber/60 pl-3 py-1 bg-amber/5 rounded-r">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Scale className="w-3.5 h-3.5 text-amber" />
                      <div className="text-[10px] font-mono uppercase tracking-widest text-amber">Reader defense signal</div>
                    </div>
                    <Textarea
                      value={t.defense_signal}
                      onChange={(e) => editTactic(t.id, { defense_signal: e.target.value })}
                      rows={2}
                      className="text-xs bg-background/40"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Defense checklist — always visible */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-amber" />
            <h3 className="font-semibold tracking-wide">Reader Defense Checklist — Reciprocation Doctrine</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadFile(
                `reciprocation-defense-checklist-${new Date().toISOString().slice(0, 10)}.md`,
                "text/markdown",
                [
                  "# Reader Defense Checklist — Reciprocation Doctrine",
                  "",
                  ...DEFENSE_CHECKLIST.flatMap((d) => [
                    `- [ ] **${d.step}** ${d.check}`,
                    `  - *Why:* ${d.why}`,
                  ]),
                ].join("\n"),
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download checklist
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Print it. Tape it above your desk. Every time a stranger sends you a "gift," walk it top-to-bottom.
        </p>
        <ul className="space-y-2">
          {DEFENSE_CHECKLIST.map((d, i) => (
            <li key={i} className="flex items-start gap-3 border border-border rounded p-3 bg-muted/10">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-1 accent-amber shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{d.step}</div>
                <div className="text-xs text-foreground/85 mt-0.5">{d.check}</div>
                <div className="text-[11px] italic text-muted-foreground mt-1">Why: {d.why}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default ReciprocationDoctrineTool;
