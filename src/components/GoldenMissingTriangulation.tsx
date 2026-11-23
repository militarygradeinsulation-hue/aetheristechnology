import { useMemo, useState } from "react";
import { GoldenTheoryEvidenceReview, useGoldenTriangulationEvidence } from "@/components/GoldenTriangulationEvidenceReview";
import { VALID_HYPOTHESES, reviewTheoryEvidence, type ReviewHypothesisId } from "../../supabase/functions/_shared/golden-triangulation-review";
import { ArrowRight, BrainCircuit, ChevronDown, CircleHelp, FileQuestion, Link2, SearchCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  buildMissingTriangulation,
  type MissingHypothesis, type MissingSupport,
} from "../../supabase/functions/_shared/golden-missing-triangulation";

const LABEL: Record<MissingSupport, string> = {
  converging: "Multiple independent sources",
  single_source: "One observed source family",
  tentative: "Tentative · verify first",
};
const TONE: Record<MissingSupport, string> = {
  converging: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  single_source: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  tentative: "text-amber-300 border-amber-500/30 bg-amber-500/10",
};
const LENSES = {
  operational: "Operations",
  perceptual: "Buyer perception",
  human: "People and process",
  economic: "Economic opportunity",
};

export function makeTriangulationPrompt(h: MissingHypothesis): string {
  return [
    "Use the existing Golden Report to investigate this MISSING-information hypothesis.",
    "Unknown question: " + h.question,
    "Working theory (not a verified finding): " + h.possibleAnswer,
    "Observed supporting clues: " + h.clues.map(c =>
      c.statement + " [status: " + c.evidenceStatus + "; source: " +
      (c.sourceUrl || c.sourceLocator || "report only") + "]").join("; "),
    "Source family count: " + h.independentSources + "; evidence support: " + h.support,
    "Plausible alternative: " + h.alternateExplanation,
    "Still missing: " + h.missingInformation,
    "Verification step: " + h.verification,
    "Disconfirming result: " + h.disconfirmingResult,
    "Separate source-verified facts, assumptions, and unknowns. Do not manufacture evidence, buyer emotions, conversion rates or financial loss.",
    "Identify the single highest-value next question, and propose a bounded test using real first-party records.",
  ].join("\n");
}

