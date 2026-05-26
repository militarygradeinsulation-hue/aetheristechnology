// Scam / legitimacy forensic check for a website + business.
// Pulls live data: Firecrawl scrape, RDAP domain age, DNS hints, redirect chain,
// then asks Lovable AI to produce forensic clues in the same shape as the
// AI Writing Detector so the UI can render them identically.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Clue = {
  pattern: string;
  highlight: string;
  fact: string;
  source: string;
  confidence: number; // 0..1
  direction?: "risk" | "trust"; // risk = raises scam score, trust = lowers it
  evidence?: string;
};

const SYSTEM = `You are the **Aetheris Scam Forensics Operator**. You investigate whether a website + business is a SCAM, FRAUD, SHELL, LOW-TRUST, or LEGIT operation.

You are given live forensic evidence: page content, domain registration data (RDAP), DNS, redirects, SSL hints, and metadata.

Return ONLY valid JSON in this exact shape:
{
  "score": 0,                    // 0 = clearly legit, 100 = clearly a scam
  "verdict": "LEGIT" | "LIKELY_LEGIT" | "MIXED" | "LIKELY_SCAM" | "SCAM",
  "summary": "One blunt sentence — operator voice, no fluff, no emojis, no em-dashes.",
  "bottom_line": "2-3 sentences. What this business actually is, and what the buyer should do.",
  "trust_signals": ["bullet of something that INCREASES trust", "..."],
  "red_flags": ["bullet of something that DECREASES trust", "..."],
  "clues": [
    {
      "pattern": "Short forensic label (e.g. 'Domain registered 11 days ago')",
      "highlight": "Exact phrase or value from the evidence to highlight",
      "fact": "Plain-English explanation of why this matters",
      "source": "Where this came from (RDAP, page copy, DNS, redirect chain, SSL, metadata)",
      "direction": "risk" | "trust",
      "confidence": 0.0
    }
  ]
}

CRITICAL: Every clue MUST include a "direction" field.
- "risk" = this clue increases scam likelihood (raises score)
- "trust" = this clue decreases scam likelihood (lowers score)
Do NOT mark legitimate findings (old domain, real address, HTTPS valid, recognizable infra) as "risk". Mark them as "trust".

Scoring rubric (additive — clues drive the score, be generous with findings):
- Domain age < 90 days on a "money-making" site → strong scam signal
- Privacy-shielded WHOIS + no business address + crypto/giveaway/AI-investment copy → strong
- Mismatch between domain and brand name shown on page → medium
- No HTTPS, broken SSL, suspicious redirect chain → medium-strong
- "Get rich", "guaranteed returns", "limited spots", urgency timers, fake testimonials → strong
- Stock photo team + no LinkedIn presence cited + no real address → medium
- Typos, broken links, lorem ipsum left on a "live" sales page → medium
- Trademarked brand impersonation, lookalike domain (paypa1, amaz0n) → very strong
- No contact info, no terms, no privacy policy → medium
- Country code mismatch (claims US, registered in obscure jurisdiction) → medium

Trust signals (lower the score):
- Domain age > 3 years
- Real founder names that match LinkedIn / press
- Physical address + phone + working email
- Clear pricing, terms, privacy, refund policy
- HTTPS + valid cert + no weird redirects
- Recognizable infrastructure (Stripe, Shopify, HubSpot)

Voice rules:
- Blunt. Forensic. Operator. No emojis. No em-dashes. No "I hope this helps."
- Never invent data. Only cite what's in the evidence.
- If evidence is thin, say so and lower confidence — don't fabricate.

Output JSON ONLY. No markdown fences. No commentary.`;

