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
      let q = admin.from("hygiene_actions").select("id,kind,description,status,affected_record_count,exposure_cents,created_at").eq("account_id", accountId).order("created_at", { ascending: false });
      if (a.status) q = q.eq("status", a.status);
      q = q.limit(Math.min(Number(a.limit) || 25, 100));
      const { data, error } = await q;
      return error ? { error: error.message } : { count: data?.length || 0, items: data };
    }
    case "summarize_audit": {
      let q = admin.from("audits").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(1);
      if (a.audit_id) q = admin.from("audits").select("*").eq("account_id", accountId).eq("id", a.audit_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return data?.[0] || { error: "No audits found" };
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

CAPABILITIES
You have tools that fall into three categories:

1. READ tools (run automatically, no confirmation): query_pipeline, query_contacts, query_companies, get_record_detail, run_leak_detector, list_hygiene_queue, summarize_audit. Use these freely to answer questions.

2. APP-ACTION tools (require user confirm): trigger_sync, trigger_hygiene_scan, trigger_leak_audit. When the user asks for one of these, call the tool — the system will surface a confirmation card automatically.

3. WRITE tools (require user confirm + show before/after): update_contact, update_deal, update_company, bulk_update_deals, reassign_deals. Same — call the tool and the system handles the confirm.

RULES
- For data questions, ALWAYS call a read tool first, then summarize. Don't make up numbers.
- For writes, confirm the user's intent in plain English, then call the tool. The user gets one final preview before execution.
- For bulk operations, prefer narrow filters and warn about row counts.
- When write tools are disabled, do NOT call them — explain that HubSpot needs to be reconnected with write scopes.
- Keep responses scannable: short paragraphs, bullet points, dollar figures. Use markdown.
- When a tool returns numbers, frame them as "leaks" or "exposure" when appropriate to brand voice.`;
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
