// Pass B AI judgment for the Aetheris extension.
// Receives Pass A findings + DOM text + viewport screenshot. Returns extra
// "judgment" leaks (messaging clarity, trust, funnel logic) the rules can't see.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are the Aetheris Forensic Operator (Pass B).
You receive: (1) the URL and host, (2) a deterministic leak list already found by Pass A,
(3) the rendered DOM text (truncated), (4) sometimes a viewport screenshot.
Your job: surface JUDGMENT leaks that rules can't catch — messaging clarity, trust signals,
funnel logic, "where would a buyer bail." Do NOT repeat anything Pass A already listed.

Return STRICT JSON:
{
  "summary": "one short forensic paragraph naming the biggest judgment risk",
  "leaks": [
    { "id": "ai_<short-slug>", "severity": "critical|warning|info", "category": "Messaging|Trust|Funnel|Positioning",
      "title": "...", "why": "...", "fix": "...", "selectors": [] }
  ]
}
Max 4 leaks. USD only when discussing money. No emojis. No hashtags. No em dashes.`;

const ipBuckets = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string, limit = 20, windowMs = 3600_000): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || b.reset < now) { ipBuckets.set(ip, { count: 1, reset: now + windowMs }); return false; }
  if (b.count >= limit) return true;
  b.count++; return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) return json({ error: "Rate limit reached." }, 429);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const url = String(body?.url || "");
    const host = String(body?.host || "");
    const pageText = String(body?.pageText || "").slice(0, 8000);
    const screenshot = typeof body?.screenshot === "string" && body.screenshot.startsWith("data:image/") ? body.screenshot : null;
    const passA = body?.passA || {};

    const ctx = `URL: ${url}\nHOST: ${host}\nPASS A LEAKS:\n${(passA.leaks || []).map((l: any) => `- [${l.severity}] ${l.title}`).join("\n") || "(none)"}\n\nDOM TEXT:\n${pageText}`;

    const userContent: any[] = [{ type: "text", text: ctx }];
    if (screenshot) userContent.push({ type: "image_url", image_url: { url: screenshot } });

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userContent }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("Pass B AI error", r.status, t);
      if (r.status === 429) return json({ error: "AI rate limited." }, 429);
      if (r.status === 402) return json({ error: "AI credits exhausted." }, 402);
      throw new Error(`AI gateway ${r.status}`);
    }
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content?.trim() || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: raw, leaks: [] }; }
    if (!Array.isArray(parsed.leaks)) parsed.leaks = [];
    parsed.leaks = parsed.leaks.slice(0, 4).map((l: any, i: number) => ({
      id: l.id || `ai_${i}`,
      severity: ["critical", "warning", "info"].includes(l.severity) ? l.severity : "warning",
      category: l.category || "Messaging",
      title: String(l.title || "").slice(0, 140),
      why: String(l.why || "").slice(0, 400),
      fix: String(l.fix || "").slice(0, 400),
      selectors: [],
    }));
    return json(parsed);
  } catch (e) {
    console.error("extension-leak-scan-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
