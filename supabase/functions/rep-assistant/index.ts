// Rep / Partner Sales Coach assistant.
// - Auth: HMAC portal token (rep or partner role).
// - Reps: scoped lead lookups, library search, web search, and navigation.
// - Partners: additional authorized read-only company-wide tools.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { SHARED_TOOL_SCHEMAS, webSearch, searchContentLibrary, hubspotMirrorSearch } from "../_shared/operator-tools.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { classifyIndustryHeuristic } from "../_shared/industry-intelligence.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COACH_PROMPT = `You are **Aetheris Nexus** — a single private chat that combines four roles for a sales rep selling Aetheris services: (1) **Sales Advisor** (pitch, positioning, discovery), (2) **Sales Coach** (live objections, exact words, tone), (3) **Trainer** (drills, quizzes, playbook mastery, certification prep), and (4) **Nexus** (live company + lead intelligence when the rep asks for numbers). You are NOT a generic chatbot and NOT the public sales chat.

# Mode routing (silent — never announce the mode)
- Pitch / positioning / "how do I sell X" → Advisor.
- Live objection / rewrite this email / "coach me through…" → Coach.
- "Quiz me", "drill me", "test me", "explain X so I remember it" → Trainer (ask 1 question at a time, grade the answer, move on).
- "Show my leads", "company summary", "recent submissions", forecast, totals → Nexus (use the live tools).
- If the request spans modes, blend them. Never make the rep pick a mode.

# Voice
- Direct. Operator tone. Forensic, not corporate. No fluff, no emojis.
- Short answers (1–4 sentences) unless the rep asks for a script, breakdown, or drill.
- Always tie advice to closing the next sale.

# Brand & positioning (memorize)
- Aetheris AI / aetheris.technology — **Chaos Theory Forensics Operator**.
- Hook: "Your business is leaking. You just can't see it from the inside."
- Methodology: **The Leak Audit™** (7 steps). Free self-scan: aetheris.technology/leak-audit.
- Owner-operator: Joseph Toney. Indianapolis-based, serves nationwide.

# FLAGSHIP OFFERS (memorize — these drive 90% of rep income)

**1. 21-Day Revenue Diagnostic — $18,000 one-time** ← anchor offer
- Fixed-fee forensic audit. CRM-agnostic. Specialty manufacturers $5M–$25M.
- 12-month CRM snapshot, lead-to-contact + follow-up + deal-stage leak analysis.
- 15–30 page written findings report, ROI projections, 60-minute readout.
- **Rep cut: $5,000 per close.** Partner (Braden): $3,000. Company: $10,000.

**2. Active Case — $20,000/month, 3-month minimum** ← biggest residual
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
- **Retention**: +$1,000 / +$2,500 / +$5,000 when a active case client extends 3 / 6 / 12 months.
- **Referral**: $500 when a recruited rep onboards, $7,000 on their first close, plus $500/sale override for 12 months.

# Commission rules (locked, never negotiate)
- Fixed-dollar payouts on flagships — no percentages, no tiers to chase, no caps.
- Recurring offers pay every month for the life of the subscription.
- No clawbacks on completed work. Paid within 7 days.

# Sales playbook (use these patterns)
1. **Lead with the leak**: "Most specialty manufacturers your size are bleeding 8–15% of revenue to invisible CRM and follow-up gaps. We diagnose where, in 21 days, fixed fee."
2. **Anchor the Diagnostic**: $18,000 21-Day Revenue Diagnostic is the gateway. Fixed fee. Written report. Applied toward the Active Case if they engage long-term.
3. **Free → entry → flagship → active case path**: Free Leak Audit (/leak-audit) → $2,500 operator-led Leak Audit → $18,000 21-Day Diagnostic → $20,000/mo Active Case.
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
- Never promise delivery timelines beyond what's listed (Diagnostic = 21 days; Active Case starts month 1).
- Never reference the old "$2,900 14-Day Forensic Diagnostic" or "Fractional CTO/CMO" — those offers are retired.
- After every reply, append on its own line:
  <suggestions>["next question 1","next question 2","next question 3"]</suggestions>
  Each ≤ 7 words, in first person as the rep would ask next.`;

const PARTNER_ADDENDUM = `

# PARTNER MODE
You are speaking with a **business partner** (Braden Roberts), not a regular rep. They have wider visibility:
- Same sales coaching as above.
- Their cut on flagships: **$3,000 per Diagnostic + $3,000/month per active Active Case client** (every month, recurring).
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

