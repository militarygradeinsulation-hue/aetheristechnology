// Business X-Ray: an additive, read-only operational map built from a saved
// Golden Report. It NEVER creates findings, prices, or totals of its own. Every
// node links back to existing compiled findings, evidence-ledger claims and the
// canonical Financial Leak Ledger entries (shown per entry, never summed).
//
// Honesty rules enforced here:
//  • A public website scan only observes the outside of a business, so every
//    relationship between steps is "inferred" unless a saved owner confirmation
//    marks it verified. Internal steps with no evidence are "unknown".
//  • Red = confirmed breakdown (directly observed or contradicted evidence).
//    Amber = needs investigation (inferred or unverified evidence).
//    Green = ONLY a saved correction with both a baseline and a current value.
//    Gray = no findings. No findings is not proof of healthy operation.
//  • Evidence confidence is reported separately from severity and correction.

import { resolveFinancialLedger, type LedgerEntry } from "./goldenLeakage";

export type XrayNodeStatus = "breakdown" | "investigate" | "corrected" | "unknown";
export type XrayEdgeBasis = "verified" | "inferred" | "unknown";
export type XrayNodeKind = "journey" | "internal";

export type XrayEvidence = {
  claim_id: string;
  statement: string;
  status: string;
  confidence: number | null;
  source_url: string | null;
};

export type XrayFinding = {
  finding_id: string;
  statement: string;
  status: string;
  root_cause_id: string | null;
  root_cause_label: string | null;
  evidence: XrayEvidence[];
  /** Canonical ledger entry for this finding's root cause, if priced. */
  exposure: { leak_id: string; label: string; shared_with: number } | null;
};

export type XrayCorrection = {
  node_id: string;
  metric: string;
  baseline: string;
  current: string;
  verified_at: string;
  owner?: string | null;
};

export type XrayNode = {
  id: string;
  label: string;
  kind: XrayNodeKind;
  description: string;
  status: XrayNodeStatus;
  findings: XrayFinding[];
  /** Highest evidence confidence among linked claims (0 to 1), separate from status. */
  evidence_confidence: "high" | "medium" | "low" | "none";
  recommended_action: string | null;
  owner: string | null;
  correction: XrayCorrection | null;
  on_customer_path: boolean;
};

export type XrayEdge = { from: string; to: string; label: string; basis: XrayEdgeBasis; on_customer_path: boolean };

export type BusinessXray = {
  preliminary: boolean;
  legacy_fallback: boolean;
  nodes: XrayNode[];
  edges: XrayEdge[];
  counts: { breakdown: number; investigate: number; corrected: number; unknown: number; linked_findings: number };
  history_available: boolean;
  notes: string[];
};

type StepDef = {
  id: string;
  label: string;
  kind: XrayNodeKind;
  description: string;
  categories: string[];
  chapters: string[];
  on_customer_path: boolean;
};

// Journey steps a website scan can actually observe, plus two internal steps
// that are only ever "unknown" unless the report carries evidence for them.
const STEPS: StepDef[] = [
  { id: "discovery", label: "Discovery", kind: "journey", description: "How a buyer finds the business in search and referrals.", categories: ["seo", "schema"], chapters: ["seo-discoverability", "authority-backlinks"], on_customer_path: true },
  { id: "website", label: "Website visit", kind: "journey", description: "First impression: speed, mobile layout, and page content.", categories: ["performance", "mobile_layout", "content"], chapters: ["site-autopsy", "tech-performance"], on_customer_path: true },
  { id: "trust", label: "Trust and proof", kind: "journey", description: "Proof, consistency, and messaging that make a buyer believe the claim.", categories: ["proof"], chapters: ["brand-contradictions", "friction-vocabulary", "competitive"], on_customer_path: true },
  { id: "inquiry", label: "Inquiry", kind: "journey", description: "Calls to action, contact details, and forms that capture the lead.", categories: ["cta", "contact_info", "lead_capture", "form_behavior"], chapters: ["lead-intelligence"], on_customer_path: true },
  { id: "follow_up", label: "Follow up and sales", kind: "internal", description: "What happens after an inquiry lands. Not visible from a public scan.", categories: ["pipeline", "lead_hygiene"], chapters: ["pipeline-forensics", "lead-hygiene"], on_customer_path: true },
  { id: "owner", label: "Owner and team capacity", kind: "internal", description: "Who carries the work. No people are named unless the report supports it.", categories: ["owner_capacity"], chapters: ["owner-capacity"], on_customer_path: false },
];

