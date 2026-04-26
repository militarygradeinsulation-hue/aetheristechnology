// Data Hygiene Engine — Detection + AI categorization pipeline.
// Scans the user's mirror_* tables for 8 categories of data quality issues,
// then calls Lovable AI to categorize each finding (confidence + recommended action).
// Returns the scan_id immediately and runs the rest in the background.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Severity = "high" | "medium" | "low";
type FixKind =
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

interface CategoryResult {
  category: string;
  label: string;
  count: number;
  severity: Severity;
  sample_ids: string[];
  affected_record_ids: string[];
  details: Record<string, unknown>;
  fix_kind: FixKind;
  object_type: "contact" | "deal" | "engagement" | "company";
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { account_id } = await req.json();
    if (!account_id) return json({ error: "account_id required" }, 400);

    const { data: acct } = await supabase
      .from("accounts")
      .select("id,user_id")
      .eq("id", account_id)
      .maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const { data: scan, error: scanErr } = await supabase
      .from("hygiene_scans")
      .insert({ account_id, status: "running", ai_status: "pending" })
      .select()
      .single();
    if (scanErr || !scan) throw scanErr;

    EdgeRuntime.waitUntil(runScan(supabase, account_id, scan.id));

    return json({ scan_id: scan.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("[hygiene-scan] error", err);
    return json({ error: message }, 500);
  }
});