async function rdapLookup(domain: string): Promise<any | null> {
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: "application/rdap+json" },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function extractDomain(input: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function summarizeRdap(rdap: any): string {
  if (!rdap) return "No RDAP record returned (domain may be unregistered, private, or on a ccTLD without RDAP).";
  const lines: string[] = [];
  const events = Array.isArray(rdap.events) ? rdap.events : [];
  for (const e of events) {
    lines.push(`Event: ${e.eventAction} → ${e.eventDate}`);
  }
  const status = Array.isArray(rdap.status) ? rdap.status.join(", ") : "";
  if (status) lines.push(`Status: ${status}`);
  const entities = Array.isArray(rdap.entities) ? rdap.entities : [];
  for (const ent of entities.slice(0, 6)) {
    const roles = Array.isArray(ent.roles) ? ent.roles.join("/") : "";
    const vcard = Array.isArray(ent.vcardArray) ? ent.vcardArray[1] : [];
    const fn = Array.isArray(vcard) ? vcard.find((x: any) => x[0] === "fn") : null;
    lines.push(`Entity [${roles}]: ${fn ? fn[3] : (ent.handle || "n/a")}`);
  }
  const ns = Array.isArray(rdap.nameservers) ? rdap.nameservers.map((n: any) => n.ldhName).join(", ") : "";
  if (ns) lines.push(`Nameservers: ${ns}`);
  return lines.join("\n") || JSON.stringify(rdap).slice(0, 1500);
}

async function followRedirects(url: string): Promise<{ chain: string[]; finalUrl: string; finalStatus: number; httpsOk: boolean }> {
  const chain: string[] = [];
  let current = url;
  let finalStatus = 0;
  let httpsOk = true;
  try {
    for (let i = 0; i < 6; i++) {
      chain.push(current);
      const res = await fetch(current, { method: "HEAD", redirect: "manual" });
      finalStatus = res.status;
      if (current.startsWith("http://")) httpsOk = false;
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
  } catch (e) {
    // ignore — still return what we got
  }
  return { chain, finalUrl: current, finalStatus, httpsOk };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    const domain = extractDomain(target);

    // Parallel forensic pulls
    const [rdap, redirects, scrape] = await Promise.all([
      rdapLookup(domain),
      followRedirects(target),
      (async () => {
        if (!FIRECRAWL_API_KEY) return null;
        try {
          const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: target, formats: ["markdown", "links"], onlyMainContent: false, waitFor: 1500 }),
          });
          const j = await r.json();
          return j?.data || j;
        } catch {
          return null;
        }
      })(),
    ]);

    const markdown: string = scrape?.markdown || "";
    const metadata: any = scrape?.metadata || {};
    const links: string[] = Array.isArray(scrape?.links) ? scrape.links : [];

    // Build evidence dossier for the AI
    const evidence: string[] = [];
    evidence.push(`=== TARGET ===`);
    evidence.push(`URL: ${target}`);
    evidence.push(`Domain: ${domain}`);

    evidence.push(`\n=== REDIRECT / SSL CHAIN ===`);
    evidence.push(`Final URL: ${redirects.finalUrl}`);
    evidence.push(`Final status: ${redirects.finalStatus}`);
    evidence.push(`HTTPS clean: ${redirects.httpsOk}`);
    evidence.push(`Hops: ${redirects.chain.join(" -> ") || "(none)"}`);

    evidence.push(`\n=== RDAP / WHOIS ===`);
    evidence.push(summarizeRdap(rdap));

    evidence.push(`\n=== PAGE METADATA ===`);
    evidence.push(`Title: ${metadata.title || "(none)"}`);
    evidence.push(`Description: ${metadata.description || "(none)"}`);
    evidence.push(`Language: ${metadata.language || "(none)"}`);
    evidence.push(`Status code: ${metadata.statusCode || "(none)"}`);

    evidence.push(`\n=== OUTBOUND LINKS (first 25) ===`);
    evidence.push(links.slice(0, 25).join("\n") || "(none captured)");

    evidence.push(`\n=== PAGE CONTENT (markdown, first 9000 chars) ===`);
    evidence.push(markdown ? markdown.slice(0, 9000) : "(no content scraped — site may block bots, be down, or return nothing)");

    const dossier = evidence.join("\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Investigate this target. Return JSON only.\n\n${dossier}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again in a minute." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text().catch(() => "");
      throw new Error(`AI gateway error ${aiRes.status}: ${t.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { error: "AI returned invalid JSON" };
    }

    // Re-score from clues for transparency (same approach as AI Writing Detector)
    const clues: Clue[] = Array.isArray(parsed.clues) ? parsed.clues : [];
    let computed = 0;
    for (const c of clues) {
      const conf = Math.max(0, Math.min(1, Number(c?.confidence) || 0.5));
      computed += 6 + (14 - 6) * conf;
    }
    computed = Math.round(Math.min(100, computed));
    const score = clues.length ? computed : Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const verdict =
      score >= 80 ? "SCAM" :
      score >= 60 ? "LIKELY_SCAM" :
      score >= 40 ? "MIXED" :
      score >= 20 ? "LIKELY_LEGIT" : "LEGIT";

    const result = {
      target,
      domain,
      score,
      verdict,
      summary: parsed.summary || "",
      bottom_line: parsed.bottom_line || "",
      trust_signals: Array.isArray(parsed.trust_signals) ? parsed.trust_signals : [],
      red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags : [],
      clues,
      evidence_excerpt: dossier.slice(0, 6000),
      raw: {
        rdap_present: !!rdap,
        firecrawl_present: !!scrape,
        https_ok: redirects.httpsOk,
        final_status: redirects.finalStatus,
      },
    };

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
