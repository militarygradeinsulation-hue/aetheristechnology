import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileText, Pencil, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { computeAssessment } from "@/lib/xray/engine";
import { buildExport, exportFilename } from "@/lib/xray/export";
import { answerLabel } from "@/lib/xray/questions";
import { money, rangeText, DIMENSION_LABEL, BAND_LABEL } from "@/lib/xray/format";
import { DEMO_BUSINESS_NAME } from "@/lib/xray/sample";
import { ASSUMPTION_GROUPS, type Assumptions } from "@/lib/xray/assumptions";
import { xray, type XRayState } from "@/lib/xray/store";
import type { Assessment } from "@/lib/xray/types";
import { EvidenceLegend, EvidenceTag } from "./EvidenceTag";
import { FrictionMap, ScoreBar } from "./FrictionMap";
import { OpportunityChart } from "./OpportunityChart";
import { FindingCard } from "./FindingCard";
import { AssumptionsEditor } from "./AssumptionsEditor";

function downloadJson(assessment: Assessment, generatedAt: string, demo: boolean) {
  const payload = buildExport(assessment, { generatedAt, demo });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFilename(generatedAt, demo);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const KEY_ASSUMPTIONS: (keyof Assumptions)[] = ["hourlyCost", "weeksPerYear", "recoveryLow", "recoveryBase", "recoveryHigh", "grossMarginPct", "capacityCapPct"];

export function Report({ state }: { state: XRayState }) {
  const assumptions = state.assumptions!;
  const generatedAt = state.generatedAt ?? "";
  const a = useMemo(() => computeAssessment(state.answers, assumptions), [state.answers, assumptions]);
  const dateText = generatedAt ? new Date(generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const metaFor = (k: keyof Assumptions) => ASSUMPTION_GROUPS.flatMap((g) => g.items).find((m) => m.key === k)!;

  return (
    <div>
      {/* Toolbar — screen only */}
      <div className="sticky top-0 z-10 -mx-5 mb-8 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-5 py-3 backdrop-blur print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          <Printer /> Print / save PDF
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadJson(a, generatedAt, state.demo)}>
          <Download /> Download JSON
        </Button>
        <Button size="sm" variant="outline" onClick={() => xray.editAnswers()}>
          <Pencil /> Edit answers
        </Button>
        <Button size="sm" variant="ghost" onClick={() => xray.reset()}>
          <RotateCcw /> Start over
        </Button>
        <Button size="sm" variant="link" asChild className="ml-auto text-copper-strong">
          <Link to="/verify">Request a verified review →</Link>
        </Button>
      </div>

      {state.demo && (
        <div role="note" className="mb-8 border border-copper bg-copper-wash px-4 py-3 text-sm text-copper-strong print:mb-4">
          <span className="eyebrow mr-2">Demo</span>
          This report uses a fictional sample business. The numbers are illustrative and describe no real company.
        </div>
      )}

      <div className="grid min-w-0 gap-10 print:gap-0">
        {/* ── PAGE 1 — cover + executive snapshot ── */}
        <section className="report-page min-w-0 overflow-hidden border border-border bg-paper p-5 sm:p-10" aria-labelledby="p1">
          <div className="flex items-start justify-between gap-4 border-b border-foreground pb-4">
            <p className="eyebrow">Aetheris Technology · Business X-Ray</p>
            <p className="eyebrow text-right text-muted-foreground">Page 1 / 3{state.demo && " · Demo"}</p>
          </div>

          <div className="py-10 sm:py-14">
            <p className="eyebrow text-copper-strong">Executive snapshot</p>
            <h2 id="p1" className="mt-3 font-display text-4xl leading-[1.02] sm:text-6xl">
              Where your business <em>may</em> be losing money.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              {state.demo ? DEMO_BUSINESS_NAME : answerLabel("industry", a.answers.industry)} · {answerLabel("teamSize", a.answers.teamSize)} · prepared {dateText} from
              self-reported answers.
            </p>
          </div>

          <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <p className="eyebrow text-muted-foreground">Possible annual opportunity</p>
                <EvidenceTag kind="ESTIMATED" />
              </div>
              {a.totals.status === "estimated" && a.totals.range ? (
                <>
                  <p className="mt-3 font-mono text-2xl tracking-tight sm:text-5xl">{rangeText(a.totals.range)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Base case <span className="font-mono text-foreground">{money(a.totals.range.base)}</span> · confidence{" "}
                    <span className="text-foreground">{a.confidence}</span> · {a.verifiedCount} items verified
                  </p>
                </>
              ) : (
                <p className="mt-3 font-display text-3xl">
                  {a.totals.status === "none_reported" ? "No measurable friction reported." : "Insufficient information."}
                </p>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                A range of possible value to investigate — not a verified loss, not a guaranteed saving, not a financial audit.
              </p>
            </div>

            <div className="grid gap-4">
              {a.scores.map((s) => (
                <div key={s.dimension}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-medium">{DIMENSION_LABEL[s.dimension]}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.score ?? "—"}/100 · {BAND_LABEL[s.band]}
                    </span>
                  </div>
                  <ScoreBar score={s.score} band={s.band} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <p className="eyebrow mb-3 text-muted-foreground">Investigate first</p>
            {a.findings.length ? (
              <ol className="grid gap-3 sm:grid-cols-3">
                {a.findings.map((f) => (
                  <li key={f.id} className="flex gap-3">
                    <span className="font-mono text-copper-strong">{String(f.rank).padStart(2, "0")}</span>
                    <span className="text-sm">{f.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No finding reached the threshold for priority. See page 3 for a baseline plan.</p>
            )}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <EvidenceLegend verifiedCount={a.verifiedCount} />
          </div>
        </section>

        {/* ── PAGE 2 — friction map + opportunity ── */}
        <section className="report-page min-w-0 overflow-hidden border border-border bg-paper p-5 sm:p-10" aria-labelledby="p2">
          <div className="flex items-start justify-between gap-4 border-b border-foreground pb-4">
            <p className="eyebrow">Friction map & possible opportunity</p>
            <p className="eyebrow text-muted-foreground">Page 2 / 3{state.demo && " · Demo"}</p>
          </div>

          <h2 id="p2" className="mt-8 font-display text-4xl">Friction map</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            0–100 friction score per area, averaged from the answers listed. Higher means more friction reported. Not a benchmark against other businesses.
          </p>
          <div className="mt-6">
            <FrictionMap scores={a.scores} />
          </div>

          <h2 className="mt-12 font-display text-4xl">Possible annual opportunity</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each line measures something different and is counted once. Time-based lines use {money(a.assumptions.hourlyCost)}/hr (
            {a.hourlyCostSource === "SELF_REPORTED" ? "your figure" : "assumed default"}) × recoverable share.
          </p>
          <div className="mt-6">
            <OpportunityChart components={a.components} />
          </div>
          <div className="mt-6 grid gap-1 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>
              Friction hours counted: <span className="font-mono text-foreground">{a.totals.laborHoursPerYear.toLocaleString("en-US")} hrs/yr</span>
              {a.totals.capHoursPerYear !== null && <> · overlap cap {a.totals.capHoursPerYear.toLocaleString("en-US")} hrs/yr{a.totals.capApplied ? " (applied)" : " (not reached)"}</>}
            </p>
            <p>Tool sprawl is scored above but not priced — its cost already appears as repetitive data entry.</p>
          </div>
        </section>

        {/* ── PAGE 3 — priorities, plan, evidence & assumptions ── */}
        <section className="report-page min-w-0 overflow-hidden border border-border bg-paper p-5 sm:p-10" aria-labelledby="p3">
          <div className="flex items-start justify-between gap-4 border-b border-foreground pb-4">
            <p className="eyebrow">Priority actions · evidence · assumptions</p>
            <p className="eyebrow text-muted-foreground">Page 3 / 3{state.demo && " · Demo"}</p>
          </div>

          <h2 id="p3" className="mt-8 font-display text-4xl print:mt-4 print:text-3xl">Three things to investigate</h2>
          <div className="mt-6 grid gap-8 print:mt-3 print:gap-3">
            {a.findings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Insufficient information for priority findings. Your answers don't show a strong friction signal — or don't yet include enough numbers. Use the
                baseline plan below.
              </p>
            )}
            {a.findings.map((f) => (
              <FindingCard key={f.id} finding={f} compact />
            ))}
          </div>

          <h2 className="mt-12 font-display text-3xl print:mt-4 print:text-2xl">Next 30 days</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-4 print:mt-2 print:grid-cols-4">
            {a.plan.map((w) => (
              <li key={w.week} className="avoid-break border-t border-foreground pt-3">
                <p className="eyebrow text-copper-strong">Week {w.week}</p>
                <p className="mt-1 text-sm font-medium">{w.title}</p>
                <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
                  {w.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 border-t border-border pt-6 sm:grid-cols-2 print:mt-4 print:pt-3 print:grid-cols-2">
            <div className="avoid-break">
              <p className="eyebrow mb-2 text-muted-foreground">Key assumptions</p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-border">
                  {KEY_ASSUMPTIONS.map((k) => (
                    <tr key={k}>
                      <td className="py-1">{metaFor(k).label}</td>
                      <td className="py-1 text-right font-mono">
                        {a.assumptions[k]} <span className="text-muted-foreground">{metaFor(k).unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[0.6875rem] text-muted-foreground">Full assumption list included in the JSON export.</p>
            </div>
            <div className="avoid-break">
              <p className="eyebrow mb-2 text-muted-foreground">Data gaps & limitations</p>
              <ul className="grid list-disc gap-1 pl-4 text-xs">
                {[...a.dataGaps, ...a.notes].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 border-t border-border pt-3 text-[0.625rem] text-muted-foreground print:mt-3 print:pt-2">
            Engine v{a.engineVersion} · generated in your browser; nothing was uploaded.
          </p>
        </section>
      </div>

      {/* Screen-only: methodology & assumptions editor */}
      <section className="mt-12 print:hidden" aria-labelledby="method">
        <h2 id="method" className="font-display text-3xl">Review the method</h2>
        <Accordion type="multiple" className="mt-4 border-t border-border">
          <AccordionItem value="assumptions">
            <AccordionTrigger className="text-base">Edit assumptions</AccordionTrigger>
            <AccordionContent>
              <AssumptionsEditor value={assumptions} answers={state.answers} onChange={(next) => xray.setAssumptions(next)} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="formulas">
            <AccordionTrigger className="text-base">How each line is calculated</AccordionTrigger>
            <AccordionContent>
              <ul className="grid gap-4">
                {a.components.map((c) => (
                  <li key={c.id} className="border-l-2 border-copper pl-4">
                    <p className="font-medium">{c.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.formula}</p>
                    <p className="mt-1 text-sm">{c.note}</p>
                    <ul className="mt-2 grid gap-1 text-xs">
                      {c.inputs.map((e) => (
                        <li key={e.label} className="flex items-start gap-2">
                          <EvidenceTag kind={e.kind} />
                          <span>
                            <span className="text-muted-foreground">{e.label}:</span> {e.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="not">
            <AccordionTrigger className="text-base">What this report is not</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Not a financial audit, accounting review or valuation. Not a psychological or personality assessment. Not a guarantee of savings or revenue. It is
              a structured way to decide what to measure first. A Verified Review checks findings against your records.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <div className="mt-8 flex flex-wrap items-center gap-3 border border-border bg-paper p-5">
          <FileText className="size-5 text-copper-strong" />
          <p className="flex-1 text-sm">Want a person to check these findings against your real records?</p>
          <Button asChild>
            <Link to="/verify">Request a verified review</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}