async function runScan(supabase: any, accountId: string, scanId: string) {
  try {
    // Load sequentially with narrow column projections — these tables can hold
    // hundreds of thousands of rows and `select("*")` blows the edge function
    // memory limit (~150MB). Order from smallest to largest so we fail fast.
    const owners = await loadAll(
      supabase, "mirror_owners", accountId,
      "hubspot_id",
    );
    const deals = await loadAll(
      supabase, "mirror_deals", accountId,
      "hubspot_id, stage, amount, close_date, owner_id",
    );
    const dealContacts = await loadAll(
      supabase, "mirror_deal_contacts", accountId,
      "contact_id, deal_id",
    );
    const engagements = await loadAll(
      supabase, "mirror_engagements", accountId,
      "hubspot_id, contact_id, deal_id",
    );
    const companies = await loadAll(
      supabase, "mirror_companies", accountId,
      "hubspot_id, name",
    );
    const contacts = await loadAll(
      supabase, "mirror_contacts", accountId,
      "hubspot_id, email, first_name, last_name, lifecycle_stage, last_activity_date, properties",
    );

    const results: CategoryResult[] = [
      detectDuplicateContacts(contacts),
      detectMissingFields(contacts),
      detectLifecycleMismatch(contacts, deals, dealContacts),
      detectFormattingIssues(contacts, companies),
      detectOwnerIssues(contacts, deals, owners),
      detectStaleLifecycle(contacts),
      detectDealIssues(deals),
      detectEngagementOrphans(engagements),
    ];

    const totals_by_category: Record<string, number> = {};
    const resultsMap: Record<string, CategoryResult> = {};
    let total_issues = 0;
    for (const r of results) {
      totals_by_category[r.category] = r.count;
      resultsMap[r.category] = r;
      total_issues += r.count;
    }

    await supabase
      .from("hygiene_scans")
      .update({
        total_issues,
        totals_by_category,
        results: resultsMap,
        ai_status: "running",
      })
      .eq("id", scanId);

    // AI categorization stage — one row per category
    const actions = await Promise.all(
      results.filter((r) => r.count > 0).map((r) => buildAction(scanId, accountId, r)),
    );
    if (actions.length) {
      await supabase.from("hygiene_actions").insert(actions);
    }

    await supabase
      .from("hygiene_scans")
      .update({
        status: "complete",
        ai_status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hygiene-scan] pipeline failed", err);
    await supabase
      .from("hygiene_scans")
      .update({
        status: "failed",
        ai_status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  }
}

async function loadAll(
  supabase: any,
  table: string,
  accountId: string,
  columns = "*",
): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  // Whitelist of properties keys actually used by detectors — drop the rest
  // so the contacts payload doesn't carry tens of unused jsonb fields per row.
  const KEEP_PROPS = ["phone", "company", "jobtitle", "industry", "hubspot_owner_id"];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("account_id", accountId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    if (table === "mirror_contacts") {
      for (const row of data) {
        if (row.properties && typeof row.properties === "object") {
          const trimmed: Record<string, unknown> = {};
          for (const k of KEEP_PROPS) {
            if (row.properties[k] !== undefined) trimmed[k] = row.properties[k];
          }
          row.properties = trimmed;
        }
        all.push(row);
      }
    } else {
      all.push(...data);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

// ============================================================
// Detection routines
// ============================================================

const normalizePhone = (p?: string | null) =>
  (p || "").replace(/\D/g, "").replace(/^1(\d{10})$/, "$1");
const normalizeEmail = (e?: string | null) => (e || "").trim().toLowerCase();

function detectDuplicateContacts(contacts: any[]): CategoryResult {
  const byEmail: Record<string, string[]> = {};
  const byPhone: Record<string, string[]> = {};
  for (const c of contacts) {
    const email = normalizeEmail(c.email);
    const phone = normalizePhone(c.properties?.phone);
    if (email) (byEmail[email] ||= []).push(c.hubspot_id);
    if (phone && phone.length >= 7) (byPhone[phone] ||= []).push(c.hubspot_id);
  }
  const groups: string[][] = [];
  for (const list of Object.values(byEmail)) if (list.length > 1) groups.push(list);
  for (const list of Object.values(byPhone)) if (list.length > 1) groups.push(list);

  const affected = Array.from(new Set(groups.flat()));
  return {
    category: "duplicate_contacts",
    label: "Duplicate Contacts",
    count: affected.length,
    severity: affected.length > 50 ? "high" : affected.length > 0 ? "medium" : "low",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { group_count: groups.length, groups: groups.slice(0, 20) },
    fix_kind: "merge_duplicates",
    object_type: "contact",
  };
}

function detectMissingFields(contacts: any[]): CategoryResult {
  const buckets: Record<string, string[]> = {};
  const affected: string[] = [];
  for (const c of contacts) {
    const missing: string[] = [];
    if (!c.email) missing.push("email");
    if (!c.properties?.phone) missing.push("phone");
    if (!c.properties?.company) missing.push("company");
    if (!c.properties?.jobtitle) missing.push("job_title");
    if (!c.properties?.industry) missing.push("industry");
    if (missing.length === 0) continue;
    const sig = missing.join("+");
    (buckets[sig] ||= []).push(c.hubspot_id);
    affected.push(c.hubspot_id);
  }
  return {
    category: "missing_critical_fields",
    label: "Missing Critical Fields",
    count: affected.length,
    severity: affected.length > 100 ? "high" : "medium",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])) },
    fix_kind: "flag_missing",
    object_type: "contact",
  };
}

function detectLifecycleMismatch(contacts: any[], deals: any[], dealContacts: any[]): CategoryResult {
  const contactDeals: Record<string, any[]> = {};
  for (const link of dealContacts) {
    (contactDeals[link.contact_id] ||= []).push(link.deal_id);
  }
  const dealById: Record<string, any> = {};
  for (const d of deals) dealById[d.hubspot_id] = d;

  const affected: string[] = [];
  const reasons: Record<string, number> = {};
  for (const c of contacts) {
    const stage = c.lifecycle_stage;
    const linkedDeals = (contactDeals[c.hubspot_id] || []).map((id) => dealById[id]).filter(Boolean);
    const hasClosedWon = linkedDeals.some((d) => d?.stage === "closedwon" || d?.stage === "closed_won");
    const hasOpenDeal = linkedDeals.some((d) => d?.stage && !String(d.stage).startsWith("closed"));

    if ((stage === "lead" || stage === "marketingqualifiedlead") && hasClosedWon) {
      affected.push(c.hubspot_id);
      reasons.lead_with_closed_won = (reasons.lead_with_closed_won || 0) + 1;
    } else if (stage === "customer" && !hasClosedWon) {
      affected.push(c.hubspot_id);
      reasons.customer_no_closed = (reasons.customer_no_closed || 0) + 1;
    } else if (stage === "opportunity" && !hasOpenDeal) {
      affected.push(c.hubspot_id);
      reasons.opportunity_no_open = (reasons.opportunity_no_open || 0) + 1;
    }
  }
  return {
    category: "lifecycle_mismatch",
    label: "Lifecycle Stage Mismatches",
    count: affected.length,
    severity: affected.length > 25 ? "high" : "medium",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { reasons },
    fix_kind: "fix_lifecycle",
    object_type: "contact",
  };
}

function detectFormattingIssues(contacts: any[], companies: any[]): CategoryResult {
  const affected: string[] = [];
  const issues: Record<string, number> = {};
  for (const c of contacts) {
    let bad = false;
    const fn = c.first_name || "";
    const ln = c.last_name || "";
    if (fn && (fn === fn.toLowerCase() || fn === fn.toUpperCase())) {
      issues.name_case = (issues.name_case || 0) + 1;
      bad = true;
    } else if (ln && (ln === ln.toLowerCase() || ln === ln.toUpperCase())) {
      issues.name_case = (issues.name_case || 0) + 1;
      bad = true;
    }
    const email = c.email || "";
    if (email && (email !== email.trim() || email !== email.toLowerCase())) {
      issues.email_format = (issues.email_format || 0) + 1;
      bad = true;
    }
    const phone = c.properties?.phone || "";
    if (phone && /[^\d\s+()\-.]/.test(phone)) {
      issues.phone_format = (issues.phone_format || 0) + 1;
      bad = true;
    }
    if (bad) affected.push(c.hubspot_id);
  }
  for (const co of companies) {
    const name = co.name || "";
    if (name && (name !== name.trim() || name === name.toLowerCase() || name === name.toUpperCase())) {
      issues.company_case = (issues.company_case || 0) + 1;
      affected.push(co.hubspot_id);
    }
  }
  return {
    category: "formatting_inconsistencies",
    label: "Formatting Inconsistencies",
    count: affected.length,
    severity: affected.length > 100 ? "medium" : "low",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { issues },
    fix_kind: "trim_whitespace",
    object_type: "contact",
  };
}

function detectOwnerIssues(contacts: any[], deals: any[], owners: any[]): CategoryResult {
  const ownerIds = new Set(owners.map((o) => String(o.hubspot_id)));
  const affected: string[] = [];
  const reasons: Record<string, number> = {};
  for (const c of contacts) {
    const oid = c.properties?.hubspot_owner_id;
    if (!oid) {
      affected.push(c.hubspot_id);
      reasons.no_owner = (reasons.no_owner || 0) + 1;
    } else if (!ownerIds.has(String(oid))) {
      affected.push(c.hubspot_id);
      reasons.orphan_owner = (reasons.orphan_owner || 0) + 1;
    }
  }
  for (const d of deals) {
    if (!d.owner_id) {
      affected.push(d.hubspot_id);
      reasons.deal_no_owner = (reasons.deal_no_owner || 0) + 1;
    }
  }
  return {
    category: "owner_issues",
    label: "Owner Issues",
    count: affected.length,
    severity: affected.length > 25 ? "high" : "medium",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { reasons },
    fix_kind: "set_owner",
    object_type: "contact",
  };
}

function detectStaleLifecycle(contacts: any[]): CategoryResult {
  const cutoff = Date.now() - 90 * 86400000;
  const affected: string[] = [];
  for (const c of contacts) {
    if (!["marketingqualifiedlead", "salesqualifiedlead", "opportunity"].includes(c.lifecycle_stage)) continue;
    const lastAct = c.last_activity_date ? new Date(c.last_activity_date).getTime() : 0;
    if (lastAct < cutoff) affected.push(c.hubspot_id);
  }
  return {
    category: "stale_lifecycle",
    label: "Stale Lifecycle",
    count: affected.length,
    severity: affected.length > 50 ? "medium" : "low",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { cutoff_days: 90 },
    fix_kind: "fix_lifecycle",
    object_type: "contact",
  };
}

function detectDealIssues(deals: any[]): CategoryResult {
  const now = Date.now();
  const affected: string[] = [];
  const reasons: Record<string, number> = {};
  for (const d of deals) {
    const closed = d.stage && String(d.stage).startsWith("closed");
    if (!closed) {
      if (!d.amount) {
        affected.push(d.hubspot_id);
        reasons.no_amount = (reasons.no_amount || 0) + 1;
      } else if (!d.close_date) {
        affected.push(d.hubspot_id);
        reasons.no_close_date = (reasons.no_close_date || 0) + 1;
      } else if (!d.owner_id) {
        affected.push(d.hubspot_id);
        reasons.no_owner = (reasons.no_owner || 0) + 1;
      } else if (new Date(d.close_date).getTime() < now) {
        affected.push(d.hubspot_id);
        reasons.past_close_date = (reasons.past_close_date || 0) + 1;
      }
    }
  }
  return {
    category: "deal_data_issues",
    label: "Deal Data Issues",
    count: affected.length,
    severity: affected.length > 25 ? "high" : "medium",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: { reasons },
    fix_kind: "close_stale_deal",
    object_type: "deal",
  };
}

function detectEngagementOrphans(engagements: any[]): CategoryResult {
  const affected = engagements
    .filter((e) => !e.contact_id && !e.deal_id)
    .map((e) => e.hubspot_id);
  return {
    category: "engagement_orphans",
    label: "Engagement Orphans",
    count: affected.length,
    severity: "low",
    sample_ids: affected.slice(0, 10),
    affected_record_ids: affected,
    details: {},
    fix_kind: "delete_orphan_engagement",
    object_type: "engagement",
  };
}

// ============================================================
// AI categorization (Lovable AI Gateway)
// ============================================================

const HAS_AI_KEY = !!Deno.env.get("LOVABLE_API_KEY");

async function callAI(model: string, messages: any[]): Promise<string | null> {
  if (!HAS_AI_KEY) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });
    if (!res.ok) {
      console.error("[hygiene-scan] AI call failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[hygiene-scan] AI call exception", err);
    return null;
  }
}

