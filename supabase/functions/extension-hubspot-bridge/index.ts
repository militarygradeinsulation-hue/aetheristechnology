// Aetheris extension HubSpot bridge.
// Modes:
//   - "dom"     : extension scraped the current HubSpot page; we run forensic analysis on it.
//   - "api"     : extension fetched HubSpot's private endpoints via the user's session cookie
//                 (no API key needed) and forwarded the JSON; we summarize + flag leaks.
// Access is gated by a rep_codes / claim_codes lookup so it works for Joseph, reps, and paying clients.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are the Aetheris Forensic Operator running a CRM AUTOPSY on HubSpot data.
You receive either scraped DOM from the user's open HubSpot tab, or JSON pulled from HubSpot's private
endpoints via the user's own browser session. Treat it as raw evidence.

Find the leaks. Mirror the same forensic patterns used in our SQL detectors:
- Stalled deals (no activity > stage average)
- Dead leads (MQL/SQL with no activity in 60+ days)
- Slow follow-up (form fills with > 4h response gap)
- Closed-lost worth reactivating (lost > 6 months, > $1k)
- Missing contact info on > $5k deals
- High-intent contacts not in a workflow
- Owner overload (one rep carrying 3x avg)
- Stuck proposals (proposal_sent, no activity 30d+)

OUTPUT STRICT JSON:
{
  "summary": "one tight sentence naming the biggest CRM leak right now",
  "totalExposureUSD": <integer>,
  "leaks": [{
    "id": "string",
    "title": "string",
    "severity": "critical|warning|info",
    "category": "stalled|dead|followup|reactivation|missing_info|workflow|overload|proposal|other",
    "objectType": "contacts|companies|deals|tickets|other",
    "recordIds": ["hubspot record ids cited from the evidence (max 10 strings)"],
    "count": <integer or null>,
    "exposureUSD": <integer>,
    "evidence": "1-2 sentence quote/measurement from the data",
    "fix": "1 sentence: the exact next action",
    "fixAction": {
      "op": "click|note|workflow|export|reassign|patch|null",
      "target": "selector or HubSpot screen name",
      "value": "what to do",
      "patch": { "property": "value to write back if op=patch" }
    } | null
  }],
  "repScript": {
    "opener": "30-second opener if the operator calls this CRM owner",
    "discovery": ["3 forensic questions tied to the leaks above"],
    "close": "one-sentence ask"
  },
  "nextThreeActions": ["3 specific things to do in HubSpot in the next 30 minutes"]
}

RULES:
- USD only. No emojis. No em dashes. Blunt, present tense.
- Specific to THIS user's pipeline, not generic CRM advice.
- If data is sparse, say so in summary and still return at least 2 leaks with evidence "limited sample".`;

const ipBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string, limit = 30, windowMs = 3600_000): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || b.reset < now) { ipBuckets.set(ip, { count: 1, reset: now + windowMs }); return false; }
  if (b.count >= limit) return true;
  b.count++; return false;
}

async function validateAccess(code: string): Promise<{ ok: boolean; kind?: string }> {
  if (!code || code.length < 3) return { ok: false };
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  // Rep code first
  const { data: rep } = await sb.from("rep_codes").select("code,is_active").eq("code", code).maybeSingle();
  if (rep?.is_active) return { ok: true, kind: "rep" };
  // Claim code (paying client)
  const { data: claim } = await sb.from("claim_codes").select("code").eq("code", code).maybeSingle();
  if (claim) return { ok: true, kind: "client" };
  return { ok: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) return json({ error: "Rate limit reached. Try again in an hour." }, 429);

    const body = await req.json().catch(() => ({}));
    const accessCode = String(body?.accessCode || "").trim().toUpperCase();
    const access = await validateAccess(accessCode);
    if (!access.ok) return json({ error: "Invalid access code. Enter a rep code or your client unlock code." }, 401);

    const mode = body?.mode === "api" ? "api" : "dom";
    const url = String(body?.url || "");
    const payload = body?.payload ?? null;
    if (!payload) return json({ error: "payload required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Truncate large payloads
    const serialized = JSON.stringify(payload).slice(0, 60000);
    const ctx = `MODE: ${mode}\nHUBSPOT URL: ${url}\nACCESS KIND: ${access.kind}\n\nEVIDENCE:\n${serialized}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("HubSpot bridge AI error", r.status, t);
      if (r.status === 429) return json({ error: "AI rate limited." }, 429);
      if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
      throw new Error(`AI gateway ${r.status}`);
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: raw, leaks: [] }; }
    if (!Array.isArray(parsed.leaks)) parsed.leaks = [];
    const portalId = String(body?.portalId || "").replace(/[^0-9]/g, "") || null;
    return json({ ...parsed, accessKind: access.kind, portalId });
  } catch (e) {
    console.error("extension-hubspot-bridge error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
