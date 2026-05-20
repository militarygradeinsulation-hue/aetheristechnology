// Detective Mode — forensic deduction + Aetheris-tone outreach for a single lead.
// Takes everything we know (scan, RocketReach, Firecrawl, lead row), picks the
// single highest-leverage angle, shows a transparent chain of reasoning
// (point A -> point B), then writes the perfect message in Aetheris voice.
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const SYSTEM_PROMPT = `You are the **Aetheris Detective** — a forensic sales operator working a single lead.

Your job: take every scrap of data on this lead (forensic scan, leak/gap list, contact intel, company facts, tech stack, services, role) and do real detective work.

# Aetheris voice (NON-NEGOTIABLE)
- Blunt. Operator. Forensic. No corporate fluff, no emojis, no em-dashes, no "I hope this finds you well."
- Plain words, short sentences. Read like a person who has already done the homework.
- Hook frame: "Your business is leaking. You just can't see it from the inside."
- Forbidden words: synergy, leverage, unlock, ecosystem, paradigm, optimize, circle back, touch base, just wanted to.
- Never invent stats. Use only numbers that appear in the provided data.

# How to think (this is the deduction chain you'll show)
Walk through it like a detective explaining a case:
1. **Observation** — one concrete data point you see (a number, a missing piece, a stage, a role).
2. **Inference** — what that data point actually means about how their business runs.
3. **Connection** — link it to the next data point so the picture compounds.
4. **Verdict** — the single biggest leak / gap you've decided to lead with, and WHY it beats the others.

Then: write the message that uses the verdict.

# Output — return ONLY valid JSON, no prose around it. Shape:
{
  "best_angle": {
    "title": "Short label for the angle, max 6 words",
    "leak_or_gap": "Exact phrase pulled from the data",
    "estimated_cost": "Dollar/yr figure if available, otherwise null",
    "why_this_one": "1-2 sentences. Why this beats every other angle in the data."
  },
  "deduction_chain": [
    { "step": 1, "from": "What I observed (point A)", "to": "What that tells me (point B)", "evidence": "The exact data fragment that proves it" },
    { "step": 2, "from": "...", "to": "...", "evidence": "..." }
  ],
  "deeper_forensics": [
    "Bullet — a second-order finding the rep should mention in the call/reply after the opener lands.",
    "Bullet — another."
  ],
  "message": {
    "channel": "email" | "linkedin",
    "subject": "Subject line (email only, else null)",
    "body": "The full message in Aetheris voice. 90-160 words for email, 50-90 for LinkedIn. Reference the specific finding + number. End with a soft next step (the free /leak-audit, the $2,500 Forensic Diagnostic, or a 15-min look). NEVER quote retainer first.",
    "why_it_lands": "1 sentence on why this exact phrasing is hard for this person to ignore."
  },
  "fallback_subjects": ["Alt subject 1", "Alt subject 2"]
}

If the data is thin (no scan, no contact name), still produce a chain — say so in the steps ("Observation: no forensic scan yet. Inference: I'm cold-pitching, so I lead with industry pattern, not specifics.") and write a message that asks for permission to scan.

Output JSON ONLY. No markdown fences. No commentary.`;

function buildDossier(payload: any): string {
  const { lead, scan, rocketreach, firecrawl } = payload || {};
  const lines: string[] = [];
  lines.push("=== LEAD ROW ===");
  lines.push(`Business: ${lead?.business_name || "(unknown)"}`);
  lines.push(`Contact: ${lead?.contact_name || "(unknown)"} | ${lead?.email || ""} | ${lead?.phone || ""}`);
  lines.push(`Website: ${lead?.website || ""}`);
  lines.push(`Industry: ${lead?.industry || ""} | Location: ${lead?.location || ""}`);
  lines.push(`Status: ${lead?.status || ""} | Touches: ${lead?.touch_count || 0}`);
  if (lead?.notes) lines.push(`Rep notes: ${String(lead.notes).slice(0, 600)}`);

  if (scan) {
    lines.push("\n=== FORENSIC SCAN ===");
    lines.push(`Score: ${scan.grade || ""} (${scan.score ?? "?"}/100)`);
    if (scan.executiveSummary) lines.push(`Executive summary: ${String(scan.executiveSummary).slice(0, 1500)}`);
    const gaps = Array.isArray(scan.gaps) ? scan.gaps : [];
    if (gaps.length) {
      lines.push("Leaks / gaps:");
      gaps.slice(0, 8).forEach((g: any, i: number) => {
        lines.push(`  ${i + 1}. ${g.title || g.name || "(untitled)"} — annual cost: ${g.annualCost || g.cost || "?"} — severity: ${g.severity || "?"}`);
        if (g.description) lines.push(`     ${String(g.description).slice(0, 300)}`);
      });
    }
  } else {
    lines.push("\n=== FORENSIC SCAN === (not run yet)");
  }

  if (rocketreach) {
    lines.push("\n=== CONTACT INTEL (RocketReach) ===");
    lines.push(`Name: ${rocketreach.name || ""}`);
    lines.push(`Title: ${rocketreach.title || ""} @ ${rocketreach.employer || ""}`);
    const emails = Array.isArray(rocketreach.emails) ? rocketreach.emails.slice(0, 3).map((e: any) => e.email || e).join(", ") : "";
    if (emails) lines.push(`Emails: ${emails}`);
    if (rocketreach.linkedin_url) lines.push(`LinkedIn: ${rocketreach.linkedin_url}`);
    const jobs = Array.isArray(rocketreach.job_history) ? rocketreach.job_history.slice(0, 4) : [];
    if (jobs.length) {
      lines.push("Job history:");
      jobs.forEach((j: any) => lines.push(`  - ${j.title || ""} @ ${j.company_name || j.employer || ""} (${j.start_date || ""}–${j.end_date || "now"})`));
    }
  }

  const fcJson = firecrawl?.json || firecrawl;
  if (fcJson) {
    lines.push("\n=== COMPANY INTEL (Firecrawl) ===");
    if (fcJson.legal_name) lines.push(`Legal name: ${fcJson.legal_name}`);
    if (fcJson.employee_count) lines.push(`Employees: ${fcJson.employee_count}`);
    if (fcJson.year_founded) lines.push(`Founded: ${fcJson.year_founded}`);
    const services = Array.isArray(fcJson.services) ? fcJson.services.slice(0, 8).join(", ") : "";
    if (services) lines.push(`Services: ${services}`);
    const tech = Array.isArray(fcJson.tech_stack) ? fcJson.tech_stack.slice(0, 10).join(", ") : "";
    if (tech) lines.push(`Tech stack: ${tech}`);
    if (fcJson.tagline) lines.push(`Tagline: ${fcJson.tagline}`);
    if (fcJson.about) lines.push(`About: ${String(fcJson.about).slice(0, 600)}`);
  }
  return lines.join("\n").slice(0, 12000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const portalTok = getPortalTokenFromRequest(req);
    const portalClaims = portalTok ? await verifyPortalToken(portalTok, SERVICE) : null;
    const adminTok = getAdminTokenFromRequest(req);
    const adminOk = adminTok ? await verifyAdminToken(adminTok, SERVICE) : false;
    if (!portalClaims && !adminOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dossier = buildDossier(body);
    const channel = body?.channel === "linkedin" ? "linkedin" : "email";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Preferred channel: ${channel}\n\n=== DOSSIER ===\n${dossier}\n\nReturn the JSON now.` },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const txt = await res.text().catch(() => "");
      throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { error: "AI returned invalid JSON" };
    }

    return new Response(JSON.stringify({ ok: true, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