interface AiVerdict {
  confidence: "high" | "medium" | "low";
  approval_mode: "batch" | "individual";
  risk_level: "high" | "medium" | "low";
  label: string;
  rationale: string;
}

function defaultVerdict(r: CategoryResult): AiVerdict {
  // Deterministic fallback by fix kind
  const map: Record<FixKind, AiVerdict> = {
    trim_whitespace: { confidence: "high", approval_mode: "batch", risk_level: "low", label: "Standardize formatting", rationale: "Whitespace and capitalization fixes are safe to batch-apply." },
    lowercase_email: { confidence: "high", approval_mode: "batch", risk_level: "low", label: "Normalize emails", rationale: "Email lowercase normalization is reversible and low risk." },
    title_case_name: { confidence: "high", approval_mode: "batch", risk_level: "low", label: "Title-case names", rationale: "Title casing improves readability without data loss." },
    format_phone: { confidence: "high", approval_mode: "batch", risk_level: "low", label: "Normalize phone format", rationale: "E.164 formatting is deterministic." },
    trim_company: { confidence: "high", approval_mode: "batch", risk_level: "low", label: "Clean company names", rationale: "Trimming whitespace is safe." },
    set_owner: { confidence: "low", approval_mode: "individual", risk_level: "high", label: "Reassign owners", rationale: "Owner changes affect commission and routing — review individually." },
    fix_lifecycle: { confidence: "medium", approval_mode: "individual", risk_level: "medium", label: "Correct lifecycle stage", rationale: "Lifecycle changes ripple to reporting; review each." },
    close_stale_deal: { confidence: "medium", approval_mode: "individual", risk_level: "medium", label: "Resolve deal data gaps", rationale: "Each deal needs human judgment on amount/date." },
    merge_duplicates: { confidence: "low", approval_mode: "individual", risk_level: "high", label: "Merge duplicate contacts", rationale: "Merges are irreversible and require choosing a master record." },
    flag_missing: { confidence: "low", approval_mode: "individual", risk_level: "low", label: "Enrich missing fields", rationale: "Requires external enrichment; export for manual handling." },
    delete_orphan_engagement: { confidence: "medium", approval_mode: "batch", risk_level: "medium", label: "Remove orphan engagements", rationale: "Deletes require explicit confirmation in Phase 1." },
    manual_review: { confidence: "low", approval_mode: "individual", risk_level: "medium", label: "Manual review", rationale: "Cannot be safely automated." },
  };
  return map[r.fix_kind];
}

