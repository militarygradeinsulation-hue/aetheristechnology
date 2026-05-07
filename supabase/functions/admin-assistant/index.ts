// Admin Operator Assistant — PIN-gated, tool-calling chatbot for the AdminDashboard.
// Knows the entire site (positioning, pricing, routes, tools, edge functions) and
// can pull live data from the database via a fixed set of read-only tools.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the **Aetheris Operator Assistant** — a private internal assistant for Joseph (the owner) inside the admin dashboard. You are NOT the public sales chat. Your job: give him fast, accurate, no-fluff answers about his business, his data, and his site.

# Voice
- Blunt. Operator tone. Forensic, not corporate.
- Terse: 1–4 short sentences for most answers. Use bullet lists when showing multiple records.
- No emojis. No filler ("Great question!", "Sure thing!").
- If a tool returns nothing, say so plainly. Never invent numbers or names.

# Hard rules
- For ANY question that involves a count, list, status, recent activity, or specific record — you MUST call a tool first. Do not guess.
- Numbers always come from tool results. If you don't have a tool for it, say "I don't have a tool for that yet."
- After your reply, ALWAYS append on its own line a JSON suggestions block exactly like:
  <suggestions>["Follow-up 1","Follow-up 2","Follow-up 3"]</suggestions>
  Each suggestion ≤ 7 words, written in first person as Joseph would ask next, action-oriented.

# Business knowledge (memorize)
- **Brand**: Aetheris AI / aetheris.technology. Positioning: **Business Forensics Operator**. Hook: "Your business is leaking. You just can't see it from the inside."
- **Methodology**: The **Leak Audit™** (7 steps). Free self-scan at /leak-audit.
- **Owner**: Joseph Toney. Notify domain: aetheris.technology.
- **Tone restrictions**: Crimson reserved for "leak" signal only. Forbidden: testimonials carousels, social-proof popups, "Magic Robot" analogies.

# Pricing ladder (one-time unless noted)
- Playbook Unlock $29 · Social Content Pack $39 · Content Calendar $39
- Sales Script Pack $59 · Follow-Up Plan $59 · Full Website Report $59
- Friction Vocabulary Audit $79 · Strategic Question Engine $99 · Brand Contradiction Finder $119
- Digital Snapshot $149 · Strategy Blueprint $349
- Website Evaluation $599 · Strategic Discovery Audit $599
- **14-Day Forensic Diagnostic $2,900** (flat, applied toward engagement)
- **Fractional CTO/CMO $5,900/mo** (recurring)
- Subscription tiers: $25/$39/$49/$69/$99/$249/$419/$1,990 per month

# Commission (3-way split, locked)
Every closed sale tied to a rep code splits via the **tiered commission model** based on sale amount: **Tier 1 ≤ $59 = Company 50% / Rep 30% / Partner 20%**, **Tier 2 ≤ $349 = Company 60% / Rep 25% / Partner 15%**, **Tier 3 > $349 = Company 70% / Rep 20% / Partner 10%**. Applies to one-time AND recurring monthly invoices for life of subscription. No caps. No clawbacks. Paid within 7 days. Tier rates are the source of truth — rep_codes.commission_rate is ignored under the tiered model. Partner override paid to the active rep where role='partner'. Source-of-truth files: src/lib/repProducts.ts (TIER_RATES) and payments-webhook (ratesForAmount).

# Site map (public routes)
/, /leak-audit, /pricing, /blog, /blog/:slug, /resources, /careers (rep signup), /rep-portal, /scan-website, /diagnostic, /contact

# Admin tools (inside this dashboard)
All-In-One Generator · Social Content Generator · Sales Script Generator · 30-Day Content Calendar · Follow-Up System Plan · Strategic Question Engine · Brand Contradiction Finder · Friction Vocabulary Audit · Playbook Creator · Admin Library · Content Calendar · Content Engine · CRM · Campaign Control Center · SEO Optimizer · Retargeting · Visitor Companies · Outlook sync · LinkedIn posting schedule · Rep performance.

