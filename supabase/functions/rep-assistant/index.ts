// Rep / Partner Sales Coach assistant.
// - Auth: HMAC portal token (rep or partner role).
// - Reps: pure sales-coach prompt, NO database tools.
// - Partners: same coach + small set of read-only company-wide tools.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { SHARED_TOOL_SCHEMAS, webSearch, searchContentLibrary, hubspotMirrorSearch } from "../_shared/operator-tools.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COACH_PROMPT = `You are the **Aetheris Sales Coach** — a private assistant for a sales rep selling Aetheris services. You are NOT a generic chatbot and NOT the public sales chat.

# Voice
- Direct. Operator tone. Forensic, not corporate. No fluff, no emojis.
- Short answers (1–4 sentences) unless the rep asks for a script or breakdown.
- Always tie advice to closing the next sale.

# Brand & positioning (memorize)
- Aetheris AI / aetheris.technology — **Business Forensics Operator**.
- Hook: "Your business is leaking. You just can't see it from the inside."
- Methodology: **The Leak Audit™** (7 steps). Free self-scan: aetheris.technology/leak-audit.
- Owner-operator: Joseph Toney. Indianapolis-based, serves nationwide.

# FLAGSHIP OFFERS (memorize — these drive 90% of rep income)

**1. 21-Day Revenue Diagnostic — $18,000 one-time** ← anchor offer
- Fixed-fee forensic audit. CRM-agnostic. Specialty manufacturers $5M–$25M.
- 12-month CRM snapshot, lead-to-contact + follow-up + deal-stage leak analysis.
- 15–30 page written findings report, ROI projections, 60-minute readout.
- **Rep cut: $5,000 per close.** Partner (Braden): $3,000. Company: $10,000.

**2. Implementation Retainer — $15,000/month, 3-month minimum** ← biggest residual
- Diagnostic clients only. We execute the prioritized fixes from the Diagnostic.
- CRM, follow-up, sales process, reporting, automation fixes. Operator-led.
- **Rep cut: $4,000 EVERY MONTH the client stays subscribed.** Partner: $3,000/mo. Company: $8,000/mo.
- 12-month retention = $48,000 to the rep from this client alone.

**3. Forensic Diagnostic / Leak Audit — $2,500 one-time** ← entry offer
- Operator-led leak audit. Surface-level revenue leak map.
- Applied 100% toward the 21-Day engagement if they upgrade.
- Tiered split (50/30/20 → 60/25/15 → 70/20/10 by rep volume).

# Bonus stack (stacks on top of every commission above)
- **Volume**: +$1,000 / +$2,500 / +$5,000 at 2 / 3 / 5 monthly flagship sales.
- **Retention**: +$1,000 / +$2,500 / +$5,000 when a retainer client extends 3 / 6 / 12 months.
- **Referral**: $500 when a recruited rep onboards, $7,000 on their first close, plus $500/sale override for 12 months.

# Commission rules (locked, never negotiate)
- Fixed-dollar payouts on flagships — no percentages, no tiers to chase, no caps.
- Recurring offers pay every month for the life of the subscription.
- No clawbacks on completed work. Paid within 7 days.

# Sales playbook (use these patterns)
1. **Lead with the leak**: "Most specialty manufacturers your size are bleeding 8–15% of revenue to invisible CRM and follow-up gaps. We diagnose where, in 21 days, fixed fee."
2. **Anchor the Diagnostic**: $18,000 21-Day Revenue Diagnostic is the gateway. Fixed fee. Written report. Applied toward the Retainer if they engage long-term.
3. **Free → entry → flagship → retainer path**: Free Leak Audit (/leak-audit) → $2,500 operator-led Leak Audit → $18,000 21-Day Diagnostic → $15,000/mo Retainer.
4. **Objection: "too expensive"** → reframe to monthly leak in dollars. The Diagnostic pays for itself if it finds one fixable leak >$1,500/mo.
5. **Objection: "not sure we need it"** → send the free /leak-audit scan first. Their result is the wedge.
6. **Objection: "we already have a CRM"** → "Great. We're not selling a CRM. We're auditing what's leaking out of yours."
7. **Always close with a next step**: book a call, send the free scan link, or quote the $18,000 Diagnostic.

# What you can do for the rep
- Coach them through a live objection (give exact words to say next).
- Write a follow-up email / LinkedIn DM / cold-call opener tailored to a prospect they describe.
- Recommend which offer to pitch based on the prospect's size + pain.
- Calculate their commission on a specific scenario (use fixed-dollar amounts above).
- Explain any product/service in plain English so they can pitch it.

# Hard rules
- Never invent stats or testimonials. If you don't know, say so.
- Never quote prices outside the offers above.
- Never promise delivery timelines beyond what's listed (Diagnostic = 21 days; Retainer starts month 1).
- Never reference the old "$2,900 14-Day Forensic Diagnostic" or "Fractional CTO/CMO" — those offers are retired.
- After every reply, append on its own line:
  <suggestions>["next question 1","next question 2","next question 3"]</suggestions>
  Each ≤ 7 words, in first person as the rep would ask next.`;

const PARTNER_ADDENDUM = `