async function buildAction(scanId: string, accountId: string, r: CategoryResult) {
  let verdict = defaultVerdict(r);

  // AI refinement (best-effort, falls back to defaults)
  const aiResp = await callAI("google/gemini-2.5-flash", [
    {
      role: "system",
      content:
        "You are a CRM data quality expert. Given a detected issue category, return ONLY valid JSON of shape {\"confidence\":\"high|medium|low\",\"approval_mode\":\"batch|individual\",\"risk_level\":\"high|medium|low\",\"label\":\"<5-word action>\",\"rationale\":\"<1 sentence>\"}. High confidence + batch only when fixes are deterministic (whitespace, casing, formatting). Owner reassignment, merges, and lifecycle changes need individual review.",
    },
    {
      role: "user",
      content: `Category: ${r.label}\nFix kind: ${r.fix_kind}\nAffected records: ${r.count}\nSeverity: ${r.severity}\nDetails: ${JSON.stringify(r.details).slice(0, 1500)}`,
    },
  ]);
  if (aiResp) {
    try {
      const cleaned = aiResp.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.confidence && parsed.approval_mode && parsed.risk_level) {
        verdict = { ...verdict, ...parsed };
      }
    } catch {
      // keep default verdict
    }
  }

  return {
    scan_id: scanId,
    account_id: accountId,
    category: r.category,
    category_label: r.label,
    confidence: verdict.confidence,
    severity: r.severity,
    risk_level: verdict.risk_level,
    approval_mode: verdict.approval_mode,
    recommended_action: {
      label: verdict.label,
      rationale: verdict.rationale,
      fix_kind: r.fix_kind,
      object_type: r.object_type,
    },
    affected_record_ids: r.affected_record_ids.slice(0, 5000),
    affected_count: r.count,
    status: "pending",
  };
}
