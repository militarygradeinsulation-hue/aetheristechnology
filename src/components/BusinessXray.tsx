import React, { useMemo, useState } from "react";
import { ScanSearch, AlertTriangle } from "lucide-react";
import {
  buildBusinessXray,
  XRAY_EDGE_LABEL,
  XRAY_STATUS_LABEL,
  type BusinessXray as Xray,
  type XrayEdge,
  type XrayNode,
  type XrayNodeStatus,
} from "@/lib/businessXray";

type View = "operates" | "breaks" | "correct";

const STATUS_CLASS: Record<XrayNodeStatus, string> = {
  breakdown: "border-crimson text-crimson bg-crimson/10",
  investigate: "border-amber text-amber bg-amber/10",
  corrected: "border-verified text-verified bg-verified/10",
  unknown: "border-muted-foreground/40 text-muted-foreground bg-muted/20",
};

const EDGE_CLASS = {
  verified: "border-t-2 border-solid",
  inferred: "border-t-2 border-dashed",
  unknown: "border-t-2 border-dotted",
} as const;

const shortStatus = (s: XrayNodeStatus) => XRAY_STATUS_LABEL[s].split(".")[0];

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
          <span className={`inline-block w-6 border-foreground/60 ${EDGE_CLASS[b]}`} aria-hidden />
          {XRAY_EDGE_LABEL[b]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 border-t-2 border-dashed border-crimson" aria-hidden /> Friction on this handoff
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">{children}</div>;
}