const EDGES: Array<Omit<XrayEdge, "basis">> = [
  { from: "discovery", to: "website", label: "Search result to visit", on_customer_path: true },
  { from: "website", to: "trust", label: "Visit to belief", on_customer_path: true },
  { from: "trust", to: "inquiry", label: "Belief to inquiry", on_customer_path: true },
  { from: "inquiry", to: "follow_up", label: "Inquiry handoff to sales", on_customer_path: true },
  { from: "owner", to: "follow_up", label: "Capacity to respond", on_customer_path: false },
];

type AnyRec = Record<string, unknown>;
const arr = (v: unknown): AnyRec[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as AnyRec[]) : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

function confidenceBand(values: number[]): XrayNode["evidence_confidence"] {
  if (!values.length) return "none";
  const max = Math.max(...values);
  return max >= 0.7 ? "high" : max >= 0.4 ? "medium" : "low";
}

function validCorrections(report: AnyRec): XrayCorrection[] {
  return arr(report.xray_corrections)
    .map((c) => ({
      node_id: str(c.node_id) || "",
      metric: str(c.metric) || "",
      baseline: str(c.baseline) || "",
      current: str(c.current) || "",
      verified_at: str(c.verified_at) || "",
      owner: str(c.owner),
    }))
    .filter((c) => c.node_id && c.metric && c.baseline && c.current && c.verified_at);
}

function stepForFinding(f: AnyRec): StepDef | null {
  const cat = String(f.category || "").toLowerCase();
  const ch = String(f.chapter_slug || "").toLowerCase();
  return (
    STEPS.find((s) => s.categories.includes(cat)) ||
    STEPS.find((s) => s.chapters.includes(ch)) ||
    null
  );
}