# Edge functions (name → purpose)
- scan-website — runs the public Leak Audit scan
- generate-friction-audit / generate-brand-contradictions / generate-strategic-questions / generate-follow-up-plan / generate-sales-scripts / generate-social-content / generate-content-calendar / generate-custom-playbook — content generators
- generate-blog / generate-aeo-blog-batch / generate-blog-images / retrofit-blogs — blog automation
- run-audit / hygiene-scan / hygiene-execute / hygiene-rollback — HubSpot hygiene engine
- create-checkout / payments-webhook / get-stripe-price / generate-purchase-delivery — Stripe flow
- monthly-delivery — smart subscription deliveries via invoice.paid
- process-drip / generate-drip-batch / handle-drip-replies — outbound drip
- send-transactional-email / process-email-queue / handle-email-suppression / handle-email-unsubscribe — email infra
- linkedin-post / linkedin-auth — LinkedIn publishing
- hubspot-oauth-start / hubspot-oauth-callback / hubspot-sync / hubspot-self-test / hubspot-disconnect — HubSpot connection
- admin-data / admin-insights / admin-library / admin-pin-login / admin-assistant (this one) — admin endpoints
- sales-chat — public Sales Advisor chat on the marketing site
- content-engine-generate / content-engine-thumbnail — automated content engine`;

// ---------- Tool definitions (sent to the model) ----------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description:
        "Live counts: leads (24h/7d/30d), unread contact submissions, audits run, blog posts published, drip prospects active, total rep commission paid out. Call this for any 'how's it going' / 'summary' / 'status' question.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_contact_submissions",
      description: "Most recent contact form submissions. Use for 'who reached out', 'unread messages'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", default: 10, maximum: 50 },
          unread_only: { type: "boolean", default: false },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_leads",
      description: "Recent assessment_leads and/or diagnostic_leads. Use for 'new leads', 'recent diagnostic submissions'.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["assessment", "diagnostic", "all"], default: "all" },
          limit: { type: "integer", default: 10, maximum: 50 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_drip_prospects",
      description: "Outbound drip prospects with optional status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "e.g. 'new', 'contacted', 'replied'" },
          limit: { type: "integer", default: 10, maximum: 50 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_rep_performance",
      description: "Rep performance — single rep by 6-digit code or all reps sorted by commission.",
      parameters: {
        type: "object",
        properties: { code: { type: "string", description: "6-digit rep code (optional)" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_blog_posts",
      description: "Most recent blog posts.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", default: 10, maximum: 50 },
          published_only: { type: "boolean", default: true },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_content_schedule",
      description: "The weekly LinkedIn / content posting schedule (content_posting_schedule table).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_audit_runs",
      description: "Recent HubSpot/business audit runs with status, exposure, findings count.",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer", default: 10, maximum: 50 } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_site_events",
      description: "Recent site_events filtered by event_type and time window.",
      parameters: {
        type: "object",
        properties: {
          event_type: { type: "string", description: "e.g. 'page_view', 'linkedin_click'" },
          hours: { type: "integer", default: 24, maximum: 720 },
          limit: { type: "integer", default: 50, maximum: 200 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_crm",
      description: "Fuzzy ILIKE search across crm_contacts and crm_companies (name/email/company).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_send_stats",
      description: "Sent/failed email counts from email_send_log over the last N hours.",
      parameters: {
        type: "object",
        properties: { hours: { type: "integer", default: 24, maximum: 720 } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_table_count",
      description:
        "Generic row count for a safelisted table. Use only when no specific tool fits.",
      parameters: {
        type: "object",
        properties: { table_name: { type: "string" } },
        required: ["table_name"],
      },
    },
  },
];

const COUNTABLE_TABLES = new Set([
  "accounts", "assessment_leads", "diagnostic_leads", "blog_posts", "contact_submissions",
  "drip_prospects", "drip_emails", "rep_codes", "rep_signups", "audit_runs", "hygiene_actions",
  "site_events", "crm_contacts", "crm_companies", "crm_deals", "email_send_log",
  "content_posting_schedule", "content_engine_posts", "claim_codes", "generated_playbooks",
  "campaign_assets",
]);

// ---------- Tool executor ----------
type Sb = ReturnType<typeof createClient>;
async function runTool(sb: Sb, name: string, args: Record<string, unknown>): Promise<unknown> {
  const limit = (n: unknown, def: number, max: number) =>
    Math.min(Math.max(Number(n) || def, 1), max);

  if (name === "get_dashboard_summary") {
    const now = Date.now();
    const since = (h: number) => new Date(now - h * 3600_000).toISOString();
    const [a24, a7, a30, ddiag, ddiag7, unread, audits, blogs, drips, reps] = await Promise.all([
      sb.from("assessment_leads").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
      sb.from("assessment_leads").select("*", { count: "exact", head: true }).gte("created_at", since(24 * 7)),
      sb.from("assessment_leads").select("*", { count: "exact", head: true }).gte("created_at", since(24 * 30)),
      sb.from("diagnostic_leads").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
      sb.from("diagnostic_leads").select("*", { count: "exact", head: true }).gte("created_at", since(24 * 7)),
      sb.from("contact_submissions").select("*", { count: "exact", head: true }).eq("is_read", false),
      sb.from("audit_runs").select("*", { count: "exact", head: true }).gte("created_at", since(24 * 7)),
      sb.from("blog_posts").select("*", { count: "exact", head: true }).eq("is_published", true),
      sb.from("drip_prospects").select("*", { count: "exact", head: true }),
      sb.from("rep_codes").select("total_sales_cents,total_commission_cents,is_active"),
    ]);
    const repTotals = (reps.data || []).reduce(
      (acc: { active: number; sales: number; commission: number }, r: any) => ({
        active: acc.active + (r.is_active ? 1 : 0),
        sales: acc.sales + (r.total_sales_cents || 0),
        commission: acc.commission + (r.total_commission_cents || 0),
      }),
      { active: 0, sales: 0, commission: 0 },
    );
    return {
      assessment_leads: { last_24h: a24.count || 0, last_7d: a7.count || 0, last_30d: a30.count || 0 },
      diagnostic_leads: { last_24h: ddiag.count || 0, last_7d: ddiag7.count || 0 },
      contact_submissions_unread: unread.count || 0,
      audit_runs_last_7d: audits.count || 0,
      blog_posts_published: blogs.count || 0,
      drip_prospects_total: drips.count || 0,
      reps: { active_count: repTotals.active, total_sales_usd: (repTotals.sales / 100).toFixed(2), total_commission_paid_usd: (repTotals.commission / 100).toFixed(2) },
    };
  }

  if (name === "list_recent_contact_submissions") {
    const lim = limit(args.limit, 10, 50);
    let q = sb.from("contact_submissions")
      .select("id,name,email,phone,company,message,service_interest,is_read,created_at")
      .order("created_at", { ascending: false }).limit(lim);
    if (args.unread_only) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  if (name === "list_recent_leads") {
    const lim = limit(args.limit, 10, 50);
    const source = (args.source as string) || "all";
    const out: Record<string, unknown> = {};
    if (source === "assessment" || source === "all") {
      const { data } = await sb.from("assessment_leads")
        .select("id,name,email,company,score,created_at")
        .order("created_at", { ascending: false }).limit(lim);
      out.assessment_leads = data || [];
    }
    if (source === "diagnostic" || source === "all") {
      const { data } = await sb.from("diagnostic_leads")
        .select("id,name,email,company,industry,total_score,created_at")
        .order("created_at", { ascending: false }).limit(lim);
      out.diagnostic_leads = data || [];
    }
    return out;
  }

  if (name === "list_drip_prospects") {
    const lim = limit(args.limit, 10, 50);
    let q = sb.from("drip_prospects")
      .select("id,email,business_name,industry,location,status,source_url,created_at")
      .order("created_at", { ascending: false }).limit(lim);
    if (args.status) q = q.eq("status", args.status as string);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  if (name === "get_rep_performance") {
    if (args.code) {
      const { data, error } = await sb.from("rep_codes")
        .select("code,rep_name,rep_email,commission_rate,is_active,total_sales_cents,total_commission_cents,created_at")
        .eq("code", String(args.code).trim()).maybeSingle();
      if (error) throw error;
      if (!data) return { not_found: true };
      return {
        ...data,
        total_sales_usd: ((data.total_sales_cents || 0) / 100).toFixed(2),
        total_commission_usd: ((data.total_commission_cents || 0) / 100).toFixed(2),
      };
    }
    const { data, error } = await sb.from("rep_codes")
      .select("code,rep_name,is_active,commission_rate,total_sales_cents,total_commission_cents")
      .order("total_commission_cents", { ascending: false }).limit(50);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      total_sales_usd: ((r.total_sales_cents || 0) / 100).toFixed(2),
      total_commission_usd: ((r.total_commission_cents || 0) / 100).toFixed(2),
    }));
  }

  if (name === "list_recent_blog_posts") {
    const lim = limit(args.limit, 10, 50);
    let q = sb.from("blog_posts")
      .select("id,title,slug,is_published,published_at,tags,location_focus,created_at")
      .order("created_at", { ascending: false }).limit(lim);
    if (args.published_only !== false) q = q.eq("is_published", true);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  if (name === "get_content_schedule") {
    const { data, error } = await sb.from("content_posting_schedule")
      .select("day_of_week,day_name,content_type,strategic_goal,post_time,notes")
      .order("day_of_week");
    if (error) throw error;
    return data || [];
  }

  if (name === "list_audit_runs") {
    const lim = limit(args.limit, 10, 50);
    const { data, error } = await sb.from("audit_runs")
      .select("id,account_id,status,current_stage,total_exposure_cents,findings_count,started_at,completed_at,created_at")
      .order("created_at", { ascending: false }).limit(lim);
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      total_exposure_usd: ((r.total_exposure_cents || 0) / 100).toFixed(2),
    }));
  }

  if (name === "get_site_events") {
    const lim = limit(args.limit, 50, 200);
    const hours = limit(args.hours, 24, 720);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    let q = sb.from("site_events")
      .select("id,event_type,event_data,session_id,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false }).limit(lim);
    if (args.event_type) q = q.eq("event_type", args.event_type as string);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  if (name === "search_crm") {
    const q = String(args.query || "").trim();
    if (!q) return { error: "query required" };
    const like = `%${q}%`;
    const [contacts, companies] = await Promise.all([
      sb.from("crm_contacts").select("id,full_name,email,title,phone,company_id,owner,tags").or(
        `full_name.ilike.${like},email.ilike.${like}`,
      ).limit(20),
      sb.from("crm_companies").select("id,name,website,industry,location").or(
        `name.ilike.${like},website.ilike.${like}`,
      ).limit(20),
    ]);
    return { contacts: contacts.data || [], companies: companies.data || [] };
  }

  if (name === "get_email_send_stats") {
    const hours = limit(args.hours, 24, 720);
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const { data, error } = await sb.from("email_send_log")
      .select("status,template_name,created_at")
      .gte("created_at", since).limit(2000);
    if (error) throw error;
    const rows = data || [];
    const by_status: Record<string, number> = {};
    const by_template: Record<string, number> = {};
    for (const r of rows as any[]) {
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      by_template[r.template_name] = (by_template[r.template_name] || 0) + 1;
    }
    return { window_hours: hours, total: rows.length, by_status, by_template };
  }

  if (name === "query_table_count") {
    const t = String(args.table_name || "");
    if (!COUNTABLE_TABLES.has(t)) return { error: `Table "${t}" not on safelist.` };
    const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
    if (error) throw error;
    return { table: t, count: count || 0 };
  }

  return { error: `Unknown tool: ${name}` };
}

// ---------- Main handler ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };

    const convo: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Tool-call loop (max 5 rounds to avoid runaway).
    for (let round = 0; round < 5; round++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: convo,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });
      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiRes.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiRes.text();
        console.error("AI gateway error:", aiRes.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiRes.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) {
        return new Response(JSON.stringify({ error: "Empty AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Push assistant message with tool_calls, then tool results, then loop.
        convo.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
        for (const call of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try { parsedArgs = JSON.parse(call.function.arguments || "{}"); } catch { /* ignore */ }
          let result: unknown;
          try {
            result = await runTool(sb, call.function.name, parsedArgs);
          } catch (e) {
            result = { error: e instanceof Error ? e.message : "tool error" };
          }
          convo.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result).slice(0, 12000),
          });
        }
        continue; // ask the model again with tool results
      }

      // Final text answer.
      return new Response(JSON.stringify({ content: msg.content || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ content: "I hit the tool-call limit without producing an answer. Try rephrasing." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