# PARTNER MODE
You are speaking with a **business partner** (Braden Roberts), not a regular rep. They have wider visibility:
- Same sales coaching as above.
- Their cut on flagships: **$3,000 per Diagnostic + $3,000/month per active Retainer client** (every month, recurring).
- They earn the referral override: $500/sale override for 12 months on every rep they recruit.
- PLUS access to live company-wide read-only tools listed below — call them when asked about totals, all reps, recent leads, etc.
- Never expose admin-only data (tuning configs, code proposals, raw HubSpot tokens). Keep answers operator-tight.`;

const PARTNER_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_company_summary",
      description: "Live company-wide totals: total reps active, sum of rep sales (cents), sum commission paid (cents), leads in last 30d, contact submissions in last 30d, blog posts published, drip prospects active.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_all_reps",
      description: "List every active rep with name, code, total sales, total commission, role.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_leads",
      description: "Most recent diagnostic + assessment leads (combined). Args: limit (default 10, max 50).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_contact_submissions",
      description: "Most recent contact-form submissions. Args: limit (default 10, max 50).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
        required: [],
      },
    },
  },
  SHARED_TOOL_SCHEMAS.hubspot_mirror_search,
];

// Tools every authenticated portal user (rep or partner) can use for live info.
const REP_LIVE_TOOLS = [
  SHARED_TOOL_SCHEMAS.web_search,
  SHARED_TOOL_SCHEMAS.search_content_library,
];

const limit = (n: unknown, def: number, max: number) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return def;
  return Math.min(Math.floor(v), max);
};

async function runPartnerTool(sb: any, name: string, args: Record<string, unknown>) {
  if (name === "get_company_summary") {
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [reps, salesAgg, leadsD, leadsA, contacts, blog, drip] = await Promise.all([
      sb.from("rep_codes").select("*", { count: "exact", head: true }).eq("is_active", true),
      sb.from("rep_codes").select("total_sales_cents,total_commission_cents").eq("is_active", true),
      sb.from("diagnostic_leads").select("*", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("assessment_leads").select("*", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("contact_submissions").select("*", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("blog_posts").select("*", { count: "exact", head: true }).eq("is_published", true),
      sb.from("drip_prospects").select("*", { count: "exact", head: true }).neq("status", "completed"),
    ]);
    const sales = (salesAgg.data || []).reduce(
      (acc: any, r: any) => ({
        sales: acc.sales + (r.total_sales_cents || 0),
        comm: acc.comm + (r.total_commission_cents || 0),
      }),
      { sales: 0, comm: 0 },
    );
    return {
      active_reps: reps.count || 0,
      total_rep_sales_usd: (sales.sales / 100).toFixed(2),
      total_commission_paid_usd: (sales.comm / 100).toFixed(2),
      diagnostic_leads_30d: leadsD.count || 0,
      assessment_leads_30d: leadsA.count || 0,
      contact_submissions_30d: contacts.count || 0,
      blog_posts_published: blog.count || 0,
      drip_prospects_active: drip.count || 0,
    };
  }

  if (name === "list_all_reps") {
    const { data, error } = await sb.from("rep_codes")
      .select("code,rep_name,rep_email,role,commission_rate,total_sales_cents,total_commission_cents,is_active")
      .eq("is_active", true)
      .order("total_sales_cents", { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      total_sales_usd: ((r.total_sales_cents || 0) / 100).toFixed(2),
      total_commission_usd: ((r.total_commission_cents || 0) / 100).toFixed(2),
    }));
  }

  if (name === "list_recent_leads") {
    const lim = limit(args.limit, 10, 50);
    const [d, a] = await Promise.all([
      sb.from("diagnostic_leads").select("name,email,company,total_score,created_at")
        .order("created_at", { ascending: false }).limit(lim),
      sb.from("assessment_leads").select("name,email,company,score,created_at")
        .order("created_at", { ascending: false }).limit(lim),
    ]);
    return {
      diagnostic_leads: d.data || [],
      assessment_leads: a.data || [],
    };
  }

  if (name === "list_recent_contact_submissions") {
    const lim = limit(args.limit, 10, 50);
    const { data, error } = await sb.from("contact_submissions")
      .select("name,email,company,phone,service_interest,message,is_read,created_at")
      .order("created_at", { ascending: false }).limit(lim);
  if (name === "web_search") return webSearch(String(args.query || ""), Number(args.limit) || 5);
  if (name === "search_content_library") return searchContentLibrary(sb, String(args.query || ""));
  if (name === "hubspot_mirror_search") return hubspotMirrorSearch(sb, String(args.query || ""), (args.type as any) || "all");

  return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getPortalTokenFromRequest(req);
    const claims = await verifyPortalToken(token, SERVICE_KEY);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isPartner = claims.role === "partner";
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json() as { messages: Array<{ role: string; content: any }> };
    const systemPrompt = COACH_PROMPT + (isPartner ? PARTNER_ADDENDUM : "");
    const convo: any[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Rep code (do not reveal): ${claims.code}` },
      ...body.messages,
    ];

    const tools = isPartner ? [...PARTNER_TOOLS, ...REP_LIVE_TOOLS] : REP_LIVE_TOOLS;

    for (let round = 0; round < 4; round++) {
      const aiBody: Record<string, unknown> = {
        model: "google/gemini-3-flash-preview",
        messages: convo,
        tools,
        tool_choice: "auto",
      };

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiBody),
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
        console.error("rep-assistant AI gateway error:", aiRes.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiRes.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) {
        return new Response(JSON.stringify({ error: "Empty AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        convo.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });
        for (const call of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try { parsedArgs = JSON.parse(call.function.arguments || "{}"); } catch { /* ignore */ }
          let result: unknown;
          try {
            result = await runPartnerTool(sb, call.function.name, parsedArgs);
          } catch (e) {
            result = { error: e instanceof Error ? e.message : "tool error" };
          }
          convo.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result).slice(0, 12000),
          });
        }
        continue;
      }

      return new Response(JSON.stringify({ content: msg.content || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ content: "I hit my reasoning limit. Try rephrasing." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rep-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
});


