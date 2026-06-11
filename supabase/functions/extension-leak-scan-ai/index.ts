// Pass B "Detective Mode" dossier for the Aetheris extension.
// Receives Pass A findings + DOM text + viewport screenshot. Returns a structured
// forensic dossier (suspect/motive/evidence/verdict/confession), an estimated
// annual leak in USD, and judgment leaks the deterministic rules can't see.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are the Aetheris Forensic Operator running DETECTIVE MODE on the current page.
You receive: (1) the URL and host, (2) deterministic leak list from Pass A, (3) rendered DOM text (truncated),
(4) usually a viewport screenshot, (5) page-level signals (trackers, pricing visibility, proof, etc.).

Your job is a forensic dossier. NOT a list of suggestions. A case file.

VOICE:
- Blunt. Operator-grade. Present tense. No hedging.
- USD only ("$"). No emojis. No hashtags. No em dashes. No hype words.
- Pattern-claiming language: "leaks", "bleeds", "capture path", "mechanism", "the page is doing X".
- Do NOT pitch services. Do NOT name Aetheris/Leak Audit/Diagnostic.

OUTPUT STRICT JSON, no prose outside the JSON:
{
  "summary": "one tight sentence naming the biggest pattern of revenue loss on this page",
  "dossier": {
    "suspect": "the single dominant revenue-killing pattern on this page (one sentence)",
    "motive": "why this page bleeds money (1-2 sentences, mechanism-level)",
    "evidence": [
      "specific, quoted, or measured observation #1",
      "specific observation #2",
      "specific observation #3",
      "specific observation #4"
    ],
    "verdict": "one sentence ruling on severity and where it ranks vs the rest of the page",
    "confession": "the exact rewrite, restructure, or sequence the page needs (3-5 specific actions, numbered)"
  },
  "leakValueUSD": { "low": <integer dollars per year>, "high": <integer dollars per year> },
  "priorityFix": "the ONE change to ship this week, in one sentence",
  "leaks": [
    {
      "id": "ai_<slug>",
      "severity": "critical|warning|info",
      "category": "Messaging|Trust|Funnel|Positioning|Proof|Offer|Pricing",
      "title": "short forensic label",
      "why": "1-2 sentences naming the mechanism of loss",
      "fix": "1 sentence with the specific repair",
      "selectors": ["<css selector for the offending element on the page, if any>"],
      "fixAction": {
        "op": "replaceText | setHTML | hide | setStyle | injectBanner | injectCTA | replaceAttr",
        "selector": "<css selector of the element to mutate, REQUIRED for replaceText/setHTML/hide/setStyle/replaceAttr>",
        "value": "<the new text / HTML / CTA label, or a JSON style object for setStyle, or {attr,value} for replaceAttr>",
        "where": "top|bottom (only for injectBanner/injectCTA)"
      }
    }
  ]
}

RULES:
- 3-6 judgment leaks. Do NOT repeat anything Pass A already listed by title.
- Evidence MUST quote or cite something from the actual DOM text or screenshot. Generic platitudes are rejected.
- Confession MUST be specific to THIS page (the actual offer, the actual headline, the actual CTA), not generic copy advice.
- For EVERY leak that has a visible element on the page, populate "selectors" AND "fixAction" so the operator can apply the repair in-place. Prefer stable selectors (h1, header h2, [data-cta], main button:first-of-type, section:nth-of-type(2) p). If you cannot reasonably target the element, set fixAction to null.
- "replaceText" = swap the textContent. "setHTML" = swap innerHTML (use sparingly). "hide" = display:none. "setStyle" value must be a JSON object of CSS props. "injectBanner" inserts a top/bottom amber banner with value as the message. "injectCTA" inserts a floating CTA button labeled value.
- leakValueUSD low/high should reflect the company's apparent size and the severity of leaks combined. Use integers, no commas.`;

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
    if (rateLimited(ip)) return json({ error: "Rate limit reached. Try again in an hour." }, 429);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const url = String(body?.url || "");
    const host = String(body?.host || "");
    const pageText = String(body?.pageText || "").slice(0, 10000);
    const screenshot = typeof body?.screenshot === "string" && body.screenshot.startsWith("data:image/") ? body.screenshot : null;
    const passA = body?.passA || {};

    const signals = {
      score: passA.score,
      grade: passA.grade,
      trackersPresent: passA.trackersPresent || [],
      trackersMissing: passA.trackersMissing || [],
      weightKB: passA.weightKB,
      scriptCount: passA.scriptCount,
      hasPhone: passA.hasPhone,
      hasEmail: passA.hasEmail,
      hasProof: passA.hasProof,
      hasPricing: passA.hasPricing,
      title: passA.title,
      metaDescription: passA.metaDescription,
    };

    const ctx = [
      `URL: ${url}`,
      `HOST: ${host}`,
      `SIGNALS: ${JSON.stringify(signals)}`,
      `PASS A LEAKS:`,
      (passA.leaks || []).map((l: any) => `- [${l.severity}] ${l.title} — ${l.why}`).join("\n") || "(none)",
      ``,
      `DOM TEXT:`,
      pageText || "(none)",
    ].join("\n");

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

    // Normalize
    if (!Array.isArray(parsed.leaks)) parsed.leaks = [];
    parsed.leaks = parsed.leaks.slice(0, 6).map((l: any, i: number) => ({
      id: l.id || `ai_${i}`,
      severity: ["critical", "warning", "info"].includes(l.severity) ? l.severity : "warning",
      category: l.category || "Messaging",
      title: String(l.title || "").slice(0, 140),
      why: String(l.why || "").slice(0, 500),
      fix: String(l.fix || "").slice(0, 500),
      selectors: [],
    }));
    if (parsed.dossier && typeof parsed.dossier === "object") {
      parsed.dossier.evidence = Array.isArray(parsed.dossier.evidence)
        ? parsed.dossier.evidence.slice(0, 6).map((s: any) => String(s).slice(0, 300))
        : [];
      ["suspect", "motive", "verdict", "confession"].forEach((k) => {
        if (typeof parsed.dossier[k] !== "string") parsed.dossier[k] = "";
        parsed.dossier[k] = parsed.dossier[k].slice(0, 1200);
      });
    }
    if (parsed.leakValueUSD && typeof parsed.leakValueUSD === "object") {
      parsed.leakValueUSD.low = Math.max(0, Math.round(Number(parsed.leakValueUSD.low) || 0));
      parsed.leakValueUSD.high = Math.max(parsed.leakValueUSD.low, Math.round(Number(parsed.leakValueUSD.high) || 0));
    }
    parsed.priorityFix = typeof parsed.priorityFix === "string" ? parsed.priorityFix.slice(0, 400) : "";
    parsed.summary = typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "";

    return json(parsed);
  } catch (e) {
    console.error("extension-leak-scan-ai error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
