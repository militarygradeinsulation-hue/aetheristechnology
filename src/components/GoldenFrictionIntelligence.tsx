import { useMemo, useState } from "react";
import {
  Activity, ArrowRight,
  ChevronDown, CircleHelp, ClipboardList, Eye, FileText,
  Filter, Lightbulb, Link2, MessageSquareText, Search, ShieldCheck,
  Users2, Wallet, Workflow, X,
} from "lucide-react";
import {
  buildFrictionIntelligence,
  type FrictionLensId,
  type FrictionOpportunity,
} from "../../supabase/functions/_shared/golden-friction-intelligence";
import type { ActiveFrictionSignal } from "../../supabase/functions/_shared/golden-friction-scan";
import { GoldenFrictionWorkspace } from "@/components/GoldenFrictionWorkspace";
import { GoldenMissingTriangulation } from "@/components/GoldenMissingTriangulation";
import {
  EVIDENCE_LABEL, groupInvestigations, observationHeadline,
  type InvestigationGroup,
} from "@/lib/goldenFrictionPresentation";

const LENS_META: Record<FrictionLensId, {
  short: string; label: string; color: string; border: string;
  icon: typeof Workflow; marker: string; bar: string;
}> = {
  operational: {
    short: "Systems", label: "Operational", color: "text-sky-300",
    border: "border-sky-500/30", icon: Workflow, marker: "bg-sky-400", bar: "bg-sky-400",
  },
  perceptual: {
    short: "Buyer view", label: "Perceptual", color: "text-amber-300",
    border: "border-amber-500/30", icon: Eye, marker: "bg-amber-400", bar: "bg-amber-400",
  },
  human: {
    short: "People", label: "Human", color: "text-violet-300",
    border: "border-violet-500/30", icon: Users2, marker: "bg-violet-400", bar: "bg-violet-400",
  },
  economic: {
    short: "Value", label: "Economic", color: "text-emerald-300",
    border: "border-emerald-500/30", icon: Wallet, marker: "bg-emerald-400", bar: "bg-emerald-400",
  },
};

const PATTERN_SUMMARY: Record<string, string> = {
  doorman_risk: "Automation versus human value",
  choice_architecture: "Choice architecture",
  framing_gap: "Message and value clarity",
  dual_logic: "Buyer reassurance",
  handoff_gap: "Process and handoff",
  people_coordination: "Team coordination",
  economic_exposure: "Financial exposure",
};

const evidenceTone = {
  observed: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  linked: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  review: "text-amber-300 border-amber-500/30 bg-amber-500/10",
};

const countUniqueSources = (items: FrictionOpportunity[]): number => new Set(
  items.flatMap(item => item.evidence
    .map(e => e.sourceUrl || e.sourceLocator || "")
    .filter(Boolean)),
).size;

function makeInvestigationPrompt(group: InvestigationGroup): string {
  const item = group.primary;
  const evidence = group.related.flatMap(r => r.evidence);
  return [
    "Investigate this Golden Report behavioral friction case.",
    "Finding: " + item.observation,
    "Related findings: " + group.related.slice(1).map(r => r.observation).join("; "),
    "Original evidence: " + evidence.slice(0, 8).map(e =>
      e.statement + (e.sourceUrl ? " (" + e.sourceUrl + ")" : "")).join("; "),
    "Hypothesis to TEST, not assume: " + item.hypothesis,
    "Suggested small intervention: " + item.test,
    "Measurement: " + item.metric,
    "Explain the probable business consequence without inventing financial numbers.",
    "Give a 7-day test plan, an owner role, data needed, before/after measures,",
    "the result that would disprove this hypothesis, and exact actions.",
    "Separate observed evidence, unverified inference, and missing information.",
  ].join("\n");
}