export function buildBusinessXray(reportIn: unknown): BusinessXray {
  const report = (reportIn && typeof reportIn === "object" ? reportIn : {}) as AnyRec;
  const notes: string[] = [];

  const claims = new Map<string, AnyRec>();
  for (const c of arr(report.evidence_ledger)) if (str(c.claim_id)) claims.set(String(c.claim_id), c);
  const rootCauses = new Map<string, AnyRec>();
  for (const r of arr(report.root_causes)) if (str(r.root_cause_id)) rootCauses.set(String(r.root_cause_id), r);

  let ledgerActive: LedgerEntry[] = [];
  try {
    ledgerActive = resolveFinancialLedger(report as never).active || [];
  } catch {
    notes.push("Financial ledger could not be read, so exposure is omitted.");
  }
  const byRootCause = new Map<string, LedgerEntry>();
  for (const e of ledgerActive) if (e.root_cause_id && !byRootCause.has(e.root_cause_id)) byRootCause.set(e.root_cause_id, e);

  const chapters = arr(report.chapters);
  const actionFor = (step: StepDef): string | null => {
    for (const slug of step.chapters) {
      const ch = chapters.find((c) => String(c.slug || "").toLowerCase() === slug);
      const todo = ch?.what_to_do as AnyRec | undefined;
      const first = [todo?.this_week, todo?.this_month, todo?.this_quarter]
        .flatMap((x) => (Array.isArray(x) ? x : []))
        .map(str)
        .find(Boolean);
      if (first) return first;
    }
    return null;
  };

  const findings = arr(report.compiled_findings);
  const legacy = findings.length === 0;
  if (legacy) notes.push("This report predates structured findings. The map shows journey steps only and every step is unknown.");

  const perStep = new Map<string, XrayFinding[]>();
  const rootCauseSteps = new Map<string, Set<string>>();
  for (const f of findings) {
    const step = stepForFinding(f);
    if (!step) continue;
    const rc = str(f.root_cause_id);
    if (rc) {
      if (!rootCauseSteps.has(rc)) rootCauseSteps.set(rc, new Set());
      rootCauseSteps.get(rc)!.add(step.id);
    }
    const ids = Array.isArray(f.claim_ids) ? (f.claim_ids as unknown[]).map(String) : [];
    const evidence: XrayEvidence[] = ids
      .map((id) => claims.get(id))
      .filter(Boolean)
      .map((c) => ({
        claim_id: String(c!.claim_id),
        statement: str(c!.statement) || str(c!.raw_value) || "Evidence statement not recorded",
        status: str(c!.status) || "unverified",
        confidence: typeof c!.confidence === "number" ? (c!.confidence as number) : null,
        source_url: str(c!.source_url),
      }));
    const list = perStep.get(step.id) || [];
    list.push({
      finding_id: str(f.finding_id) || `finding_${list.length + 1}`,
      statement: str(f.statement) || "Finding",
      status: str(f.status) || "unverified",
      root_cause_id: rc,
      root_cause_label: rc ? str(rootCauses.get(rc)?.label) : null,
      evidence,
      exposure: null,
    });
    perStep.set(step.id, list);
  }

  // Attach exposure per root cause, flagging when the same root cause spans
  // several steps so nobody adds the same dollars twice.
  for (const list of perStep.values()) {
    for (const f of list) {
      const e = f.root_cause_id ? byRootCause.get(f.root_cause_id) : undefined;
      if (e) {
        const lo = Math.round(e.annual_low).toLocaleString("en-US");
        const hi = Math.round(e.annual_high).toLocaleString("en-US");
        f.exposure = { leak_id: e.leak_id, label: `$${lo} to $${hi} per year (${e.title})`, shared_with: rootCauseSteps.get(f.root_cause_id!)?.size ?? 1 };
      }
    }
  }

  const corrections = validCorrections(report);

  const nodes: XrayNode[] = STEPS.map((s) => {
    const fs = perStep.get(s.id) || [];
    const correction = corrections.find((c) => c.node_id === s.id) || null;
    const evStatuses = fs.flatMap((f) => [f.status, ...f.evidence.map((e) => e.status)]);
    let status: XrayNodeStatus = "unknown";
    if (fs.length) status = evStatuses.some((x) => x === "verified" || x === "contradicted") ? "breakdown" : "investigate";
    if (correction) status = "corrected";
    return {
      id: s.id,
      label: s.label,
      kind: s.kind,
      description: s.description,
      status,
      findings: fs,
      evidence_confidence: confidenceBand(fs.flatMap((f) => f.evidence.map((e) => e.confidence)).filter((x): x is number => x != null)),
      recommended_action: fs.length ? actionFor(s) : null,
      owner: correction?.owner ?? null,
      correction,
      on_customer_path: s.on_customer_path,
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: XrayEdge[] = EDGES.map((e) => {
    const a = nodeById.get(e.from)!;
    const b = nodeById.get(e.to)!;
    const internal = a.kind === "internal" || b.kind === "internal";
    const confirmed = !!(a.correction && b.correction);
    const basis: XrayEdgeBasis = confirmed ? "verified" : internal && !a.findings.length && !b.findings.length ? "unknown" : internal ? "unknown" : "inferred";
    return { ...e, basis };
  });

  const count = (s: XrayNodeStatus) => nodes.filter((n) => n.status === s).length;
  return {
    preliminary: corrections.length === 0,
    legacy_fallback: legacy,
    nodes,
    edges,
    counts: {
      breakdown: count("breakdown"),
      investigate: count("investigate"),
      corrected: count("corrected"),
      unknown: count("unknown"),
      linked_findings: nodes.reduce((n, x) => n + x.findings.length, 0),
    },
    history_available: corrections.length > 0,
    notes,
  };
}

export const XRAY_STATUS_LABEL: Record<XrayNodeStatus, string> = {
  breakdown: "Confirmed breakdown",
  investigate: "Needs investigation",
  corrected: "Verified corrected",
  unknown: "Unknown. No findings is not proof of health",
};

export const XRAY_EDGE_LABEL: Record<XrayEdgeBasis, string> = {
  verified: "Verified relationship",
  inferred: "Inferred relationship",
  unknown: "Unknown relationship",
};

/** Plain text lines for PDF and accessible summaries. */
export function xraySummaryLines(x: BusinessXray): string[] {
  const lines = x.nodes.map(
    (n) => `${n.label}: ${XRAY_STATUS_LABEL[n.status]} · ${n.findings.length} linked finding(s) · evidence confidence ${n.evidence_confidence}`,
  );
  return lines;
}
