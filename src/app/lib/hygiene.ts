// Shared hygiene types + helpers used across the Data Hygiene Engine pages.

export type HygieneSeverity = "high" | "medium" | "low";
export type HygieneConfidence = "high" | "medium" | "low";
export type HygieneApprovalMode = "batch" | "individual";
export type HygieneStatus =
  | "pending"
  | "approved"
  | "executing"
  | "executed"
  | "skipped"
  | "cancelled"
  | "failed";

export interface HygieneScanRow {
  id: string;
  account_id: string;
  scan_date: string;
  status: "running" | "complete" | "failed" | "cancelled";
  total_issues: number;
  totals_by_category: Record<string, number>;
  results: Record<string, HygieneCategoryResult>;
  ai_status: "pending" | "running" | "complete" | "failed" | "cancelled";
  error_message: string | null;
  completed_at: string | null;
}

export interface HygieneCategoryResult {
  category: string;
  label: string;
  count: number;
  severity: HygieneSeverity;
  sample_ids: string[];
  affected_record_ids: string[];
  details: Record<string, unknown>;
  fix_kind: HygieneFixKind;
  object_type: "contact" | "deal" | "engagement" | "company";
}

export type HygieneFixKind =
  | "trim_whitespace"
  | "lowercase_email"
  | "title_case_name"
  | "format_phone"
  | "trim_company"
  | "set_owner"
  | "fix_lifecycle"
  | "close_stale_deal"
  | "merge_duplicates"
  | "flag_missing"
  | "delete_orphan_engagement"
  | "manual_review";

export interface HygieneActionRow {
  id: string;
  scan_id: string;
  account_id: string;
  category: string;
  category_label: string;
  confidence: HygieneConfidence;
  severity: HygieneSeverity;
  risk_level: HygieneSeverity;
  approval_mode: HygieneApprovalMode;
  recommended_action: {
    label?: string;
    rationale?: string;
    change_spec?: Record<string, unknown>;
    fix_kind?: HygieneFixKind;
  };
  affected_record_ids: string[];
  affected_count: number;
  status: HygieneStatus;
  progress: { processed?: number; total?: number; message?: string };
  error_message: string | null;
  created_at: string;
  approved_at: string | null;
  executed_at: string | null;
}

export interface HygieneLogRow {
  id: string;
  action_id: string;
  account_id: string;
  hubspot_object_type: string;
  hubspot_object_id: string;
  field_changes: Array<{ field: string; before: unknown; after: unknown }>;
  before_value: Record<string, unknown>;
  after_value: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  rolled_back_at: string | null;
  executed_at: string;
}

export interface HygieneSettingsRow {
  account_id: string;
  require_approval: boolean;
  allow_auto_high_conf: boolean;
  enable_enrichment: boolean;
  max_batch_size: number;
  pause_threshold_pct: number;
}

// ---- Display helpers ----

export const severityClass = (s: HygieneSeverity): string => {
  switch (s) {
    case "high":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "low":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }
};

export const confidenceLabel = (c: HygieneConfidence, kind?: HygieneFixKind): string => {
  if (kind === "flag_missing") return "Requires enrichment";
  if (c === "high") return "Auto-fixable";
  if (c === "medium") return "Needs review";
  return "Manual review";
};

// ---- Sorting ----

export type HygieneQueueView = "priority" | "newest" | "status";

const SEVERITY_WEIGHT: Record<HygieneSeverity, number> = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_WEIGHT: Record<HygieneConfidence, number> = { high: 0, medium: 1, low: 2 };
const STATUS_WEIGHT: Record<HygieneStatus, number> = {
  executing: 0,
  failed: 1,
  pending: 2,
  approved: 2,
  cancelled: 3,
  skipped: 3,
  executed: 4,
};

const priorityCompare = (a: HygieneActionRow, b: HygieneActionRow): number => {
  const sev = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity];
  if (sev !== 0) return sev;
  const conf = CONFIDENCE_WEIGHT[a.confidence] - CONFIDENCE_WEIGHT[b.confidence];
  if (conf !== 0) return conf;
  const count = (b.affected_count || 0) - (a.affected_count || 0);
  if (count !== 0) return count;
  return a.id.localeCompare(b.id);
};

export const sortActions = (
  rows: HygieneActionRow[],
  view: HygieneQueueView,
): HygieneActionRow[] => {
  const copy = [...rows];
  if (view === "newest") {
    copy.sort((a, b) => {
      const t = (b.created_at || "").localeCompare(a.created_at || "");
      return t !== 0 ? t : a.id.localeCompare(b.id);
    });
  } else if (view === "status") {
    copy.sort((a, b) => {
      const s = (STATUS_WEIGHT[a.status] ?? 9) - (STATUS_WEIGHT[b.status] ?? 9);
      return s !== 0 ? s : priorityCompare(a, b);
    });
  } else {
    copy.sort(priorityCompare);
  }
  return copy;
};

export const categoryDisplay: Record<
  string,
  { label: string; description: string }
> = {
  duplicate_contacts: {
    label: "Duplicate Contacts",
    description: "Contacts that appear to be the same person across multiple records.",
  },
  missing_critical_fields: {
    label: "Missing Critical Fields",
    description: "Contacts missing email, phone, company, title, or industry.",
  },
  lifecycle_mismatch: {
    label: "Lifecycle Stage Mismatches",
    description: "Lifecycle stages that don't match deal reality.",
  },
  formatting_inconsistencies: {
    label: "Formatting Inconsistencies",
    description: "Mixed-case names, raw phones, whitespace, capitalization issues.",
  },
  owner_issues: {
    label: "Owner Issues",
    description: "Missing, orphaned, or mismatched record owners.",
  },
  stale_lifecycle: {
    label: "Stale Lifecycle",
    description: "Contacts in active lifecycle stages with no recent activity.",
  },
  deal_data_issues: {
    label: "Deal Data Issues",
    description: "Open deals missing critical data or past their close date.",
  },
  engagement_orphans: {
    label: "Engagement Orphans",
    description: "Engagements not linked to any contact or deal.",
  },
};