function EvidenceRow({ item }: { item: FrictionOpportunity }) {
  if (!item.evidence.length) {
    return (
      <p className="text-xs text-amber-200/90">
        Original supporting source not linked. Verify this report statement before acting.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {item.evidence.slice(0, 6).map((e, i) => (
        <li key={e.claimId + ":" + i}
          className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5 text-xs">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-white/55">
              {e.claimId}
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/60">
              {e.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="break-words leading-relaxed text-white/80">{e.statement || "Source record attached"}</p>
          {e.sourceUrl ? (
            <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-amber-300 underline-offset-2 hover:underline">
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/> Open supporting source
            </a>
          ) : e.sourceLocator ? (
            <p className="mt-1 break-all text-white/50">Location: {e.sourceLocator}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function InvestigationCard({
  group, number, onInvestigate,
}: {
  group: InvestigationGroup;
  number: number;
  onInvestigate?: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const item = group.primary;
  const meta = LENS_META[item.lens];
  const Icon = meta.icon;
  const sourceCount = countUniqueSources(group.related);
  return (
    <article className={`overflow-hidden rounded-xl border bg-[#14151b] transition-colors duration-150 ${expanded ? "border-amber-500/45" : "border-white/10 hover:border-white/20"}`}>
      <button type="button" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        className="flex min-h-[84px] w-full items-start gap-3 px-3.5 py-3.5 text-left sm:gap-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] font-mono text-[12px] font-semibold text-amber-300">
          {String(number).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/55">
            <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${meta.color}`}/>
            <span>{meta.label} friction</span>
            <span aria-hidden="true">·</span>
            <span>{PATTERN_SUMMARY[item.pattern] || "Investigate"}</span>
          </div>
          <h4 className="break-words text-[13px] font-semibold leading-[1.5] text-white sm:text-[15px]">
            {observationHeadline(item.observation)}
          </h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55">
            <span>{item.chapter}</span>
            <span>{group.related.length} {group.related.length === 1 ? "finding" : "related findings"}</span>
            {sourceCount > 0 && <span>{sourceCount} {sourceCount === 1 ? "source" : "sources"}</span>}
          </div>
        </div>
        <ChevronDown aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-amber-300 transition-transform ${expanded ? "rotate-180" : ""}`}/>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${evidenceTone[group.strength]}`}>
              {EVIDENCE_LABEL[group.strength]}
            </span>
            {group.lensIds.map(lens => (
              <span key={lens} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/70">
                {LENS_META[lens].label}
              </span>
            ))}
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              <FileText className="h-3.5 w-3.5"/> Observed or reported problem
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">{item.observation}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              <ShieldCheck className="h-3.5 w-3.5"/> Evidence trail
            </div>
            <EvidenceRow item={item}/>
            {group.related.slice(1).length > 0 && (
              <details className="mt-2 rounded-lg border border-white/10 px-3 py-2.5">
                <summary className="cursor-pointer text-xs text-white/75">
                  {group.related.length - 1} related {group.related.length - 1 === 1 ? "observation" : "observations"}
                </summary>
                <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                  {group.related.slice(1).map(related => (
                    <div key={related.id} className="text-xs text-white/75">
                      <p>{related.observation}</p>
                      <div className="mt-2"><EvidenceRow item={related}/></div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.045] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-amber-300">
                <CircleHelp className="h-4 w-4"/> Hypothesis · not verified
              </div>
              <p className="text-xs leading-relaxed text-white/75">{item.hypothesis}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.045] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                <Lightbulb className="h-4 w-4"/> Small test
              </div>
              <p className="text-xs leading-relaxed text-white/75">{item.test}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2 rounded-lg bg-white/[0.04] p-3 text-xs text-white/75">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"/>
            <div><strong className="text-white">Measure: </strong>{item.metric}</div>
          </div>
          {onInvestigate && (
            <button type="button" onClick={() => onInvestigate(makeInvestigationPrompt(group))}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-[#131313] transition hover:bg-amber-300 sm:w-auto">
              <MessageSquareText className="h-4 w-4" aria-hidden="true"/>
              Ask This Report for a test plan
              <ArrowRight className="h-4 w-4" aria-hidden="true"/>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function GoldenFrictionIntelligence({
  report, scanId, onInvestigate,
}: {
  report: unknown;
  scanId?: string;
  onInvestigate?: (prompt: string) => void;
}) {
  const [reviewedSignals, setReviewedSignals] = useState<ActiveFrictionSignal[] | null>(null);
  const [activeLens, setActiveLens] = useState<FrictionLensId | "all">("all");
  const [search, setSearch] = useState("");
  const [onlyEvidence, setOnlyEvidence] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const model = useMemo(() => {
    const record = report && typeof report === "object" && !Array.isArray(report)
      ? report as Record<string, unknown> : {};
    return buildFrictionIntelligence(reviewedSignals
      ? { ...record, behavioral_friction_signals: reviewedSignals } : record);
  }, [report, reviewedSignals]);

  const groups = useMemo(() => groupInvestigations(model.opportunities), [model.opportunities]);
  const verifiedGroups = groups.filter(g => g.strength !== "review").length;
  const sources = countUniqueSources(model.opportunities);
  const searchQuery = search.trim().toLowerCase();
  const filtered = groups.filter(group => {
    if (activeLens !== "all" && !group.lensIds.includes(activeLens)) return false;
    if (onlyEvidence && group.strength === "review") return false;
    if (searchQuery && ![group.primary.observation, group.primary.chapter,
      group.primary.patternLabel, ...group.related.map(r => r.observation)]
      .some(value => value.toLowerCase().includes(searchQuery))) return false;
    return true;
  });
  const visible = showAll ? filtered : filtered.slice(0, 4);

  return (
    <section aria-labelledby="golden-friction-title" className="w-full min-w-0 space-y-5 py-2">
      <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12141b] px-4 py-5 sm:px-6 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-500/[0.065] blur-3xl"/>
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/> Forensic intelligence · Four lenses
          </div>
          <h2 id="golden-friction-title" className="font-forensic text-[23px] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Hidden Friction Analysis
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/60">
            The weak points behind the business metrics. Explore the evidence, test a possible cause,
            and measure what changes. No unsupported psychological or financial claims.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            <div>
              <div className="font-mono text-xl font-semibold text-white sm:text-2xl">{groups.length}</div>
              <div className="text-[10px] text-white/50 sm:text-xs">Distinct cases</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-white sm:text-2xl">{verifiedGroups}</div>
              <div className="text-[10px] text-white/50 sm:text-xs">Source-linked cases</div>
            </div>
            <div>
              <div className="font-mono text-xl font-semibold text-white sm:text-2xl">{sources}</div>
              <div className="text-[10px] text-white/50 sm:text-xs">Source references</div>
            </div>
          </div>
        </div>
      </header>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white/90">Where the friction appears</h3>
          <span className="font-mono text-[10px] text-white/50">SELECT A LENS TO FILTER</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {model.lenses.map((lens, i) => {
            const meta = LENS_META[lens.id];
            const Icon = meta.icon;
            const selected = activeLens === lens.id;
            const count = groups.filter(g => g.lensIds.includes(lens.id)).length;
            const total = Math.max(groups.length, 1);
            return (
              <button key={lens.id} type="button"
                aria-pressed={selected}
                onClick={() => { setActiveLens(prev => prev === lens.id ? "all" : lens.id); setShowAll(false); }}
                className={`min-w-0 rounded-xl border p-3 text-left transition-colors sm:p-4 ${selected ? "border-amber-400/65 bg-white/[0.085]" : "border-white/10 bg-[#16171e] hover:border-white/25"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`rounded-lg bg-white/[0.045] p-2 ${meta.color}`}>
                    <Icon className="h-[17px] w-[17px]" aria-hidden="true"/>
                  </span>
                  <span className="font-mono text-[10px] text-white/40">0{i+1}</span>
                </div>
                <div className="text-xs font-semibold leading-tight text-white">{meta.label}</div>
                <div className="mt-1 text-[10px] leading-tight text-white/50">
                  {lens.status === "not_evaluated" ? "Not yet assessed" :
                    `${count} ${count === 1 ? "case" : "cases"} to review`}
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${meta.bar}`}
                    style={{width: `${Math.max(0,Math.min(100,100*count/total))}%`}}/>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-white/50">
          Counts reflect candidates in this saved report, not a risk score. “Not assessed” is not a clean bill of health.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">Investigation queue</h3>
            <p className="mt-0.5 text-[11px] text-white/50">
              Distinct issues, grouped by their original root cause
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[11px] text-white/70">
            {filtered.length} {filtered.length === 1 ? "case" : "cases"}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex min-h-11 flex-1 items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 h-4 w-4 text-white/45"/>
            <span className="sr-only">Search friction findings</span>
            <input type="search" value={search} onChange={e => {setSearch(e.target.value);setShowAll(false);}}
              placeholder="Search evidence or issue…"
              className="min-h-11 w-full rounded-lg border border-white/15 bg-[#15161d] py-2 pl-9 pr-9 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-amber-400/65"/>
            {search && <button type="button" onClick={() => setSearch("")}
              aria-label="Clear search" className="absolute right-2 flex h-8 w-8 items-center justify-center text-white/65">
              <X className="h-4 w-4"/>
            </button>}
          </label>
          <button type="button" aria-pressed={onlyEvidence} onClick={() => { setOnlyEvidence(v => !v);setShowAll(false); }}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium ${onlyEvidence ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-white/15 bg-[#15161d] text-white/70"}`}>
            <Filter className="h-4 w-4"/> {onlyEvidence ? "Source-linked only" : "Filter to source-linked"}
          </button>
        </div>
        {activeLens !== "all" && (
          <button type="button" onClick={() => setActiveLens("all")}
            className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-amber-300">
            <X className="h-3.5 w-3.5"/> Clear {LENS_META[activeLens].label} filter
          </button>
        )}

        {visible.length ? (
          <div className="space-y-2">
            {visible.map((group, i) => (
              <InvestigationCard key={group.id} group={group} number={i+1}
                onInvestigate={onInvestigate}/>
            ))}
            {!showAll && filtered.length > visible.length && (
              <button type="button" onClick={() => setShowAll(true)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.045] px-4 text-xs font-semibold text-white/85 hover:bg-white/[0.075]">
                View all {filtered.length} investigations
                <ChevronDown className="h-4 w-4"/>
              </button>
            )}
            {showAll && filtered.length > 4 && (
              <button type="button" onClick={() => setShowAll(false)}
                className="flex min-h-10 w-full items-center justify-center gap-2 text-xs font-medium text-white/65">
                Show first four <ChevronDown className="h-4 w-4 rotate-180"/>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#15161d] px-4 py-5">
            <p className="text-sm text-white/85">
              {model.opportunities.length ? "No cases match this filter." : "There is not enough structured evidence to classify any friction."}
            </p>
            <p className="mt-1 text-xs text-white/55">
              Missing findings are not proof that a business is free of friction.
            </p>
            {model.opportunities.length > 0 && (
              <button type="button" className="mt-3 text-xs font-semibold text-amber-300"
                onClick={() => {setSearch("");setActiveLens("all");setOnlyEvidence(false);}}>
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      <GoldenMissingTriangulation report={report} scanId={scanId} onInvestigate={onInvestigate}/>

      {scanId && <GoldenFrictionWorkspace
        scanId={scanId}
        opportunities={model.opportunities}
        onActiveScan={setReviewedSignals}
      />}

      <details className="rounded-xl border border-white/10 bg-[#14151b] p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-white/75">
          <ClipboardList className="h-4 w-4 text-white/50"/> Methodology and limitations
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 border-t border-white/10 pt-3 pl-5 text-xs leading-relaxed text-white/60">
          {model.notes.map(note => <li key={note}>{note}</li>)}
          <li>Source-linked evidence indicates traceability, not necessarily proof that the hypothesis caused the business outcome.</li>
        </ul>
      </details>
    </section>
  );
}
