// chaos-scan — Fetches a target URL, extracts readable text, then asks the
// Lovable AI Gateway to produce a "chaos map" describing likely operational
// leaks, hidden contradictions, and the single source feeding them. Used by
// the admin Chaos Scan tool to power a live mind-map visualization.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchReadableText(url: string): Promise<{ title: string; text: string; domain: string }> {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  let html = "";
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AetherisChaosScan/1.0; +https://aetheris.technology)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await r.text();
  } catch (e) {
    console.warn("fetch failed", e);
  }
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : domain;
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: stripped.slice(0, 8000), domain };
}

const SYSTEM = `You are the Business Forensics Operator running a Chaos Map on a company's website.
Your job is to expose the hidden interconnections between symptoms and pinpoint the ONE upstream source that feeds them all.
Voice: blunt, forensic, operator — never corporate. Use plain concrete words. USD only ($).`;

function buildPrompt(url: string, title: string, text: string) {
  return `TARGET URL: ${url}
PAGE TITLE: ${title}

RAW EXTRACTED COPY (truncated):
"""
${text}
"""

Read the site like a detective. Infer the business model, buyer, and how their operation likely leaks money.

Return STRICT JSON of shape:
{
  "company": "short human name of the business",
  "vertical": "1-3 word industry label",
  "url": "${url}",
  "source": {
    "label": "2-4 word name of the single upstream cause feeding every symptom (e.g. 'Untracked handoffs')",
    "chaos": "one blunt sentence: what it costs them today.",
    "sealed": "one blunt sentence: what changes when it's closed.",
    "dollar_leak": "$X.XXk-$X.XXk / mo estimated bleed range"
  },
  "operators": [
    { "id": "scan",  "label": "Scan",  "body": "one sentence: what a forensic audit would surface on this specific business." },
    { "id": "price", "label": "Price", "body": "one sentence: how the leaks would be quantified in dollars." },
    { "id": "fix",   "label": "Fix",   "body": "one sentence: what the first fix ships for this business." }
  ],
  "symptoms": [
    {
      "id": "kebab-case-id",
      "label": "2-4 word symptom name",
      "icon": "ghost | trending-down | unplug | wallet | flame | zap | alert | eye-off | phone-off | receipt | clock | scale",
      "anchor": "scan | price | fix",
      "chaos": "one blunt sentence naming the specific pain on THIS business.",
      "fixed": "one blunt sentence naming what changes once the source is sealed.",
      "connections": ["other-symptom-id", "other-symptom-id"]
    }
  ],
  "contradictions": [
    "one-sentence contradiction the site reveals (e.g. 'Claims 24/7 response but no live channel is offered').",
    "another contradiction",
    "another"
  ]
}

RULES:
- Return 6-8 symptoms. Every symptom must reference this specific business, not generic filler.
- Each symptom must list 1-3 "connections" to other symptom ids so the mind map has real cross-links.
- Distribute anchors across scan / price / fix (roughly balanced).
- "source.label" must be ONE root cause, not a list.
- 2-4 contradictions max.
- Output JSON only. No prose, no markdown fences.`;
}

async function synthesize(url: string, title: string, text: string) {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(url, title, text) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`AI gateway ${r.status}: ${body}`);
  }
  const j = await r.json();
  const raw = j.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const raw = String(body?.url || "").trim();
    if (!raw) return json({ error: "Missing url" }, 400);
    const url = normalizeUrl(raw);
    if (!url) return json({ error: "Invalid url" }, 400);

    const page = await fetchReadableText(url);
    const map = await synthesize(url, page.title, page.text);

    return json({
      ok: true,
      url,
      domain: page.domain,
      title: page.title,
      map,
    });
  } catch (e) {
    console.error("chaos-scan error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