function NodeDetail({ node, view }: { node: XrayNode; view: View }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-4 space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-forensic text-lg font-bold">{node.label}</h4>
        <span className={`text-[10px] font-mono uppercase tracking-widest border rounded-sm px-1.5 py-0.5 ${STATUS_CLASS[node.status]}`}>
          {XRAY_STATUS_LABEL[node.status]}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Evidence confidence: {node.evidence_confidence}
        </span>
        {node.kind === "internal" && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Internal step</span>
        )}
      </div>

      <div>
        <Label>Current state</Label>
        <p className="text-sm text-foreground/90">{node.summary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 text-xs">
        <div><Label>Why it matters</Label><p className="text-foreground/80">{node.why_it_matters}</p></div>
        <div>
          <Label>Impacts downstream</Label>
          <p className="text-foreground/80">{node.downstream.length ? node.downstream.join(", ") : "End of the mapped journey"}</p>
          <p className="text-muted-foreground mt-1">Owner: {node.owner || "Not known from this report"}</p>
        </div>
      </div>

      {node.root_causes.length > 0 && (
        <div className="text-xs"><Label>Root causes</Label><ul className="list-disc pl-4 space-y-0.5">{node.root_causes.map((r) => <li key={r}>{r}</li>)}</ul></div>
      )}

      {view !== "operates" && node.exposures.length > 0 && (
        <div className="text-xs">
          <Label>Estimated exposure (existing ledger entries)</Label>
          <ul className="space-y-1">
            {node.exposures.map((x) => (
              <li key={x.leak_id}>
                <span className="text-crimson">{x.label}</span> · {x.title}
                {x.shared_with > 1 && (
                  <span className="text-muted-foreground"> · spans {x.shared_with} stages{x.primary ? "" : ", listed under another stage"}; counted once in the report total</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.findings.length > 0 && (
        <div>
          <Label>Findings linked to this stage · {node.findings.length}</Label>
          <ul className="space-y-3">
            {node.findings.map((f) => (
              <li key={f.finding_id} className="border-l-2 border-amber/40 pl-3">
                <div className="text-sm font-semibold">{f.statement}</div>
                <div className="text-[11px] text-muted-foreground font-mono break-words">
                  {f.finding_id} · {f.status}
                  {f.chapter_slug ? ` · source: ${f.chapter_slug}` : ""}
                  {f.root_cause_label ? ` · root cause: ${f.root_cause_label}` : ""}
                </div>
                {f.evidence.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {f.evidence.slice(0, 2).map((e) => (
                      <li key={e.claim_id} className="text-xs text-foreground/75 break-words">
                        {e.claim_id} ({e.status}{e.confidence != null ? `, ${Math.round(e.confidence * 100)}%` : ""}): {e.statement}
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
        </div>
      )}

      {node.chapters.length > 0 && (
        <div>
          <Label>From the report chapters</Label>
          <ul className="space-y-2">
            {node.chapters.map((c) => (
              <li key={c.slug} className="text-xs">
                <span className="font-semibold text-foreground">{c.title}</span>
                <span className="text-muted-foreground font-mono"> · {c.slug}</span>
                {c.verdict && <div className="text-foreground/80">{c.verdict}</div>}
                {c.evidence.length > 0 && (
                  <div className="text-muted-foreground break-words">{c.evidence.map((e) => `${e.label}: ${e.value}`).join(" · ").slice(0, 280)}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === "correct" && (
        <div className="space-y-2 border-t border-border pt-3 text-xs">
          <Label>How to correct it (from the report)</Label>
          {node.recommended_actions.length ? (
            <ol className="list-decimal pl-4 space-y-1">{node.recommended_actions.map((a) => <li key={a}>{a}</li>)}</ol>
          ) : (
            <p className="text-muted-foreground">No action is recorded in the report for this stage.</p>
          )}
          <p>
            <span className="text-amber font-semibold">Before and current:</span>{" "}
            {node.correction
              ? `${node.correction.metric}: baseline ${node.correction.baseline}, current ${node.correction.current} (verified ${node.correction.verified_at})`
              : "Unavailable. No baseline or verified correction has been saved for this report."}
          </p>
        </div>
      )}
    </div>
  );
}

function EdgeMark({ e, highlight }: { e: XrayEdge; highlight: boolean }) {
  const color = highlight && e.friction ? "border-crimson" : "border-foreground/50";
  return (
    <li className="flex md:flex-col items-center gap-1 md:w-20 shrink-0 pl-4 md:pl-0" aria-label={`${e.label}: ${XRAY_EDGE_LABEL[e.basis]}${e.friction ? ", friction present" : ""}`}>
      <span className={`w-8 md:w-full ${EDGE_CLASS[e.basis]} ${color}`} />
      <span className={`text-[9px] ${highlight && e.friction ? "text-crimson" : "text-muted-foreground"}`}>
        {e.basis}{highlight && e.friction ? " · friction" : ""}
      </span>
    </li>
  );
}

export function BusinessXray({ report }: { report: unknown }) {
  const xray: Xray | null = useMemo(() => {
    try { return buildBusinessXray(report); } catch { return null; }
  }, [report]);
  const [view, setView] = useState<View>("breaks");
  const [followPath, setFollowPath] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  if (!xray) {
    return (
      <section className="rounded-sm border border-border p-4 text-sm text-muted-foreground">
        Business X-Ray could not be drawn for this report. The rest of the report is unaffected.
      </section>
    );
  }

  // Default selection: strongest break, so the map is never a blank sequence.
  const selected = picked ?? xray.ranked[0] ?? null;
  const visible = (n: XrayNode) => !followPath || n.on_customer_path;
  const journey = xray.nodes.filter((n) => n.kind === "journey" && visible(n));
  const internal = xray.nodes.filter((n) => n.kind === "internal" && visible(n));
  const edgeBetween = (a: string, b: string) => xray.edges.find((e) => e.from === a && e.to === b);
  const selectedNode = xray.nodes.find((n) => n.id === selected) || null;
  const rank = (id: string) => xray.ranked.indexOf(id as never);

  const NodeButton = ({ n }: { n: XrayNode }) => {
    const r = rank(n.id);
    return (
      <button
        type="button"
        onClick={() => setPicked(n.id)}
        aria-pressed={selected === n.id}
        aria-label={`${n.label}: ${XRAY_STATUS_LABEL[n.status]}, ${n.findings.length} linked findings`}
        className={`relative w-full h-full text-left rounded-sm border px-3 py-2 transition ${view === "operates" ? "border-border bg-background/50" : STATUS_CLASS[n.status]} ${selected === n.id ? "ring-2 ring-amber" : ""}`}
      >
        {view === "breaks" && r >= 0 && r < 3 && (
          <span className="absolute top-1 right-1.5 text-[9px] font-mono text-crimson">#{r + 1}</span>
        )}
        <div className="text-sm font-semibold text-foreground">{n.label}</div>
        <div className="text-[10px] font-mono uppercase tracking-widest">
          {view === "operates" ? (n.kind === "internal" ? "Internal step" : "Journey step") : shortStatus(n.status)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {n.findings.length} finding(s){n.exposures.some((x) => x.primary) ? ` · ${n.exposures.filter((x) => x.primary).length} priced leak(s)` : ""}
        </div>
      </button>
    );
  };

  return (
    <section aria-labelledby="xray-title" className="rounded-sm border border-amber/30 p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber flex items-center gap-1.5">
            <ScanSearch className="h-3 w-3" /> Business X-Ray
          </div>
          <h3 id="xray-title" className="font-forensic text-xl font-bold">How the business runs, and where it breaks</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {xray.counts.linked_findings} of {xray.counts.total_findings} report findings mapped · {xray.counts.breakdown} confirmed breakdown · {xray.counts.investigate} to investigate
          </p>
          {xray.preliminary && (
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Preliminary map built from a public scan. The steps are a typical customer journey, inferred, not a verified org chart.
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

      {view === "breaks" && xray.ranked.length > 0 && (
        <div className="rounded-sm border border-crimson/30 bg-crimson/5 p-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-crimson mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Strongest breakdowns first
          </div>
          <ol className="space-y-1 text-xs">
            {xray.ranked.slice(0, 3).map((id, i) => {
              const n = xray.nodes.find((x) => x.id === id)!;
              return (
                <li key={id}>
                  <button type="button" className="text-left hover:underline" onClick={() => setPicked(id)}>
                    <span className="font-mono text-crimson">#{i + 1}</span> <span className="font-semibold">{n.label}</span>
                    <span className="text-muted-foreground"> · {shortStatus(n.status)} · {n.findings.length} finding(s) · {n.summary.slice(0, 140)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {followPath && (
        <p className="text-xs text-muted-foreground">
          Tracing a buyer from search to sales. Red handoffs mark where the report shows friction. Every handoff here is inferred from the public scan.
        </p>
      )}

      <div className="space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Customer journey (inferred sequence)</div>
        <ol className="flex flex-col md:flex-row md:items-stretch gap-2">
          {journey.map((n, i) => {
            const next = journey[i + 1] || (followPath ? internal.find((x) => x.id === "follow_up") : undefined);
            const e = next ? edgeBetween(n.id, next.id) : undefined;
            return (
              <React.Fragment key={n.id}>
                <li className="md:flex-1 min-w-0"><NodeButton n={n} /></li>
                {e && <EdgeMark e={e} highlight={followPath || view === "breaks"} />}
              </React.Fragment>
            );
          })}
          {followPath && internal.filter((n) => n.id === "follow_up").map((n) => (
            <li key={n.id} className="md:flex-1 min-w-0"><NodeButton n={n} /></li>
          ))}
        </ol>
        {!followPath && internal.length > 0 && (
          <>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Inside the business</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {internal.map((n) => {
                const e = xray.edges.find((x) => x.to === n.id && x.from !== "owner") || xray.edges.find((x) => x.from === n.id);
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
        <p className="text-xs text-muted-foreground">Select a stage to see its findings, evidence and exposure.</p>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Text version of this map</summary>
        <ul className="mt-2 space-y-1">
          {xray.nodes.filter(visible).map((n) => (
            <li key={n.id}>
              <button type="button" className="underline text-left" onClick={() => setPicked(n.id)}>{n.label}</button>
              {": "}{XRAY_STATUS_LABEL[n.status]}. {n.findings.length} linked finding(s). Evidence confidence {n.evidence_confidence}. {n.summary}
            </li>
          ))}
          {xray.edges.filter((e) => !followPath || e.on_customer_path).map((e) => (
            <li key={`${e.from}-${e.to}`}>{e.label}: {XRAY_EDGE_LABEL[e.basis]}{e.friction ? ", friction present" : ""}.</li>
          ))}
        </ul>
      </details>

      {xray.unmapped.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Unmapped findings · {xray.unmapped.length}</summary>
          <ul className="mt-2 space-y-1">
            {xray.unmapped.map((u) => (
              <li key={u.finding_id}>{u.statement} <span className="text-muted-foreground font-mono">({u.finding_id} · category {u.category || "none"} · slug {u.chapter_slug || "none"})</span></li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[11px] text-muted-foreground">
        Owner confirmations and corrections are not yet saved for public reports, so every relationship above stays preliminary.
      </p>
    </section>
  );
}

export default BusinessXray;
