// Operator Assistant — chat endpoint with tool calling.
// Loads conversation history, exposes a curated set of read/write tools to
// Gemini 2.5 Pro, executes read tools server-side, and returns write tools
// as `proposed_action` payloads for the frontend to confirm before execution.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "google/gemini-2.5-pro";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const WRITE_SCOPES = [
  "crm.objects.contacts.write",
  "crm.objects.deals.write",
  "crm.objects.companies.write",
];

// ------------------------------------------------------------------
// Tool definitions (sent to the model)
// ------------------------------------------------------------------
const READ_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_pipeline",
      description: "Get a summary of deals in the pipeline. Filter by stage, owner, minimum amount, or stalled status.",
      parameters: {
        type: "object",
        properties: {
          stage: { type: "string", description: "Optional HubSpot deal stage filter (e.g. 'proposal_sent', 'closed_won')" },
          owner_id: { type: "string", description: "Optional owner HubSpot ID to filter by" },
          min_amount: { type: "number", description: "Minimum deal amount in dollars" },
          stalled_days: { type: "number", description: "Only include deals with no activity in N days" },
          limit: { type: "number", description: "Max deals to return (default 25, max 200)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_contacts",
      description: "Search mirrored contacts by name, email, lifecycle stage, or last-activity recency.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Substring match on name or email" },
          lifecycle_stage: { type: "string" },
          inactive_days: { type: "number", description: "Only contacts with no activity in N days" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_companies",
      description: "Search mirrored companies by name or domain.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_record_detail",
      description: "Get full details of one HubSpot record (contact, deal, or company) including recent engagements.",
      parameters: {
        type: "object",
        required: ["type", "hubspot_id"],
        properties: {
          type: { type: "string", enum: ["contact", "deal", "company"] },
          hubspot_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_leak_detector",
      description: "Run one of the built-in leak detectors against the mirrored CRM and return count + dollar exposure.",
      parameters: {
        type: "object",
        required: ["detector"],
        properties: {
          detector: {
            type: "string",
            enum: [
              "stalled_deals",
              "stuck_proposal",
              "closed_lost_reactivation",
              "dead_leads",
              "slow_followup",
              "missing_contact_info",
              "high_intent_no_workflow",
              "owner_overload",
            ],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_hygiene_queue",
      description: "List items in the data Hygiene Queue. Filter by status.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "approved", "executing", "completed", "failed", "rejected"] },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_audit",
      description: "Summarize the most recent (or specified) Leak Audit run.",
      parameters: { type: "object", properties: { audit_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "list_audits",
      description: "List recent Leak Audit runs (id, created_at, totals, archived flag).",
      parameters: {
        type: "object",
        properties: {
          include_archived: { type: "boolean" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_owners",
      description: "List or search HubSpot owners (sales reps) mirrored locally. Useful for translating an owner name to an owner_id before reassigning deals.",
      parameters: {
        type: "object",
        properties: { search: { type: "string" }, limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_engagements",
      description: "Search recent engagements (calls, emails, meetings, notes, tasks) for a contact, deal, or by type.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          deal_id: { type: "string" },
          type: { type: "string", description: "e.g. EMAIL, CALL, MEETING, NOTE, TASK" },
          since_days: { type: "number" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "count_records",
      description: "Quickly count rows in a mirrored table (contacts, deals, companies, engagements) with optional filters.",
      parameters: {
        type: "object",
        required: ["entity"],
        properties: {
          entity: { type: "string", enum: ["contacts", "deals", "companies", "engagements", "owners"] },
          stage: { type: "string" },
          owner_id: { type: "string" },
          lifecycle_stage: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_assistant_actions",
      description: "List recent Co-Pilot actions executed in this account (for review or undo).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "executing", "success", "partial", "error", "undone"] },
          limit: { type: "number" },
        },
      },
    },
  },
];

const APP_ACTION_TOOLS = [
  {
    type: "function",
    function: {
      name: "trigger_sync",
      description: "Start a HubSpot sync. Modes: 'incremental' (delta), 'initial' (full re-pull), 'resume' (continue interrupted sync). Requires user confirm.",
      parameters: {
        type: "object",
        required: ["mode"],
        properties: { mode: { type: "string", enum: ["incremental", "initial", "resume"] } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_hygiene_scan",
      description: "Run a fresh data hygiene scan. Requires user confirm.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "trigger_leak_audit",
      description: "Run a fresh full Leak Audit. Requires user confirm.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_hygiene_action",
      description: "Approve a pending hygiene queue action so it can be executed. Pass the action_id from list_hygiene_queue.",
      parameters: { type: "object", required: ["action_id"], properties: { action_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "reject_hygiene_action",
      description: "Reject (dismiss) a pending hygiene queue action. Pass the action_id.",
      parameters: { type: "object", required: ["action_id"], properties: { action_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_hygiene_action",
      description: "Approve AND immediately run a hygiene queue action against HubSpot. Use this when the user says 'fix it' or 'run the fix'.",
      parameters: { type: "object", required: ["action_id"], properties: { action_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_assistant_action",
      description: "Undo a previous Co-Pilot action by id (rolls back the HubSpot write using its before_state).",
      parameters: { type: "object", required: ["action_id"], properties: { action_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "archive_audit",
      description: "Move a Leak Audit to the trash bin (soft-delete). Pass the audit id.",
      parameters: { type: "object", required: ["audit_id"], properties: { audit_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "restore_audit",
      description: "Restore an archived Leak Audit from the trash bin.",
      parameters: { type: "object", required: ["audit_id"], properties: { audit_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_audit_permanently",
      description: "Permanently delete an archived Leak Audit. Cannot be undone.",
      parameters: { type: "object", required: ["audit_id"], properties: { audit_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "disconnect_hubspot",
      description: "Disconnect HubSpot from this account. The user will need to re-authorize to sync or write again. Requires confirm.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const WRITE_TOOLS = [
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Update one HubSpot contact's properties. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["hubspot_id", "properties"],
        properties: {
          hubspot_id: { type: "string" },
          properties: { type: "object", description: "HubSpot contact properties to set, e.g. {email, firstname, lifecyclestage}" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_deal",
      description: "Update one HubSpot deal's properties (incl. dealstage, amount, hubspot_owner_id). Requires user confirm.",
      parameters: {
        type: "object",
        required: ["hubspot_id", "properties"],
        properties: {
          hubspot_id: { type: "string" },
          properties: { type: "object" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_company",
      description: "Update one HubSpot company's properties. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["hubspot_id", "properties"],
        properties: {
          hubspot_id: { type: "string" },
          properties: { type: "object" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_deals",
      description: "Update properties on many deals matching a filter. ALWAYS preview the affected count before confirming. Capped at 500.",
      parameters: {
        type: "object",
        required: ["filter", "properties"],
        properties: {
          filter: {
            type: "object",
            description: "Filter object: { stage?, owner_id?, min_amount?, stalled_days?, max_amount? }",
          },
          properties: { type: "object", description: "Properties to apply to every matching deal" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reassign_deals",
      description: "Reassign all open deals from one owner to another. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["from_owner_id", "to_owner_id"],
        properties: {
          from_owner_id: { type: "string" },
          to_owner_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new HubSpot contact. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["properties"],
        properties: {
          properties: { type: "object", description: "HubSpot contact properties (email is recommended)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_deal",
      description: "Create a new HubSpot deal. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["properties"],
        properties: {
          properties: { type: "object", description: "HubSpot deal properties (dealname, amount, dealstage, pipeline, hubspot_owner_id...)." },
          associate_contact_id: { type: "string", description: "Optional contact hubspot_id to associate." },
          associate_company_id: { type: "string", description: "Optional company hubspot_id to associate." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_company",
      description: "Create a new HubSpot company. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["properties"],
        properties: { properties: { type: "object", description: "HubSpot company properties (name, domain...)." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_contact",
      description: "Archive (delete) a HubSpot contact. Requires user confirm.",
      parameters: { type: "object", required: ["hubspot_id"], properties: { hubspot_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_deal",
      description: "Archive (delete) a HubSpot deal. Requires user confirm.",
      parameters: { type: "object", required: ["hubspot_id"], properties: { hubspot_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_company",
      description: "Archive (delete) a HubSpot company. Requires user confirm.",
      parameters: { type: "object", required: ["hubspot_id"], properties: { hubspot_id: { type: "string" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_contacts",
      description: "Update properties on many contacts matching a filter. Capped at 500.",
      parameters: {
        type: "object",
        required: ["filter", "properties"],
        properties: {
          filter: { type: "object", description: "{ lifecycle_stage?, owner_id?, inactive_days?, search? }" },
          properties: { type: "object" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update_companies",
      description: "Update properties on many companies matching a filter. Capped at 500.",
      parameters: {
        type: "object",
        required: ["filter", "properties"],
        properties: {
          filter: { type: "object", description: "{ industry?, owner_id?, inactive_days?, search?, min_employees?, max_employees? }" },
          properties: { type: "object" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_delete_deals",
      description: "Archive many HubSpot deals matching a filter. Capped at 500. Requires user confirm.",
      parameters: {
        type: "object",
        required: ["filter"],
        properties: {
          filter: { type: "object", description: "{ stage?, owner_id?, min_amount?, max_amount?, stalled_days? }" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_note_to_record",
      description: "Add a note engagement to a HubSpot contact, deal, or company.",
      parameters: {
        type: "object",
        required: ["type", "hubspot_id", "body"],
        properties: {
          type: { type: "string", enum: ["contact", "deal", "company"] },
          hubspot_id: { type: "string" },
          body: { type: "string", description: "Plain-text or simple-HTML note body." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task_for_record",
      description: "Create a HubSpot task associated to a contact, deal, or company.",
      parameters: {
        type: "object",
        required: ["type", "hubspot_id", "subject"],
        properties: {
          type: { type: "string", enum: ["contact", "deal", "company"] },
          hubspot_id: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
          due_in_days: { type: "number", description: "Due date offset from today (default 1)." },
          owner_id: { type: "string", description: "Optional HubSpot owner id." },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "associate_records",
      description: "Create an association between two HubSpot records (e.g. attach contact to deal).",
      parameters: {
        type: "object",
        required: ["from_type", "from_id", "to_type", "to_id"],
        properties: {
          from_type: { type: "string", enum: ["contact", "deal", "company"] },
          from_id: { type: "string" },
          to_type: { type: "string", enum: ["contact", "deal", "company"] },
          to_id: { type: "string" },
        },
      },
    },
  },
];

const TOOL_NAMES = {
  read: READ_TOOLS.map((t) => t.function.name),
  app: APP_ACTION_TOOLS.map((t) => t.function.name),
  write: WRITE_TOOLS.map((t) => t.function.name),
};

// ------------------------------------------------------------------
// Tool execution (READ tools only — writes/app-actions return as proposals)
// ------------------------------------------------------------------
async function executeReadTool(
  admin: SupabaseClient,
  accountId: string,
  name: string,
  args: any,
): Promise<unknown> {
  const a = args || {};
  switch (name) {
    case "query_pipeline": {
      let q = admin.from("mirror_deals").select("hubspot_id,deal_name,stage,amount,close_date,owner_id,last_activity_date").eq("account_id", accountId);
      if (a.stage) q = q.eq("stage", a.stage);
      if (a.owner_id) q = q.eq("owner_id", a.owner_id);
      if (typeof a.min_amount === "number") q = q.gte("amount", a.min_amount);
      if (typeof a.stalled_days === "number") {
        const cutoff = new Date(Date.now() - a.stalled_days * 86400_000).toISOString();
        q = q.lt("last_activity_date", cutoff);
      }
      q = q.limit(Math.min(Number(a.limit) || 25, 200));
      const { data, error } = await q;
      if (error) return { error: error.message };
      const total = (data || []).reduce((s, d: any) => s + (Number(d.amount) || 0), 0);
      const byStage: Record<string, { count: number; total: number }> = {};
      for (const d of data || []) {
        const k = (d as any).stage || "unknown";
        byStage[k] = byStage[k] || { count: 0, total: 0 };
        byStage[k].count++;
        byStage[k].total += Number((d as any).amount) || 0;
      }
      return { count: data?.length || 0, total_amount: total, by_stage: byStage, deals: data };
    }
    case "query_contacts": {
      let q = admin.from("mirror_contacts").select("hubspot_id,first_name,last_name,email,lifecycle_stage,last_activity_date").eq("account_id", accountId);
      if (a.search) q = q.or(`first_name.ilike.%${a.search}%,last_name.ilike.%${a.search}%,email.ilike.%${a.search}%`);
      if (a.lifecycle_stage) q = q.eq("lifecycle_stage", a.lifecycle_stage);
      if (typeof a.inactive_days === "number") {
        const cutoff = new Date(Date.now() - a.inactive_days * 86400_000).toISOString();
        q = q.lt("last_activity_date", cutoff);
      }
      q = q.limit(Math.min(Number(a.limit) || 25, 200));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, contacts: data };
    }
    case "query_companies": {
      let q = admin.from("mirror_companies").select("hubspot_id,name,domain,industry,num_employees").eq("account_id", accountId);
      if (a.search) q = q.or(`name.ilike.%${a.search}%,domain.ilike.%${a.search}%`);
      q = q.limit(Math.min(Number(a.limit) || 25, 200));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, companies: data };
    }
    case "get_record_detail": {
      const t = a.type as string;
      const id = String(a.hubspot_id);
      const table = t === "deal" ? "mirror_deals" : t === "company" ? "mirror_companies" : "mirror_contacts";
      const { data: rec } = await admin.from(table).select("*").eq("account_id", accountId).eq("hubspot_id", id).maybeSingle();
      if (!rec) return { error: `No ${t} with hubspot_id ${id}` };
      const engCol = t === "deal" ? "deal_id" : t === "company" ? "company_id" : "contact_id";
      const { data: engs } = await admin
        .from("mirror_engagements")
        .select("type,subject,body,timestamp")
        .eq("account_id", accountId)
        .eq(engCol, id)
        .order("timestamp", { ascending: false })
        .limit(10);
      return { record: rec, recent_engagements: engs || [] };
    }
    case "run_leak_detector": {
      const map: Record<string, string> = {
        stalled_deals: "detect_stalled_deals",
        stuck_proposal: "detect_stuck_proposal",
        closed_lost_reactivation: "detect_closed_lost_reactivation",
        dead_leads: "detect_dead_leads",
        slow_followup: "detect_slow_followup",
        missing_contact_info: "detect_missing_contact_info",
        high_intent_no_workflow: "detect_high_intent_no_workflow",
        owner_overload: "detect_owner_overload",
      };
      const fn = map[a.detector];
      if (!fn) return { error: `Unknown detector ${a.detector}` };
      const { data, error } = await admin.rpc(fn, { _account_id: accountId });
      return error ? { error: error.message } : data;
    }
    case "list_hygiene_queue": {
      let q = admin
        .from("hygiene_actions")
        .select("id,category,category_label,severity,risk_level,confidence,status,affected_count,recommended_action,created_at")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });
      if (a.status) q = q.eq("status", a.status);
      q = q.limit(Math.min(Number(a.limit) || 25, 100));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, items: data };
    }
    case "summarize_audit": {
      let q = admin.from("audit_runs").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1);
      if (a.audit_id) q = admin.from("audit_runs").select("*").eq("account_id", accountId).eq("id", a.audit_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return data?.[0] || { error: "No audits found" };
    }
    case "list_audits": {
      let q = admin.from("audit_runs").select("id,created_at,total_exposure_cents,findings_count,status,deleted_at").eq("account_id", accountId).order("created_at", { ascending: false });
      if (!a.include_archived) q = q.is("deleted_at", null);
      q = q.limit(Math.min(Number(a.limit) || 25, 100));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, audits: data };
    }
    case "query_owners": {
      let q = admin.from("mirror_owners").select("hubspot_id,first_name,last_name,email").eq("account_id", accountId);
      if (a.search) q = q.or(`first_name.ilike.%${a.search}%,last_name.ilike.%${a.search}%,email.ilike.%${a.search}%`);
      q = q.limit(Math.min(Number(a.limit) || 50, 200));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, owners: data };
    }
    case "query_engagements": {
      let q = admin.from("mirror_engagements").select("hubspot_id,type,timestamp,contact_id,deal_id,properties").eq("account_id", accountId).order("timestamp", { ascending: false });
      if (a.contact_id) q = q.eq("contact_id", String(a.contact_id));
      if (a.deal_id) q = q.eq("deal_id", String(a.deal_id));
      if (a.type) q = q.eq("type", String(a.type).toUpperCase());
      if (typeof a.since_days === "number") {
        const cutoff = new Date(Date.now() - a.since_days * 86400_000).toISOString();
        q = q.gte("timestamp", cutoff);
      }
      q = q.limit(Math.min(Number(a.limit) || 25, 200));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, engagements: data };
    }
    case "count_records": {
      const tableMap: Record<string, string> = {
        contacts: "mirror_contacts",
        deals: "mirror_deals",
        companies: "mirror_companies",
        engagements: "mirror_engagements",
        owners: "mirror_owners",
      };
      const table = tableMap[a.entity];
      if (!table) return { error: `Unknown entity: ${a.entity}` };
      let q = admin.from(table).select("*", { count: "exact", head: true }).eq("account_id", accountId);
      if (a.stage && table === "mirror_deals") q = q.eq("stage", a.stage);
      if (a.owner_id && table === "mirror_deals") q = q.eq("owner_id", a.owner_id);
      if (a.lifecycle_stage && table === "mirror_contacts") q = q.eq("lifecycle_stage", a.lifecycle_stage);
      const { count, error } = await q;
      return error ? { error: error.message } : { entity: a.entity, count: count ?? 0 };
    }
    case "list_assistant_actions": {
      let q = admin.from("assistant_actions").select("id,tool_name,status,affected_count,created_at,executed_at,undone_at,error_message").eq("account_id", accountId).order("created_at", { ascending: false });
      if (a.status) q = q.eq("status", a.status);
      q = q.limit(Math.min(Number(a.limit) || 25, 100));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, actions: data };
    }
    default:
      return { error: `Unknown read tool: ${name}` };
  }
}

// ------------------------------------------------------------------
// Build dynamic preview for a write tool (so the user sees what will happen)
// ------------------------------------------------------------------
async function buildProposalPreview(
  admin: SupabaseClient,
  accountId: string,
  toolName: string,
  args: any,
): Promise<{ summary: string; affected: number; sample?: unknown[]; before?: unknown }> {
  if (toolName === "update_contact" || toolName === "update_deal" || toolName === "update_company") {
    const t = toolName.replace("update_", "");
    const table = t === "deal" ? "mirror_deals" : t === "company" ? "mirror_companies" : "mirror_contacts";
    const { data: before } = await admin.from(table).select("*").eq("account_id", accountId).eq("hubspot_id", String(args.hubspot_id)).maybeSingle();
    const label = t === "deal" ? (before as any)?.deal_name : t === "company" ? (before as any)?.name : `${(before as any)?.first_name || ""} ${(before as any)?.last_name || ""}`.trim() || (before as any)?.email;
    return {
      summary: `Update ${t}${label ? ` "${label}"` : ""} (#${args.hubspot_id})`,
      affected: 1,
      before,
    };
  }
  if (toolName === "bulk_update_deals") {
    const f = args.filter || {};
    let q = admin.from("mirror_deals").select("hubspot_id,deal_name,stage,amount,owner_id", { count: "exact" }).eq("account_id", accountId);
    if (f.stage) q = q.eq("stage", f.stage);
    if (f.owner_id) q = q.eq("owner_id", f.owner_id);
    if (typeof f.min_amount === "number") q = q.gte("amount", f.min_amount);
    if (typeof f.max_amount === "number") q = q.lte("amount", f.max_amount);
    if (typeof f.stalled_days === "number") {
      const cutoff = new Date(Date.now() - f.stalled_days * 86400_000).toISOString();
      q = q.lt("last_activity_date", cutoff);
    }
    q = q.limit(10);
    const { data, count } = await q;
    return {
      summary: `Update ${count ?? 0} deals matching filter`,
      affected: Math.min(count ?? 0, 500),
      sample: data || [],
    };
  }
  if (toolName === "reassign_deals") {
    const { data, count } = await admin
      .from("mirror_deals")
      .select("hubspot_id,deal_name,stage,amount", { count: "exact" })
      .eq("account_id", accountId)
      .eq("owner_id", String(args.from_owner_id))
      .not("stage", "ilike", "closed_%")
      .limit(10);
    return {
      summary: `Reassign ${count ?? 0} open deals from owner ${args.from_owner_id} → ${args.to_owner_id}`,
      affected: Math.min(count ?? 0, 500),
      sample: data || [],
    };
  }
  if (toolName === "trigger_sync") return { summary: `Run HubSpot sync (${args.mode})`, affected: 0 };
  if (toolName === "trigger_hygiene_scan") return { summary: "Run a fresh data hygiene scan", affected: 0 };
  if (toolName === "trigger_leak_audit") return { summary: "Run a fresh Leak Audit", affected: 0 };
  if (toolName === "approve_hygiene_action") return { summary: `Approve hygiene action ${args.action_id}`, affected: 0 };
  if (toolName === "reject_hygiene_action") return { summary: `Reject hygiene action ${args.action_id}`, affected: 0 };
  if (toolName === "execute_hygiene_action") {
    const { data: act } = await admin.from("hygiene_actions").select("category_label,affected_count").eq("id", String(args.action_id)).maybeSingle();
    return {
      summary: `Approve & run hygiene fix${act?.category_label ? `: ${act.category_label}` : ""}`,
      affected: (act as any)?.affected_count || 0,
    };
  }
  if (toolName === "undo_assistant_action") return { summary: `Undo previous Co-Pilot action ${args.action_id}`, affected: 0 };
  if (toolName === "archive_audit") return { summary: `Move audit ${args.audit_id} to trash`, affected: 0 };
  if (toolName === "restore_audit") return { summary: `Restore audit ${args.audit_id} from trash`, affected: 0 };
  if (toolName === "delete_audit_permanently") return { summary: `PERMANENTLY delete audit ${args.audit_id}`, affected: 0 };
  if (toolName === "disconnect_hubspot") return { summary: "Disconnect HubSpot from this account", affected: 0 };
  if (toolName === "create_contact" || toolName === "create_deal" || toolName === "create_company") {
    const t = toolName.replace("create_", "");
    return { summary: `Create new ${t} in HubSpot`, affected: 1, sample: [args.properties] };
  }
  if (toolName === "delete_contact" || toolName === "delete_deal" || toolName === "delete_company") {
    const t = toolName.replace("delete_", "");
    const table = t === "deal" ? "mirror_deals" : t === "company" ? "mirror_companies" : "mirror_contacts";
    const { data: before } = await admin.from(table).select("*").eq("account_id", accountId).eq("hubspot_id", String(args.hubspot_id)).maybeSingle();
    return { summary: `Archive (delete) ${t} #${args.hubspot_id}`, affected: 1, before };
  }
  if (toolName === "bulk_update_contacts") {
    const f = args.filter || {};
    let q = admin.from("mirror_contacts").select("hubspot_id,first_name,last_name,email,lifecycle_stage", { count: "exact" }).eq("account_id", accountId);
    if (f.lifecycle_stage) q = q.eq("lifecycle_stage", f.lifecycle_stage);
    if (f.owner_id) q = q.eq("owner_id", f.owner_id);
    if (f.search) q = q.or(`first_name.ilike.%${f.search}%,last_name.ilike.%${f.search}%,email.ilike.%${f.search}%`);
    if (typeof f.inactive_days === "number") {
      const cutoff = new Date(Date.now() - f.inactive_days * 86400_000).toISOString();
      q = q.lt("last_activity_date", cutoff);
    }
    q = q.limit(10);
    const { data, count } = await q;
    return { summary: `Update ${count ?? 0} contacts matching filter`, affected: Math.min(count ?? 0, 500), sample: data || [] };
  }
  if (toolName === "bulk_update_companies") {
    const f = args.filter || {};
    let q = admin.from("mirror_companies").select("hubspot_id,name,domain,industry", { count: "exact" }).eq("account_id", accountId);
    if (f.industry) q = q.eq("industry", f.industry);
    if (f.owner_id) q = q.eq("owner_id", f.owner_id);
    if (f.search) q = q.or(`name.ilike.%${f.search}%,domain.ilike.%${f.search}%`);
    if (typeof f.min_employees === "number") q = q.gte("num_employees", f.min_employees);
    if (typeof f.max_employees === "number") q = q.lte("num_employees", f.max_employees);
    if (typeof f.inactive_days === "number") {
      const cutoff = new Date(Date.now() - f.inactive_days * 86400_000).toISOString();
      q = q.lt("last_activity_date", cutoff);
    }
    q = q.limit(10);
    const { data, count } = await q;
    return { summary: `Update ${count ?? 0} companies matching filter`, affected: Math.min(count ?? 0, 500), sample: data || [] };
  }
  if (toolName === "bulk_delete_deals") {
    const f = args.filter || {};
    let q = admin.from("mirror_deals").select("hubspot_id,deal_name,stage,amount", { count: "exact" }).eq("account_id", accountId);
    if (f.stage) q = q.eq("stage", f.stage);
    if (f.owner_id) q = q.eq("owner_id", f.owner_id);
    if (typeof f.min_amount === "number") q = q.gte("amount", f.min_amount);
    if (typeof f.max_amount === "number") q = q.lte("amount", f.max_amount);
    if (typeof f.stalled_days === "number") {
      const cutoff = new Date(Date.now() - f.stalled_days * 86400_000).toISOString();
      q = q.lt("last_activity_date", cutoff);
    }
    q = q.limit(10);
    const { data, count } = await q;
    return { summary: `ARCHIVE ${count ?? 0} deals matching filter`, affected: Math.min(count ?? 0, 500), sample: data || [] };
  }
  if (toolName === "add_note_to_record") {
    return { summary: `Add note to ${args.type} #${args.hubspot_id}`, affected: 1, sample: [{ body: String(args.body || "").slice(0, 200) }] };
  }
  if (toolName === "create_task_for_record") {
    return { summary: `Create task "${args.subject}" on ${args.type} #${args.hubspot_id}`, affected: 1 };
  }
  if (toolName === "associate_records") {
    return { summary: `Associate ${args.from_type} #${args.from_id} ↔ ${args.to_type} #${args.to_id}`, affected: 1 };
  }
  return { summary: `${toolName}`, affected: 0 };
}

// ------------------------------------------------------------------
// System prompt
// ------------------------------------------------------------------
function buildSystemPrompt(ctx: { portalId?: string | null; writeEnabled: boolean; counts: any }): string {
  return `You are the Aetheris Operator Co-Pilot — a sharp, blunt, forensic-minded assistant embedded in the user's HubSpot Revenue Recovery app.

PERSONALITY: Direct. No fluff. Treat the CRM like a crime scene. Find leaks, name them, propose fixes. Speak like a senior operator, not a chatbot.

CONTEXT
- HubSpot Portal: ${ctx.portalId || "not connected"}
- Write-back permission: ${ctx.writeEnabled ? "ENABLED" : "DISABLED (read-only — tell user to reconnect HubSpot for writes)"}
- Mirrored counts: ${JSON.stringify(ctx.counts)}

CAPABILITIES — every UI action in this app is also doable here:

READ (auto-run, no confirm): query_pipeline, query_contacts, query_companies, query_owners, query_engagements, get_record_detail, count_records, run_leak_detector, list_hygiene_queue, summarize_audit, list_audits, list_assistant_actions.

APP-ACTION (require confirm):
  - trigger_sync, trigger_hygiene_scan, trigger_leak_audit
  - approve_hygiene_action, reject_hygiene_action, execute_hygiene_action (approve+run a queued fix)
  - undo_assistant_action (rollback a prior Co-Pilot write)
  - archive_audit / restore_audit / delete_audit_permanently
  - disconnect_hubspot

WRITE (require confirm, log before/after for undo):
  - update_contact, update_deal, update_company
  - create_contact, create_deal, create_company
  - delete_contact, delete_deal, delete_company
  - bulk_update_deals, bulk_update_contacts, bulk_delete_deals
  - reassign_deals
  - add_note_to_record, create_task_for_record, associate_records

RULES
- For data questions, ALWAYS call a read tool first; never make up numbers.
- Translate user names to ids first: if the user says "reassign Sarah's deals to Mike", call query_owners to resolve both ids before reassign_deals.
- For bulk operations, narrow the filter, then PREVIEW the count before confirming.
- When write tools are disabled (no scopes), do NOT call them — tell the user to reconnect HubSpot.
- For destructive actions (delete_*, bulk_delete_*, delete_audit_permanently, disconnect_hubspot), be loud about it in the confirm summary.
- Keep responses scannable: short paragraphs, bullet points, dollar figures. Use markdown.
- Frame leak numbers as "exposure" / "bleeding" in brand voice.`;
}

// ------------------------------------------------------------------
// Main handler
// ------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: uErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { conversation_id, message, image } = body as {
      conversation_id?: string;
      message: string;
      image?: string; // optional base64 data URL of a screen-region capture
    };
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);

    // Basic guard on attached image size (~ 8MB cap on the data URL)
    if (image && (typeof image !== "string" || !image.startsWith("data:image/") || image.length > 8_000_000)) {
      return json({ error: "Invalid or oversized image attachment" }, 400);
    }

    // Resolve account
    const { data: account } = await admin.from("accounts").select("*").eq("user_id", user.id).maybeSingle();
    if (!account) return json({ error: "No account on file" }, 404);

    // Get/create conversation
    let convoId = conversation_id;
    if (!convoId) {
      const { data: convo, error: cErr } = await admin
        .from("assistant_conversations")
        .insert({ account_id: account.id, user_id: user.id, title: message.slice(0, 60) })
        .select()
        .single();
      if (cErr) return json({ error: cErr.message }, 500);
      convoId = convo.id;
    } else {
      // Verify ownership
      const { data: convo } = await admin.from("assistant_conversations").select("account_id").eq("id", convoId).maybeSingle();
      if (!convo || convo.account_id !== account.id) return json({ error: "Forbidden" }, 403);
    }

    // Persist user message (text only — raw image is not stored)
    const persistedUserContent = image ? `[screenshot attached] ${message}` : message;
    await admin.from("assistant_messages").insert({ conversation_id: convoId, role: "user", content: persistedUserContent });

    // Load history
    const { data: history } = await admin
      .from("assistant_messages")
      .select("role,content,tool_calls,tool_call_id,name")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true })
      .limit(50);

    const grantedScopes = (account.hubspot_scopes || "").split(/\s+/).filter(Boolean);
    const writeEnabled = WRITE_SCOPES.every((s) => grantedScopes.includes(s));

    // Cheap context counts
    const [c, d, co] = await Promise.all([
      admin.from("mirror_contacts").select("*", { count: "exact", head: true }).eq("account_id", account.id),
      admin.from("mirror_deals").select("*", { count: "exact", head: true }).eq("account_id", account.id),
      admin.from("mirror_companies").select("*", { count: "exact", head: true }).eq("account_id", account.id),
    ]);
    const ctxCounts = { contacts: c.count ?? 0, deals: d.count ?? 0, companies: co.count ?? 0 };

    const tools = [...READ_TOOLS, ...APP_ACTION_TOOLS, ...(writeEnabled ? WRITE_TOOLS : [])];
    const systemPrompt = buildSystemPrompt({ portalId: account.hubspot_portal_id, writeEnabled, counts: ctxCounts });

    // Build OpenAI-format messages. The history user message we just inserted
    // is replaced for THIS turn with a multimodal payload that carries the
    // actual image bytes (so Gemini can see it). Future turns will only see
    // the "[screenshot attached]" marker — which is fine.
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (image) {
      messages.push({
        role: "system",
        content:
          "The user attached a screenshot of their current view in the Aetheris operator app. " +
          "Describe what you see in the context of HubSpot CRM data, the Hygiene Queue, leak audit, " +
          "or whatever is visible. If you spot specific record IDs, deal names, owner names, or numbers, " +
          "feel free to use the read tools to look them up and give a richer answer.",
      });
    }
    const historyArr = history || [];
    for (let i = 0; i < historyArr.length; i++) {
      const m = historyArr[i];
      const isLastUser = image && i === historyArr.length - 1 && m.role === "user";
      if (isLastUser) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: message || "Explain what's in this screenshot." },
            { type: "image_url", image_url: { url: image } },
          ],
        });
      } else {
        const msg: any = { role: m.role, content: m.content || "" };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        if (m.name) msg.name = m.name;
        messages.push(msg);
      }
    }


    // Loop: call model, run any read tools, repeat until model returns plain content or proposes a write
    const proposedActions: any[] = [];
    let assistantText = "";
    let assistantToolCalls: any[] | null = null;

    for (let hop = 0; hop < 5; hop++) {
      const aiRes = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (aiRes.status === 429) return json({ error: "Rate limit hit. Wait a few seconds and try again." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Workspace → Usage." }, 402);
      if (!aiRes.ok) {
        const t = await aiRes.text();
        console.error("[assistant-chat] AI error", aiRes.status, t);
        return json({ error: "AI gateway error" }, 500);
      }

      const data = await aiRes.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) return json({ error: "No response from model" }, 500);

      assistantText = choice.content || "";
      assistantToolCalls = choice.tool_calls || null;

      if (!assistantToolCalls?.length) break; // model done

      // Split tool calls into read (execute now) vs app/write (propose)
      const readCalls = assistantToolCalls.filter((tc: any) => TOOL_NAMES.read.includes(tc.function.name));
      const proposeCalls = assistantToolCalls.filter((tc: any) => !TOOL_NAMES.read.includes(tc.function.name));

      if (proposeCalls.length) {
        // Build previews and stop the loop. Frontend will confirm + call assistant-execute.
        for (const tc of proposeCalls) {
          let parsed: any = {};
          try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          const preview = await buildProposalPreview(admin, account.id, tc.function.name, parsed);
          proposedActions.push({
            tool_call_id: tc.id,
            tool_name: tc.function.name,
            args: parsed,
            requires_confirm: true,
            ...preview,
          });
        }
        // Persist assistant message with tool_calls AND text
        const { data: aMsg } = await admin
          .from("assistant_messages")
          .insert({
            conversation_id: convoId,
            role: "assistant",
            content: assistantText || "",
            tool_calls: assistantToolCalls,
          })
          .select()
          .single();
        return json({ conversation_id: convoId, message_id: aMsg?.id, content: assistantText, proposed_actions: proposedActions });
      }

      // Execute read calls and append results
      messages.push({ role: "assistant", content: assistantText, tool_calls: assistantToolCalls });
      for (const tc of readCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
        const result = await executeReadTool(admin, account.id, tc.function.name, parsed);
        const truncated = JSON.stringify(result).slice(0, 30000);
        messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: truncated });
      }
      // Persist the assistant tool-call message + tool results
      await admin.from("assistant_messages").insert({
        conversation_id: convoId,
        role: "assistant",
        content: assistantText || "",
        tool_calls: assistantToolCalls,
      });
      for (const tc of readCalls) {
        const matched = messages[messages.length - readCalls.length + readCalls.indexOf(tc)];
        await admin.from("assistant_messages").insert({
          conversation_id: convoId,
          role: "tool",
          tool_call_id: tc.id,
          name: tc.function.name,
          content: matched.content,
        });
      }
    }

    // Persist final assistant message
    const { data: aMsg } = await admin
      .from("assistant_messages")
      .insert({ conversation_id: convoId, role: "assistant", content: assistantText })
      .select()
      .single();

    await admin.from("assistant_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    return json({ conversation_id: convoId, message_id: aMsg?.id, content: assistantText, proposed_actions: [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    console.error("[assistant-chat] fatal", err);
    return json({ error: msg }, 500);
  }
});