const PORTAL_NAV_TARGETS: Record<string, { label: string; path: string }> = {
  leads: { label: "My leads", path: "/portal?tab=leads" },
  coach: { label: "Coach", path: "/portal?tab=coach" },
  training: { label: "Training", path: "/portal?tab=training" },
  calendar: { label: "Calendar", path: "/portal?tab=calendar" },
  meetings: { label: "Executive meetings", path: "/portal?tab=meetings" },
  workspace: { label: "Workspace", path: "/portal?tab=workspace" },
  playbook: { label: "Playbook", path: "/portal?tab=playbook" },
  golden_reports: { label: "Golden Report Library", path: "/portal/legacy?tab=tools&tool=golden-report" },
};
const PORTAL_READ_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_my_clients",
      description: "Look up real leads and client contact information visible to the signed-in rep. Partners may search all leads. Read only. Never guess a phone or email.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "integer", maximum: 20 } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_golden_reports",
      description: "Find saved Golden Report company records and their known or inferred industry, with report count and secure in-portal navigation. No private report payloads or client secrets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, industry: { type: "string" }, limit: { type: "integer", maximum: 20 } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_portal_section",
      description: "Offer a navigable portal section to the user. Only approved sections are available. Return a clickable action; never fabricate a portal control or mutate data.",
      parameters: {
        type: "object",
        properties: { section: { type: "string", enum: Object.keys(PORTAL_NAV_TARGETS) } },
        required: ["section"],
      },
    },
  },
];

const REP_LIVE_TOOLS = [
  SHARED_TOOL_SCHEMAS.web_search,
  SHARED_TOOL_SCHEMAS.search_content_library,
  ...PORTAL_READ_TOOLS,
];

const limit = (n: unknown, def: number, max: number) => {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return def;
  return Math.min(Math.floor(v), max);
};