function HypothesisCard({ hypothesis: h, index, onInvestigate, review }: {
  hypothesis: MissingHypothesis; index: number; onInvestigate?: (prompt: string) => void;
  review?: ReturnType<typeof useGoldenTriangulationEvidence>;
}) {
  const [expanded, setExpanded] = useState(false);
  const reviewState = review?.authorized && review.status === "ready" && VALID_HYPOTHESES.has(h.id)
    ? reviewTheoryEvidence(h.id, review.records) : null;
  return <article className="overflow-hidden rounded-xl border border-white/10 bg-[#161820]">
    <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
      className="flex min-h-[88px] w-full items-start gap-3 px-3 py-4 text-left sm:px-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 font-mono text-xs text-amber-300">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-amber-300">{LENSES[h.lens]}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE[h.support]}`}>{LABEL[h.support]}</span>
          {reviewState && reviewState.status !== "unreviewed" && (
            <span className={`rounded-full border border-sky-400/25 px-2 py-0.5 text-[10px] font-medium ${reviewState.status === "challenged" || reviewState.status === "mixed" ? "text-rose-300" : "text-sky-300"}`}>
              Review: {reviewState.status.replaceAll("_"," ")}
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold leading-snug text-white">{h.question}</h4>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/70">
          <span className="font-medium text-white/90">Possible: </span>{h.possibleAnswer}
        </p>
      </div>
      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-amber-300 transition-transform ${expanded ? "rotate-180" : ""}`}/>
    </button>
    {expanded && <div className="space-y-3 border-t border-white/10 px-3 py-4 sm:px-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
          <BrainCircuit className="h-4 w-4"/> Evidence-led theory, not a finding
        </div>
        <p className="text-sm leading-relaxed text-white/85">{h.possibleAnswer}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/60">
          How the clues connect
        </div>
        <p className="text-xs leading-relaxed text-white/75">{h.rationale}</p>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/55">
          Source clues · {h.independentSources} independent observed {h.independentSources === 1 ? "family" : "families"}
        </div>
        <ul className="space-y-2">
          {h.clues.map(c => <li key={c.id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
            <div className="mb-1 font-mono text-[10px] uppercase text-white/45">{c.evidenceStatus.replaceAll("_"," ")}</div>
            <p className="break-words leading-relaxed text-white/75">{c.statement}</p>
            {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-7 max-w-full items-center gap-1 break-all text-amber-300 hover:underline">
              <Link2 className="h-3.5 w-3.5 shrink-0"/> Open source
            </a> : c.sourceLocator ? <p className="mt-1 break-all text-white/50">Record: {c.sourceLocator}</p> : <p className="mt-1 text-white/45">Source not independently confirmed</p>}
          </li>)}
        </ul>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-white/75">
            <CircleHelp className="h-4 w-4"/> Alternative explanation
          </div>
          <p className="text-xs leading-relaxed text-white/65">{h.alternateExplanation}</p>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.035] p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-sky-300">
            <FileQuestion className="h-4 w-4"/> Missing piece
          </div>
          <p className="text-xs leading-relaxed text-white/75">{h.missingInformation}</p>
        </div>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.035] p-3">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
          <SearchCheck className="h-4 w-4"/> Verify the theory
        </div>
        <p className="text-xs leading-relaxed text-white/80">{h.verification}</p>
        <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-relaxed text-white/60">
          <strong className="text-white/80">What could disprove it: </strong>{h.disconfirmingResult}
        </p>
      </div>
      {review?.authorized && VALID_HYPOTHESES.has(h.id) && <GoldenTheoryEvidenceReview
        hypothesisId={h.id as ReviewHypothesisId} records={review.records}
        onSave={review.save} status={review.status} error={review.error}
      />}
      {onInvestigate && <button type="button"
        onClick={() => onInvestigate(makeTriangulationPrompt(h))}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-[#141414] hover:bg-amber-300 sm:w-auto">
        Ask This Report to investigate <ArrowRight className="h-4 w-4"/>
      </button>}
    </div>}
  </article>;
}

export function GoldenMissingTriangulation({ report, scanId, onInvestigate }: {
  report: unknown; scanId?: string; onInvestigate?: (prompt: string) => void;
}) {
  const model = useMemo(() => buildMissingTriangulation(report), [report]);
  const review = useGoldenTriangulationEvidence(scanId);
  const [expanded, setExpanded] = useState(false);
  if (!model.hypotheses.length && !model.zeroCaveats.length && !model.unresolvedAreas.length) return null;
  const visible = expanded ? model.hypotheses : model.hypotheses.slice(0, 3);
  return <section aria-labelledby="golden-missing-title" className="min-w-0 space-y-3 rounded-2xl border border-amber-500/25 bg-[#111319] p-3.5 sm:p-5">
    <header>
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-300">
        <BrainCircuit className="h-4 w-4"/> Missing information · Triangulated theories
      </div>
      <h3 id="golden-missing-title" className="text-lg font-semibold text-white sm:text-xl">
        What the missing data might mean
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-white/65">
        We connect existing evidence to possible answers, then show other explanations and what to verify.
        A missing value is never silently filled with a guess.
      </p>
    </header>

    {!!model.zeroCaveats.length && <div className="space-y-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
        <ShieldAlert className="h-4 w-4"/> Zero is not proof of zero risk
      </div>
      {model.zeroCaveats.map(item => <p key={item} className="text-xs leading-relaxed text-white/70">{item}</p>)}
    </div>}

    {visible.length ? <div className="space-y-2">
      {visible.map((h, i) => <HypothesisCard key={h.id} hypothesis={h} index={i}
        onInvestigate={onInvestigate} review={review}/>)}
      {!expanded && model.hypotheses.length > 3 && <button type="button"
        onClick={() => setExpanded(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-xs font-medium text-white/80">
        View all {model.hypotheses.length} theories <ChevronDown className="h-4 w-4"/>
      </button>}
      {expanded && model.hypotheses.length > 3 && <button type="button"
        onClick={() => setExpanded(false)} className="min-h-11 w-full text-xs text-white/65">Show first three</button>}
    </div> : <p className="rounded-lg border border-white/10 p-3 text-xs text-white/70">
      Insufficient attributable clues for a theory. Additional source records are needed.
    </p>}

    {!!model.unresolvedAreas.length && <details className="rounded-lg border border-white/10 p-3">
      <summary className="cursor-pointer text-xs font-medium text-white/75">
        Missing and unverified report areas ({model.unresolvedAreas.length})
      </summary>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-white/60">
        {model.unresolvedAreas.map(item => <li key={item}>{item}</li>)}
      </ul>
    </details>}
    <details className="rounded-lg border border-white/10 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-xs text-white/65">
        <ShieldCheck className="h-4 w-4"/> How these theories are formed
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 border-t border-white/10 pt-2 pl-4 text-xs text-white/60">
        {model.method.map(m => <li key={m}>{m}</li>)}
      </ul>
    </details>
  </section>;
}
