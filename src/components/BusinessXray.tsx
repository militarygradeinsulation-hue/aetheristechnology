import React, { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";
import {
  buildBusinessXray,
  XRAY_EDGE_LABEL,
  XRAY_STATUS_LABEL,
  type BusinessXray as Xray,
  type XrayNode,
  type XrayNodeStatus,
} from "@/lib/businessXray";

type View = "operates" | "breaks" | "correct";

const STATUS_CLASS: Record<XrayNodeStatus, string> = {
  breakdown: "border-crimson text-crimson bg-crimson/10",
  investigate: "border-amber text-amber bg-amber/10",
  corrected: "border-primary text-primary bg-primary/10",
  unknown: "border-muted-foreground/40 text-muted-foreground bg-muted/20",
};

const EDGE_CLASS = {
  verified: "border-t-2 border-solid border-foreground/70",
  inferred: "border-t-2 border-dashed border-foreground/50",
  unknown: "border-t-2 border-dotted border-muted-foreground/40",
} as const;

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground" aria-label="Map legend">
      {(Object.keys(XRAY_STATUS_LABEL) as XrayNodeStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm border ${STATUS_CLASS[s]}`} aria-hidden />
          {XRAY_STATUS_LABEL[s]}
        </span>
      ))}
      {(Object.keys(EDGE_CLASS) as Array<keyof typeof EDGE_CLASS>).map((b) => (
        <span key={b} className="flex items-center gap-1.5">
          <span className={`inline-block w-6 ${EDGE_CLASS[b]}`} aria-hidden />
          {XRAY_EDGE_LABEL[b]}
        </span>
      ))}
    </div>
  );
}

function NodeDetail({ node, view }: { node: XrayNode; view: View }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-4 space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-forensic text-lg font-bold">{node.label}</h4>
        <span className={`text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 ${STATUS_CLASS[node.status]}`}>
          {XRAY_STATUS_LABEL[node.status]}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Evidence confidence: {node.evidence_confidence}
        </span>
        {node.kind === "internal" && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Internal step · not visible from a public scan</span>
        )}
      </div>
      <p className="text-sm text-foreground/80">{node.description}</p>
      <div className="text-xs text-muted-foreground">Owner: {node.owner || "Not known from this report"}</div>

      {node.findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No findings are linked to this step. That is not proof it works well. It means the scan had no evidence either way.
        </p>
      ) : (
        <ul className="space-y-3">
          {node.findings.map((f) => (
            <li key={f.finding_id} className="border-l-2 border-amber/40 pl-3">
              <div className="text-sm font-semibold">{f.statement}</div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {f.finding_id} · status {f.status}
                {f.root_cause_label ? ` · root cause: ${f.root_cause_label}` : ""}
              </div>
              {view !== "operates" && f.exposure && (
                <div className="text-xs mt-1">
                  <span className="text-crimson">Existing exposure:</span> {f.exposure.label}
                  {f.exposure.shared_with > 1 && (
                    <span className="text-muted-foreground"> · same root cause appears on {f.exposure.shared_with} steps, counted once in the report total</span>
                  )}
                </div>
              )}
              {f.evidence.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {f.evidence.slice(0, 3).map((e) => (
                    <li key={e.claim_id} className="text-xs text-foreground/75">
                      Evidence ({e.status}{e.confidence != null ? `, confidence ${Math.round(e.confidence * 100)}%` : ""}): {e.statement}
                      {e.source_url && <span className="text-muted-foreground"> · {e.source_url}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">No evidence claim is attached to this finding.</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {view === "correct" && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-xs"><span className="text-amber font-semibold">Recommended action:</span> {node.recommended_action || "No action is recorded in the report for this step."}</div>
          <div className="text-xs">
            <span className="text-amber font-semibold">Before and current:</span>{" "}
            {node.correction
              ? `${node.correction.metric}: baseline ${node.correction.baseline}, current ${node.correction.current} (verified ${node.correction.verified_at})`
              : "Unavailable. No baseline or verified correction has been saved for this report."}
          </div>
        </div>
      )}
    </div>
  );
}

export function BusinessXray({ report }: { report: unknown }) {
  const xray: Xray | null = useMemo(() => {
    try { return buildBusinessXray(report); } catch { return null; }
  }, [report]);
  const [view, setView] = useState<View>("breaks");
  const [followPath, setFollowPath] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  if (!xray) {
    return (
      <section className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
        Business X-Ray could not be drawn for this report. The rest of the report is unaffected.
      </section>
    );
  }

  const visible = (n: XrayNode) => (!followPath || n.on_customer_path);
  const journey = xray.nodes.filter((n) => n.kind === "journey" && visible(n));
  const internal = xray.nodes.filter((n) => n.kind === "internal" && visible(n));
  const edgeBetween = (a: string, b: string) => xray.edges.find((e) => e.from === a && e.to === b);
  const selectedNode = xray.nodes.find((n) => n.id === selected) || null;
  const dim = (n: XrayNode) => view === "breaks" && n.status === "unknown" ? "opacity-70" : "";

  const NodeButton = ({ n }: { n: XrayNode }) => (
    <button
      type="button"
      onClick={() => setSelected(n.id === selected ? null : n.id)}
      aria-pressed={selected === n.id}
      aria-label={`${n.label}: ${XRAY_STATUS_LABEL[n.status]}, ${n.findings.length} linked findings`}
      className={`w-full text-left rounded-sm border px-3 py-2 transition ${view === "operates" ? "border-border text-foreground bg-background/50" : STATUS_CLASS[n.status]} ${dim(n)} ${selected === n.id ? "ring-2 ring-amber" : ""}`}
    >
      <div className="text-sm font-semibold text-foreground">{n.label}</div>
      <div className="text-[10px] font-mono uppercase tracking-widest">
        {view === "operates" ? (n.kind === "internal" ? "Internal step" : "Journey step") : XRAY_STATUS_LABEL[n.status].split(".")[0]}
      </div>
      <div className="text-[10px] text-muted-foreground">{n.findings.length} finding(s)</div>
    </button>
  );

  return (
    <section aria-labelledby="xray-title" className="rounded-sm border border-amber/30 p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
            <ScanSearch className="h-3 w-3" /> Business X-Ray
          </div>
          <h3 id="xray-title" className="font-forensic text-xl font-bold">How the business runs, and where it breaks</h3>
          {xray.preliminary && (
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Preliminary map. Built from a public scan only. Steps are a typical customer journey, inferred, not a verified org chart.
              Internal steps stay unknown until the business confirms them.
            </p>
          )}
          {xray.notes.map((t) => <p key={t} className="text-xs text-muted-foreground mt-1">{t}</p>)}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="X-Ray views">
          {([["operates", "How your business operates"], ["breaks", "Where it breaks down"], ["correct", "How to correct it"]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
              className={`text-xs px-2.5 py-1.5 rounded-sm border ${view === k ? "border-amber bg-amber/15 text-amber" : "border-border text-muted-foreground"}`}>{l}</button>
          ))}
          <button type="button" aria-pressed={followPath} onClick={() => setFollowPath((v) => !v)}
            className={`text-xs px-2.5 py-1.5 rounded-sm border ${followPath ? "border-amber bg-amber/15 text-amber" : "border-border text-muted-foreground"}`}>
            Follow a customer path
          </button>
        </div>
      </div>

      <Legend />

      {/* Visual map: horizontal on desktop, vertical on mobile. */}
      <div aria-hidden={false} className="space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Customer journey (inferred sequence)</div>
        <ol className="flex flex-col md:flex-row md:items-center gap-2">
          {journey.map((n, i) => {
            const next = journey[i + 1];
            const e = next ? edgeBetween(n.id, next.id) : undefined;
            return (
              <React.Fragment key={n.id}>
                <li className="md:flex-1 min-w-0"><NodeButton n={n} /></li>
                {e && (
                  <li className="flex md:flex-col items-center gap-1 md:w-16 shrink-0 pl-4 md:pl-0" aria-label={`${e.label}: ${XRAY_EDGE_LABEL[e.basis]}`}>
                    <span className={`w-8 md:w-full ${EDGE_CLASS[e.basis]}`} />
                    <span className="text-[9px] text-muted-foreground">{e.basis}</span>
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
        {internal.length > 0 && (
          <>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Inside the business (not observable from outside)</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {internal.map((n) => {
                const e = xray.edges.find((x) => x.to === n.id || x.from === n.id);
                return (
                  <li key={n.id} className="space-y-1">
                    <NodeButton n={n} />
                    {e && <div className="text-[10px] text-muted-foreground">{e.label}: {XRAY_EDGE_LABEL[e.basis]}</div>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {selectedNode ? (
        <NodeDetail node={selectedNode} view={view} />
      ) : (
        <p className="text-xs text-muted-foreground">Select a step to see its linked findings, evidence, and exposure.</p>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Text version of this map</summary>
        <ul className="mt-2 space-y-1">
          {xray.nodes.filter(visible).map((n) => (
            <li key={n.id}>
              <button type="button" className="underline text-left" onClick={() => setSelected(n.id)}>{n.label}</button>
              {": "}{XRAY_STATUS_LABEL[n.status]}. {n.findings.length} linked finding(s). Evidence confidence {n.evidence_confidence}.
            </li>
          ))}
          {xray.edges.filter((e) => !followPath || e.on_customer_path).map((e) => (
            <li key={`${e.from}-${e.to}`}>{e.label}: {XRAY_EDGE_LABEL[e.basis]}.</li>
          ))}
        </ul>
      </details>
      <p className="text-[11px] text-muted-foreground">
        Owner confirmations and corrections are not yet saved for public reports, so every relationship above stays preliminary.
      </p>
    </section>
  );
}

export default BusinessXray;