async function runPartnerTool(sb: any, name: string, args: Record<string, unknown>, claims: { code: string; role: string }) {
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
    if (error) throw error;
    return data || [];
  }

  if (name === "open_portal_section") {
    const section = String(args.section || "");
    const destination = PORTAL_NAV_TARGETS[section];
    if (!destination) return { error: "Unknown portal section" };
    return { navigation: destination, requires_user_click: true };
  }
  if (name === "search_my_clients") {
    const term = String(args.query || "").trim().replace(/[%,()]/g, "").slice(0, 100);
    if (term.length < 2) return { error: "Search needs at least two characters" };
    let q = sb.from("rep_leads")
      .select("id,business_name,contact_name,email,phone,website,industry,status,claimed_by_code")
      .or(`business_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(limit(args.limit, 10, 20));
    if (claims.role !== "partner") q = q.eq("claimed_by_code", claims.code);
    const { data, error } = await q;
    if (error) return { error: "Client lookup failed" };
    return { clients: (data || []).map((r: any) => ({
      name: r.contact_name, company: r.business_name, email: r.email,
      phone: r.phone, website: r.website, industry: r.industry,
      status: r.status,
    })), scope: claims.role === "partner" ? "partner_visible" : "my_claimed_leads" };
  }
  if (name === "search_golden_reports") {
    const term = String(args.query || "").trim().replace(/[%,()]/g, "").slice(0, 100);
    const industry = String(args.industry || "").trim().slice(0, 90);
    if (!term && !industry) return { error: "Supply a company, industry, or keyword" };
    // Only return a small public-facing summary. This does not expose the
    // complete report, private intake records, or other reps' contact records.
    const { data, error } = await sb.from("golden_report_companies")
      .select("id,display_name,primary_domain,website_url,industry,business_summary")
      .limit(2000);
    if (error) return { error: "Golden Report lookup failed" };
    const matches = (data || []).map((r: any) => {
      const guess = r.industry ? null : classifyIndustryHeuristic({
        companyName: r.display_name, domain: r.primary_domain,
        websiteUrl: r.website_url, reportEvidence: r.business_summary,
      });
      return {
        company: r.display_name, domain: r.primary_domain || r.website_url,
        industry: r.industry || (guess && guess.confidence >= 0.73 ? guess.industry : null) || "Unclassified",
        industry_inferred: !r.industry && !!guess && guess.confidence >= 0.73,
        navigation: PORTAL_NAV_TARGETS.golden_reports,
      };
    }).filter((r: any) =>
      (!industry || r.industry.toLowerCase().includes(industry.toLowerCase())) &&
      (!term || [r.company, r.domain, r.industry].some((v: string) => String(v || "").toLowerCase().includes(term.toLowerCase())))
    ).slice(0, limit(args.limit, 10, 20));
    return { reports: matches, note: "Search covers saved company summaries only; open the authenticated library for complete reports." };
  }

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

    // Dean Young (rep 482917) gets partner-tier Nexus access — full tool set + addendum.
    const isPartner = claims.role === "partner" || claims.code === "482917";
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json() as { messages: Array<{ role: string; content: any }>; activeLeadId?: string | null };
    const systemPrompt = COACH_PROMPT + (isPartner ? PARTNER_ADDENDUM : "") + `
# Portal controls and research
Use search_my_clients for private lead or contact questions. It enforces claimed-lead scope for reps. Never invent a person's phone number, email, or relationship status.
Use search_golden_reports for company case file searches. Clearly label any unclassified industry.
Use open_portal_section to take the user to an available portal tab; the application renders a clickable navigation control, not a data-changing operation.
Use web_search for current online facts and provide source URLs. Cite retrieved URLs in your answer and distinguish them from internal records. If no results or web search is unavailable, disclose that.
You cannot modify records, download files, publish posts, send messages, or operate every widget through chat yet. Do not claim those actions succeeded. Offer a navigation control when needed.
Never reveal HMAC tokens, internal client records outside the caller's scope, or private report payloads.
`;
    const convo: any[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Rep code (do not reveal): ${claims.code}` },
    ];

    // --- Pull active-lead context server-side so we always have the freshest scan + leak progress.
    if (body.activeLeadId) {
      try {
        const q = sb
          .from("rep_leads")
          .select("id,business_name,contact_name,email,phone,website,industry,location,status,touch_count,last_touched_at,notes,enrichment,claimed_by_code")
          .eq("id", body.activeLeadId);
        // Reps can only see leads they've claimed. Partners can see any lead.
        if (claims.role !== "partner") q.eq("claimed_by_code", claims.code);
        const { data: lead } = await q.maybeSingle();

        if (lead) {
          const scan: any = (lead.enrichment as any)?.scan || {};
          const progress: Record<string, any> = scan.gapProgress || {};
          const gaps: any[] = Array.isArray(scan.gaps) ? scan.gaps : [];
          const leakLines = gaps.length
            ? gaps.map((g: any, i: number) => {
                const p = progress[String(i)] || {};
                const status = p.checked ? "CLOSED" : "OPEN";
                const touches = Array.isArray(p.touches) ? p.touches.slice(-3) : [];
                const touchLine = touches.length
                  ? ` · touches: ${touches.map((t: any) => `[${new Date(t.at).toLocaleDateString()}] ${t.note}`).join(" | ")}`
                  : "";
                return `  ${i + 1}. [${status}] ${g.title} (${g.category}, ${g.severity || "n/a"}) — cost ${g.annualCost}, fix: ${g.recommendedFix}, ROI ${g.projectedROI}${touchLine}`;
              }).join("\n")
            : "  (no leaks scanned yet — recommend the rep run a Deep Scan first)";
          const openCount = gaps.filter((_g, i) => !progress[String(i)]?.checked).length;
          const closedCount = gaps.length - openCount;

          const leadBlock = `ACTIVE LEAD CONTEXT (the rep is working this lead right now — base every answer on these facts and never invent details):
- Business: ${lead.business_name || "unknown"}
- Contact: ${lead.contact_name || "unknown"} <${lead.email || "no-email"}>${lead.phone ? ` · ${lead.phone}` : ""}
- Website: ${lead.website || "n/a"} · Industry: ${lead.industry || "n/a"} · Location: ${lead.location || "n/a"}
- Pipeline status: ${lead.status || "new"} · Touches: ${lead.touch_count ?? 0}${lead.last_touched_at ? ` (last ${new Date(lead.last_touched_at).toLocaleDateString()})` : ""}
- Scan score: ${scan.score ?? "n/a"} (${scan.grade || "—"}) · Leaks ${openCount} open / ${closedCount} closed
- Executive summary: ${scan.executiveSummary || "—"}
- Rep notes: ${lead.notes || "—"}
Leaks:
${leakLines}

When the rep asks you to draft an email, DM, or call script: lead with the highest-cost OPEN leak, name the specific dollar figure, and close with a single clear ask (15-min Leak Audit call or the $18,000 Diagnostic, whichever fits the size). Do NOT mention leaks the rep already marked CLOSED unless they explicitly ask. Personalize using the contact's first name and the business name. Keep all drafts under 110 words unless asked otherwise.`;
          convo.push({ role: "system", content: leadBlock });
        }
      } catch (e) {
        console.error("rep-assistant active lead fetch failed:", e);
      }
    }

    // Never trust conversation roles supplied by the browser; system/tool
    // messages are reserved for the authenticated server and model results.
    const cleanHistory = Array.isArray(body.messages)
      ? body.messages.filter((m: any) => ["user", "assistant"].includes(m?.role))
          .slice(-20).map((m: any) => ({
            role: m.role,
            content: typeof m.content === "string"
              ? m.content.slice(0, 12000)
              : Array.isArray(m.content) ? m.content.slice(0, 4) : "",
          }))
      : [];
    convo.push(...cleanHistory);


    const tools = isPartner ? [...PARTNER_TOOLS, ...REP_LIVE_TOOLS] : REP_LIVE_TOOLS;
    const permittedTools = new Set(tools.map((tool: any) => tool.function.name));

    for (let round = 0; round < 4; round++) {
      let routed;
      try {
        routed = await routedChatCompletion({
          tier: "bulk",
          messages: convo,
          tools,
          tool_choice: "auto",
        });
      } catch (e: any) {
        const status = e?.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("rep-assistant AI error:", e?.message);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const msg = routed.message;
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
            result = permittedTools.has(call.function.name)
              ? await runPartnerTool(sb, call.function.name, parsedArgs, { code: claims.code, role: claims.role })
              : { error: "Tool not permitted for this portal session" };
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

      const navigation = [...convo].reverse()
        .filter((entry: any) => entry.role === "tool" && typeof entry.content === "string")
        .map((entry: any) => { try { return JSON.parse(entry.content)?.navigation; } catch { return null; } })
        .find((nav: any) => nav && Object.values(PORTAL_NAV_TARGETS).some((x) => x.path === nav.path));
      return new Response(JSON.stringify({ content: msg.content || "", navigation: navigation || null }), {
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
});



